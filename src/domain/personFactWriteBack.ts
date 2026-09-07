import type { Workspace } from './workspace';
import type { RoutePack } from './route';
import type { PilotFactKey, PersonFactBinding } from './personFactBindings';
import { validatePersonFactBinding } from './personFactBindings';
import {
  confirmDateOfBirth,
  confirmEmail,
  confirmResidentialAddress,
  isValidIsoTimestamp,
  validatePersonFactProfileOwnership,
  type PersonFactProfile,
  type ResidentialAddress
} from './personFacts';
import type { ReusedFactStates } from './applicationFactMaterialization';
import { getAnswerValue, isMeaningfulAnswerValue } from './applicationFactMaterialization';
import {
  savePersonFactProfileForWorkspacePerson,
  type SavePersonFactProfileRuntimeResult
} from './personFactProfileRuntime';
import type { SavedPersonFactProfile } from './personFactsPersistence';

function isRecord(val: unknown): val is Record<string, unknown> {
  return Boolean(val) && typeof val === 'object' && !Array.isArray(val);
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as unknown as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, cloneValue(v)])
  ) as unknown as T;
}

export interface PersonFactWriteBackCandidate {
  readonly applicationPath: string;
  readonly factKey: PilotFactKey;
  readonly reusePolicy: 'safe_reuse' | 'confirm_reuse';
  readonly value: unknown;
  readonly sourceApplicationId: string;
  readonly confirmedAt?: string;
}

export type WriteBackIneligibilityReason =
  | 'binding_missing'
  | 'binding_mismatch'
  | 'reused_state_missing'
  | 'pending_confirmation'
  | 'answer_missing'
  | 'incompatible_value';

export interface ResolveWriteBackCandidatesInput {
  readonly applicationId: string;
  readonly answers: Record<string, unknown>;
  readonly reusedFactStates?: ReusedFactStates;
  readonly routeOrBindings?: RoutePack | readonly PersonFactBinding[];
}

export interface ResolveWriteBackCandidatesResult {
  readonly eligibleCandidates: readonly PersonFactWriteBackCandidate[];
  readonly skippedOrIneligible: readonly {
    readonly applicationPath: string;
    readonly reason: WriteBackIneligibilityReason;
  }[];
}

function extractBindings(
  routeOrBindings?: RoutePack | readonly PersonFactBinding[]
): readonly PersonFactBinding[] {
  if (!routeOrBindings) return [];
  if (Array.isArray(routeOrBindings)) return routeOrBindings;
  if (
    'personFactBindings' in routeOrBindings &&
    Array.isArray(routeOrBindings.personFactBindings)
  ) {
    return routeOrBindings.personFactBindings;
  }
  return [];
}

export function resolveWriteBackCandidates(
  input: ResolveWriteBackCandidatesInput
): ResolveWriteBackCandidatesResult {
  const trimmedAppId = typeof input.applicationId === 'string' ? input.applicationId.trim() : '';
  const bindings = extractBindings(input.routeOrBindings);

  if (!trimmedAppId) {
    return {
      eligibleCandidates: [],
      skippedOrIneligible: bindings.map((b) => ({
        applicationPath: b.applicationPath,
        reason: 'binding_mismatch'
      }))
    };
  }

  const eligibleCandidates: PersonFactWriteBackCandidate[] = [];
  const skippedOrIneligible: {
    applicationPath: string;
    reason: WriteBackIneligibilityReason;
  }[] = [];

  for (const binding of bindings) {
    const bindingValidation = validatePersonFactBinding(binding);
    if (!bindingValidation.valid) {
      skippedOrIneligible.push({
        applicationPath: binding.applicationPath,
        reason: 'binding_mismatch'
      });
      continue;
    }

    const reusedState = input.reusedFactStates?.[binding.applicationPath];
    if (!reusedState) {
      skippedOrIneligible.push({
        applicationPath: binding.applicationPath,
        reason: 'reused_state_missing'
      });
      continue;
    }

    if (
      reusedState.applicationPath !== binding.applicationPath ||
      reusedState.factKey !== binding.factKey ||
      reusedState.reusePolicy !== binding.reusePolicy
    ) {
      skippedOrIneligible.push({
        applicationPath: binding.applicationPath,
        reason: 'binding_mismatch'
      });
      continue;
    }

    let candidateConfirmedAt: string | undefined = undefined;

    if (reusedState.reusePolicy === 'confirm_reuse') {
      if (reusedState.status !== 'confirmed') {
        skippedOrIneligible.push({
          applicationPath: binding.applicationPath,
          reason: 'pending_confirmation'
        });
        continue;
      }
      if (!reusedState.confirmedAt || !isValidIsoTimestamp(reusedState.confirmedAt)) {
        skippedOrIneligible.push({
          applicationPath: binding.applicationPath,
          reason: 'incompatible_value'
        });
        continue;
      }
      candidateConfirmedAt = reusedState.confirmedAt;
    }

    const rawAnswer = getAnswerValue(input.answers, binding.applicationPath);
    if (!isMeaningfulAnswerValue(rawAnswer)) {
      skippedOrIneligible.push({
        applicationPath: binding.applicationPath,
        reason: 'answer_missing'
      });
      continue;
    }

    let adaptedValue: unknown = undefined;

    if (binding.factKey === 'dateOfBirth') {
      if (typeof rawAnswer === 'string' && rawAnswer.trim() !== '') {
        adaptedValue = rawAnswer.trim();
      } else if (isRecord(rawAnswer) && typeof rawAnswer.date === 'string' && rawAnswer.date.trim() !== '') {
        adaptedValue = rawAnswer.date.trim();
      } else {
        skippedOrIneligible.push({
          applicationPath: binding.applicationPath,
          reason: 'incompatible_value'
        });
        continue;
      }
    } else if (binding.factKey === 'email') {
      if (typeof rawAnswer === 'string' && rawAnswer.trim() !== '') {
        adaptedValue = rawAnswer.trim();
      } else if (isRecord(rawAnswer) && typeof rawAnswer.email === 'string' && rawAnswer.email.trim() !== '') {
        adaptedValue = rawAnswer.email.trim();
      } else {
        skippedOrIneligible.push({
          applicationPath: binding.applicationPath,
          reason: 'incompatible_value'
        });
        continue;
      }
    } else if (binding.factKey === 'residentialAddress') {
      if (isRecord(rawAnswer) && !Array.isArray(rawAnswer)) {
        adaptedValue = cloneValue(rawAnswer as unknown as ResidentialAddress);
      } else {
        skippedOrIneligible.push({
          applicationPath: binding.applicationPath,
          reason: 'incompatible_value'
        });
        continue;
      }
    }

    eligibleCandidates.push({
      applicationPath: binding.applicationPath,
      factKey: binding.factKey,
      reusePolicy: binding.reusePolicy,
      value: adaptedValue,
      sourceApplicationId: trimmedAppId,
      ...(candidateConfirmedAt ? { confirmedAt: candidateConfirmedAt } : {})
    });
  }

  return {
    eligibleCandidates,
    skippedOrIneligible
  };
}

export interface WriteBackPersonFactInput {
  readonly workspace: Workspace;
  readonly profile: PersonFactProfile;
  readonly candidate: PersonFactWriteBackCandidate;
}

export interface WriteBackPersonFactOptions {
  readonly persister?: (saved: SavedPersonFactProfile) => Promise<void>;
  readonly updatedAt?: string;
  readonly confirmedAt?: string;
}

export async function writeBackPersonFactCandidate(
  input: WriteBackPersonFactInput,
  options: WriteBackPersonFactOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const ownership = validatePersonFactProfileOwnership(input.profile, input.workspace);
  if (!ownership.valid) {
    return {
      success: false,
      error: ownership.error ?? 'Profile ownership validation failed.'
    };
  }

  const { candidate } = input;
  let finalConfirmedAt: string;

  if (candidate.reusePolicy === 'safe_reuse') {
    const explicitTimestamp = options.confirmedAt ?? candidate.confirmedAt;
    if (!explicitTimestamp || !isValidIsoTimestamp(explicitTimestamp)) {
      return {
        success: false,
        error: 'Explicit confirmedAt timestamp is required for safe_reuse write-back.'
      };
    }
    finalConfirmedAt = explicitTimestamp;
  } else {
    if (!candidate.confirmedAt || !isValidIsoTimestamp(candidate.confirmedAt)) {
      return {
        success: false,
        error: 'Valid confirmedAt timestamp from Application state is required for confirm_reuse write-back.'
      };
    }
    finalConfirmedAt = candidate.confirmedAt;
  }

  let confirmResult:
    | { readonly success: true; readonly profile: PersonFactProfile }
    | { readonly success: false; readonly error: string };

  if (candidate.factKey === 'dateOfBirth') {
    if (typeof candidate.value !== 'string') {
      return { success: false, error: 'Candidate value for dateOfBirth must be a string.' };
    }
    confirmResult = confirmDateOfBirth(input.profile, {
      date: candidate.value,
      lastConfirmedAt: finalConfirmedAt,
      sourceApplicationId: candidate.sourceApplicationId
    });
  } else if (candidate.factKey === 'email') {
    if (typeof candidate.value !== 'string') {
      return { success: false, error: 'Candidate value for email must be a string.' };
    }
    confirmResult = confirmEmail(input.profile, {
      email: candidate.value,
      lastConfirmedAt: finalConfirmedAt,
      sourceApplicationId: candidate.sourceApplicationId
    });
  } else if (candidate.factKey === 'residentialAddress') {
    if (!isRecord(candidate.value) || Array.isArray(candidate.value)) {
      return { success: false, error: 'Candidate value for residentialAddress must be a structured address object.' };
    }
    confirmResult = confirmResidentialAddress(input.profile, {
      address: candidate.value as unknown as ResidentialAddress,
      lastConfirmedAt: finalConfirmedAt,
      sourceApplicationId: candidate.sourceApplicationId
    });
  } else {
    return {
      success: false,
      error: `Unsupported factKey "${String((candidate as { factKey: unknown }).factKey)}".`
    };
  }

  if (!confirmResult.success) {
    return {
      success: false,
      error: confirmResult.error
    };
  }

  return savePersonFactProfileForWorkspacePerson(
    input.workspace,
    confirmResult.profile,
    options
  );
}

export interface WriteBackApplicationFactInput {
  readonly workspace: Workspace;
  readonly profile: PersonFactProfile;
  readonly applicationId: string;
  readonly answers: Record<string, unknown>;
  readonly reusedFactStates?: ReusedFactStates;
  readonly routeOrBindings?: RoutePack | readonly PersonFactBinding[];
  readonly targetApplicationPath: string;
  readonly safeReuseConfirmedAt?: string;
}

export interface WriteBackApplicationFactOptions {
  readonly persister?: (saved: SavedPersonFactProfile) => Promise<void>;
  readonly updatedAt?: string;
}

export async function writeBackApplicationFactForWorkspacePerson(
  input: WriteBackApplicationFactInput,
  options: WriteBackApplicationFactOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const trimmedAppId = typeof input.applicationId === 'string' ? input.applicationId.trim() : '';
  if (!trimmedAppId) {
    return {
      success: false,
      error: 'applicationId must be a valid non-empty string.'
    };
  }

  const targetPath = typeof input.targetApplicationPath === 'string' ? input.targetApplicationPath.trim() : '';
  if (!targetPath) {
    return {
      success: false,
      error: 'targetApplicationPath must be a valid non-empty string.'
    };
  }

  const resolution = resolveWriteBackCandidates({
    applicationId: trimmedAppId,
    answers: input.answers,
    reusedFactStates: input.reusedFactStates,
    routeOrBindings: input.routeOrBindings
  });

  const skipped = resolution.skippedOrIneligible.find((s) => s.applicationPath === targetPath);
  if (skipped) {
    return {
      success: false,
      error: `Fact at "${targetPath}" is not eligible for write-back (${skipped.reason}).`
    };
  }

  const candidate = resolution.eligibleCandidates.find((c) => c.applicationPath === targetPath);
  if (!candidate) {
    return {
      success: false,
      error: `No eligible write-back candidate found for path "${targetPath}".`
    };
  }

  return writeBackPersonFactCandidate(
    {
      workspace: input.workspace,
      profile: input.profile,
      candidate
    },
    {
      persister: options.persister,
      updatedAt: options.updatedAt,
      confirmedAt: input.safeReuseConfirmedAt
    }
  );
}
