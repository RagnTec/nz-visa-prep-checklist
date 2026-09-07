import type { PilotFactKey } from './personFactBindings';
import type { MaterializationCandidate } from './personFactMaterialization';
import { isValidIsoTimestamp } from './personFacts';

export type ConfirmReuseStatus = 'pending_confirmation' | 'confirmed';

export interface BaseReusedFactState<TKey extends PilotFactKey = PilotFactKey> {
  readonly applicationPath: string;
  readonly factKey: TKey;
  readonly lastConfirmedAt: string;
  readonly sourceApplicationId?: string;
}

export interface SafeReuseFactState extends BaseReusedFactState {
  readonly reusePolicy: 'safe_reuse';
}

export interface ConfirmReuseFactState extends BaseReusedFactState {
  readonly reusePolicy: 'confirm_reuse';
  readonly status: ConfirmReuseStatus;
  readonly confirmedAt?: string;
}

export type ReusedFactState = SafeReuseFactState | ConfirmReuseFactState;

export type ReusedFactStates = Record<string, ReusedFactState>;

export function isMaterializedFactConfirmed(state: ReusedFactState | undefined): boolean {
  if (!state) return false;
  if (state.reusePolicy === 'safe_reuse') return true;
  return state.status === 'confirmed';
}

export function isMeaningfulAnswerValue(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (typeof val === 'number' || typeof val === 'boolean') return true;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val).length > 0;
  return true;
}

export function getAnswerValue(answers: Record<string, unknown>, path: string): unknown {
  if (!answers || typeof answers !== 'object') return undefined;
  if (path in answers) {
    return answers[path];
  }
  const parts = path.split('.');
  let current: unknown = answers;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function cloneAnswerValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneAnswerValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, cloneAnswerValue(v)])
  );
}

export function setAnswerValue(
  answers: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const clonedValue = cloneAnswerValue(value);
  const parts = path.split('.');
  if (parts.length === 1) {
    return {
      ...answers,
      [path]: clonedValue
    };
  }

  const root = { ...answers };
  let current: Record<string, unknown> = root;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const existing = current[part];
    const next =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    current[part] = next;
    current = next;
  }

  current[parts[parts.length - 1]] = clonedValue;
  return root;
}

export interface MaterializeFactsInput {
  readonly answers: Record<string, unknown>;
  readonly candidates: readonly MaterializationCandidate[];
  readonly existingReusedFactStates?: ReusedFactStates;
}

export interface MaterializeFactsResult {
  readonly answers: Record<string, unknown>;
  readonly reusedFactStates: ReusedFactStates;
  readonly materialized: readonly MaterializationCandidate[];
  readonly skipped: readonly {
    readonly candidate: MaterializationCandidate;
    readonly reason: 'existing_answer_conflict';
  }[];
}

export function materializeCandidatesIntoApplicationAnswers(
  input: MaterializeFactsInput
): MaterializeFactsResult {
  let currentAnswers = { ...input.answers };
  const currentStates: Record<string, ReusedFactState> = {
    ...(input.existingReusedFactStates ?? {})
  };

  const materialized: MaterializationCandidate[] = [];
  const skipped: { candidate: MaterializationCandidate; reason: 'existing_answer_conflict' }[] = [];

  for (const candidate of input.candidates) {
    if (!candidate || typeof candidate !== 'object') continue;

    const existingValue = getAnswerValue(currentAnswers, candidate.applicationPath);
    if (isMeaningfulAnswerValue(existingValue)) {
      skipped.push({
        candidate,
        reason: 'existing_answer_conflict'
      });
      continue;
    }

    currentAnswers = setAnswerValue(currentAnswers, candidate.applicationPath, candidate.value);

    if (candidate.reusePolicy === 'safe_reuse') {
      currentStates[candidate.applicationPath] = {
        applicationPath: candidate.applicationPath,
        factKey: candidate.factKey,
        reusePolicy: 'safe_reuse',
        lastConfirmedAt: candidate.lastConfirmedAt,
        ...(candidate.sourceApplicationId ? { sourceApplicationId: candidate.sourceApplicationId } : {})
      };
    } else {
      currentStates[candidate.applicationPath] = {
        applicationPath: candidate.applicationPath,
        factKey: candidate.factKey,
        reusePolicy: 'confirm_reuse',
        status: 'pending_confirmation',
        lastConfirmedAt: candidate.lastConfirmedAt,
        ...(candidate.sourceApplicationId ? { sourceApplicationId: candidate.sourceApplicationId } : {})
      };
    }

    materialized.push(candidate);
  }

  return {
    answers: currentAnswers,
    reusedFactStates: currentStates,
    materialized,
    skipped
  };
}

export interface ConfirmMaterializedFactInput {
  readonly reusedFactStates: ReusedFactStates;
  readonly applicationPath: string;
  readonly confirmedAt?: string;
}

export type ConfirmMaterializedFactResult =
  | {
      readonly success: true;
      readonly reusedFactStates: ReusedFactStates;
      readonly updatedState: ConfirmReuseFactState;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export function confirmMaterializedFactInApplication(
  input: ConfirmMaterializedFactInput
): ConfirmMaterializedFactResult {
  const state = input.reusedFactStates?.[input.applicationPath];
  if (!state) {
    return {
      success: false,
      error: `No materialized fact state found for applicationPath "${input.applicationPath}".`
    };
  }

  if (state.reusePolicy !== 'confirm_reuse') {
    return {
      success: false,
      error: `Cannot confirm fact with reusePolicy "${state.reusePolicy}". Only "confirm_reuse" facts require confirmation.`
    };
  }

  const confirmedAt =
    typeof input.confirmedAt === 'string' && input.confirmedAt.trim()
      ? input.confirmedAt.trim()
      : new Date().toISOString();

  if (!isValidIsoTimestamp(confirmedAt)) {
    return {
      success: false,
      error: 'confirmedAt must be a valid timestamp string.'
    };
  }

  const updatedState: ConfirmReuseFactState = {
    ...state,
    status: 'confirmed',
    confirmedAt
  };

  return {
    success: true,
    reusedFactStates: {
      ...input.reusedFactStates,
      [input.applicationPath]: updatedState
    },
    updatedState
  };
}

const VALID_FACT_KEYS = new Set<string>(['dateOfBirth', 'email', 'residentialAddress']);

export function validateReusedFactStates(
  raw: unknown
): { readonly valid: boolean; readonly error?: string; readonly normalized?: ReusedFactStates } {
  if (raw === undefined || raw === null) {
    return { valid: true, normalized: undefined };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'reusedFactStates must be an object.' };
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  const normalized: Record<string, ReusedFactState> = {};

  for (const [key, val] of entries) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) {
      return { valid: false, error: `reusedFactStates["${key}"] must be an object.` };
    }
    const item = val as Record<string, unknown>;

    if (typeof item.applicationPath !== 'string' || !item.applicationPath.trim()) {
      return { valid: false, error: `reusedFactStates["${key}"].applicationPath must be a non-empty string.` };
    }
    if (item.applicationPath !== key) {
      return { valid: false, error: `Key "${key}" does not match applicationPath "${item.applicationPath}".` };
    }

    if (typeof item.factKey !== 'string' || !VALID_FACT_KEYS.has(item.factKey)) {
      return { valid: false, error: `Invalid factKey "${String(item.factKey)}" at "${key}".` };
    }

    if (typeof item.lastConfirmedAt !== 'string' || !isValidIsoTimestamp(item.lastConfirmedAt)) {
      return { valid: false, error: `Invalid lastConfirmedAt at "${key}".` };
    }

    if ('sourceApplicationId' in item && item.sourceApplicationId !== undefined) {
      if (typeof item.sourceApplicationId !== 'string' || !item.sourceApplicationId.trim()) {
        return { valid: false, error: `Invalid sourceApplicationId at "${key}".` };
      }
    }

    if (item.reusePolicy === 'safe_reuse') {
      normalized[key] = {
        applicationPath: item.applicationPath,
        factKey: item.factKey as PilotFactKey,
        reusePolicy: 'safe_reuse',
        lastConfirmedAt: item.lastConfirmedAt,
        ...(item.sourceApplicationId ? { sourceApplicationId: (item.sourceApplicationId as string).trim() } : {})
      };
    } else if (item.reusePolicy === 'confirm_reuse') {
      if (item.status !== 'pending_confirmation' && item.status !== 'confirmed') {
        return { valid: false, error: `Invalid confirm_reuse status "${String(item.status)}" at "${key}".` };
      }

      if ('confirmedAt' in item && item.confirmedAt !== undefined) {
        if (typeof item.confirmedAt !== 'string' || !isValidIsoTimestamp(item.confirmedAt)) {
          return { valid: false, error: `Invalid confirmedAt at "${key}".` };
        }
      }

      normalized[key] = {
        applicationPath: item.applicationPath,
        factKey: item.factKey as PilotFactKey,
        reusePolicy: 'confirm_reuse',
        status: item.status,
        lastConfirmedAt: item.lastConfirmedAt,
        ...(item.sourceApplicationId ? { sourceApplicationId: (item.sourceApplicationId as string).trim() } : {}),
        ...(item.confirmedAt ? { confirmedAt: (item.confirmedAt as string).trim() } : {})
      };
    } else {
      return { valid: false, error: `Invalid reusePolicy "${String(item.reusePolicy)}" at "${key}".` };
    }
  }

  return { valid: true, normalized };
}
