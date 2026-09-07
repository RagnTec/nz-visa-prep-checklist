import type { Workspace } from './workspace';
import {
  clearFact,
  confirmDateOfBirth,
  confirmEmail,
  confirmResidentialAddress,
  createEmptyPersonFactProfile,
  validatePersonFactProfileOwnership,
  type ConfirmDateOfBirthInput,
  type ConfirmEmailInput,
  type ConfirmResidentialAddressInput,
  type PersonFactProfile,
  type PersonFacts
} from './personFacts';
import {
  createSavedPersonFactProfile,
  type SavedPersonFactProfile,
  type SavedPersonFactProfileReadResult
} from './personFactsPersistence';
import {
  loadPersonFactProfile as defaultLoadPersonFactProfile,
  savePersonFactProfile as defaultSavePersonFactProfile
} from '../storage/db';

export type LoadPersonFactProfileRuntimeResult =
  | {
      readonly success: true;
      readonly kind: 'empty';
      readonly personId: string;
      readonly profile: PersonFactProfile;
    }
  | {
      readonly success: true;
      readonly kind: 'current';
      readonly personId: string;
      readonly profile: PersonFactProfile;
      readonly savedProfile: SavedPersonFactProfile;
    }
  | {
      readonly success: false;
      readonly kind: 'person_not_found';
      readonly personId: string;
      readonly error: string;
    }
  | {
      readonly success: false;
      readonly kind: 'future';
      readonly personId: string;
      readonly schemaVersion: number;
      readonly rawData: unknown;
    }
  | {
      readonly success: false;
      readonly kind: 'invalid';
      readonly personId: string;
      readonly errors: readonly string[];
      readonly rawData?: unknown;
    }
  | {
      readonly success: false;
      readonly kind: 'storage_error';
      readonly personId: string;
      readonly error: string;
    };

export interface LoadPersonFactProfileOptions {
  readonly loader?: (personId: string) => Promise<SavedPersonFactProfileReadResult>;
}

export async function loadPersonFactProfileForWorkspacePerson(
  workspace: Workspace,
  personId: string,
  options: LoadPersonFactProfileOptions = {}
): Promise<LoadPersonFactProfileRuntimeResult> {
  const trimmedId = typeof personId === 'string' ? personId.trim() : '';
  if (!trimmedId) {
    return {
      success: false,
      kind: 'person_not_found',
      personId: '',
      error: 'personId must be a valid non-empty string.'
    };
  }

  if (!workspace || !Array.isArray(workspace.people)) {
    return {
      success: false,
      kind: 'person_not_found',
      personId: trimmedId,
      error: 'workspace must contain a valid people collection.'
    };
  }

  const personExists = workspace.people.some((p) => p.personId === trimmedId);
  if (!personExists) {
    return {
      success: false,
      kind: 'person_not_found',
      personId: trimmedId,
      error: `Person with ID "${trimmedId}" does not exist in workspace.`
    };
  }

  const loader = options.loader ?? defaultLoadPersonFactProfile;
  let readResult: SavedPersonFactProfileReadResult;
  try {
    readResult = await loader(trimmedId);
  } catch (err) {
    return {
      success: false,
      kind: 'storage_error',
      personId: trimmedId,
      error: err instanceof Error ? err.message : String(err)
    };
  }

  if (readResult.kind === 'empty') {
    return {
      success: true,
      kind: 'empty',
      personId: trimmedId,
      profile: createEmptyPersonFactProfile(trimmedId)
    };
  }

  if (readResult.kind === 'current') {
    if (
      readResult.profile.personId !== trimmedId ||
      readResult.savedProfile.personId !== trimmedId
    ) {
      return {
        success: false,
        kind: 'invalid',
        personId: trimmedId,
        errors: [
          `Loaded profile identity mismatch: requested "${trimmedId}", got profile "${readResult.profile.personId}" and savedProfile "${readResult.savedProfile.personId}".`
        ]
      };
    }

    const ownership = validatePersonFactProfileOwnership(readResult.profile, workspace);
    if (!ownership.valid) {
      return {
        success: false,
        kind: 'invalid',
        personId: trimmedId,
        errors: [ownership.error ?? 'Profile ownership validation failed.']
      };
    }
    return {
      success: true,
      kind: 'current',
      personId: trimmedId,
      profile: readResult.profile,
      savedProfile: readResult.savedProfile
    };
  }

  if (readResult.kind === 'future') {
    return {
      success: false,
      kind: 'future',
      personId: trimmedId,
      schemaVersion: readResult.schemaVersion,
      rawData: readResult.rawData
    };
  }

  return {
    success: false,
    kind: 'invalid',
    personId: trimmedId,
    errors: readResult.errors,
    rawData: readResult.rawData
  };
}

export interface SavePersonFactProfileOptions {
  readonly updatedAt?: string;
  readonly persister?: (saved: SavedPersonFactProfile) => Promise<void>;
}

export type SavePersonFactProfileRuntimeResult =
  | {
      readonly success: true;
      readonly profile: PersonFactProfile;
      readonly savedProfile: SavedPersonFactProfile;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export async function savePersonFactProfileForWorkspacePerson(
  workspace: Workspace,
  profile: PersonFactProfile,
  options: SavePersonFactProfileOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const ownership = validatePersonFactProfileOwnership(profile, workspace);
  if (!ownership.valid) {
    return {
      success: false,
      error: ownership.error ?? 'Profile ownership validation failed.'
    };
  }

  let savedProfile: SavedPersonFactProfile;
  try {
    savedProfile = createSavedPersonFactProfile(profile, {
      updatedAt: options.updatedAt
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }

  const persister = options.persister ?? defaultSavePersonFactProfile;
  try {
    await persister(savedProfile);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }

  return {
    success: true,
    profile,
    savedProfile
  };
}

export async function updateAndSaveDateOfBirth(
  workspace: Workspace,
  profile: PersonFactProfile,
  input: ConfirmDateOfBirthInput,
  options: SavePersonFactProfileOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const result = confirmDateOfBirth(profile, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return savePersonFactProfileForWorkspacePerson(workspace, result.profile, options);
}

export async function updateAndSaveEmail(
  workspace: Workspace,
  profile: PersonFactProfile,
  input: ConfirmEmailInput,
  options: SavePersonFactProfileOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const result = confirmEmail(profile, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return savePersonFactProfileForWorkspacePerson(workspace, result.profile, options);
}

export async function updateAndSaveResidentialAddress(
  workspace: Workspace,
  profile: PersonFactProfile,
  input: ConfirmResidentialAddressInput,
  options: SavePersonFactProfileOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const result = confirmResidentialAddress(profile, input);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return savePersonFactProfileForWorkspacePerson(workspace, result.profile, options);
}

export async function clearAndSaveFact(
  workspace: Workspace,
  profile: PersonFactProfile,
  factKey: keyof PersonFacts,
  options: SavePersonFactProfileOptions = {}
): Promise<SavePersonFactProfileRuntimeResult> {
  const updatedProfile = clearFact(profile, factKey);
  return savePersonFactProfileForWorkspacePerson(workspace, updatedProfile, options);
}
