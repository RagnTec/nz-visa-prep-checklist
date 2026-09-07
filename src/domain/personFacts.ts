import type { Workspace } from './workspace';

export type FactReusePolicy = 'safe_reuse' | 'confirm_reuse' | 'application_only';

export const FACT_DEFAULT_REUSE_POLICIES = {
  dateOfBirth: 'safe_reuse',
  email: 'confirm_reuse',
  residentialAddress: 'confirm_reuse'
} as const satisfies Record<'dateOfBirth' | 'email' | 'residentialAddress', FactReusePolicy>;

export interface FactProvenance {
  /** ISO 8601 timestamp indicating when a human explicitly confirmed this fact */
  readonly lastConfirmedAt: string;
  /** Optional ID of the visa application in which the fact was confirmed */
  readonly sourceApplicationId?: string;
}

export interface DateOfBirthFact extends FactProvenance {
  /** ISO 8601 date string (YYYY-MM-DD) without timezone */
  readonly date: string;
}

export interface EmailFact extends FactProvenance {
  readonly email: string;
}

export interface ResidentialAddress {
  readonly addressLines: readonly string[];
  readonly locality?: string;
  readonly region?: string;
  readonly postalCode?: string;
  readonly countryCodeOrName?: string;
}

export interface ResidentialAddressFact extends FactProvenance {
  readonly address: ResidentialAddress;
}

export interface PersonFacts {
  readonly dateOfBirth?: DateOfBirthFact;
  readonly email?: EmailFact;
  readonly residentialAddress?: ResidentialAddressFact;
}

export interface PersonFactProfile {
  readonly personId: string;
  readonly facts: PersonFacts;
}

export function isValidDateOnly(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

export function isValidIsoTimestamp(timestampStr: unknown): timestampStr is string {
  if (typeof timestampStr !== 'string') return false;
  const trimmed = timestampStr.trim();
  if (!trimmed) return false;
  return !Number.isNaN(Date.parse(trimmed));
}

export function createEmptyPersonFactProfile(personId: string): PersonFactProfile {
  const trimmedId = typeof personId === 'string' ? personId.trim() : '';
  if (!trimmedId) {
    throw new Error('personId must be a valid non-empty string.');
  }
  return {
    personId: trimmedId,
    facts: {}
  };
}

export function validatePersonFactProfileOwnership(
  profile: PersonFactProfile,
  workspace: Workspace
): { readonly valid: boolean; readonly error?: string } {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, error: 'Profile must be a valid object.' };
  }
  if (!workspace || typeof workspace !== 'object') {
    return { valid: false, error: 'Workspace must be a valid object.' };
  }
  const personExists = workspace.people.some((p) => p.personId === profile.personId);
  if (!personExists) {
    return {
      valid: false,
      error: `Person with ID "${profile.personId}" does not exist in workspace.`
    };
  }
  return { valid: true };
}

export interface ConfirmDateOfBirthInput {
  readonly date: string;
  readonly lastConfirmedAt?: string;
  readonly sourceApplicationId?: string;
}

export function confirmDateOfBirth(
  profile: PersonFactProfile,
  input: ConfirmDateOfBirthInput
): { readonly success: true; readonly profile: PersonFactProfile } | { readonly success: false; readonly error: string } {
  if (!profile || typeof profile !== 'object') {
    return { success: false, error: 'Profile must be a valid object.' };
  }
  const dateStr = typeof input?.date === 'string' ? input.date.trim() : '';
  if (!isValidDateOnly(dateStr)) {
    return { success: false, error: 'date must be a valid real YYYY-MM-DD date.' };
  }

  let confirmedAt: string;
  if (input.lastConfirmedAt !== undefined) {
    if (!isValidIsoTimestamp(input.lastConfirmedAt)) {
      return { success: false, error: 'lastConfirmedAt must be a valid timestamp string.' };
    }
    confirmedAt = input.lastConfirmedAt.trim();
  } else {
    confirmedAt = new Date().toISOString();
  }

  let sourceAppId: string | undefined;
  if (input.sourceApplicationId !== undefined) {
    const trimmedSource =
      typeof input.sourceApplicationId === 'string' ? input.sourceApplicationId.trim() : '';
    if (!trimmedSource) {
      return { success: false, error: 'sourceApplicationId must be a non-empty string if provided.' };
    }
    sourceAppId = trimmedSource;
  }

  const newFact: DateOfBirthFact = {
    date: dateStr,
    lastConfirmedAt: confirmedAt,
    ...(sourceAppId ? { sourceApplicationId: sourceAppId } : {})
  };

  return {
    success: true,
    profile: {
      ...profile,
      facts: {
        ...profile.facts,
        dateOfBirth: newFact
      }
    }
  };
}

export interface ConfirmEmailInput {
  readonly email: string;
  readonly lastConfirmedAt?: string;
  readonly sourceApplicationId?: string;
}

export function confirmEmail(
  profile: PersonFactProfile,
  input: ConfirmEmailInput
): { readonly success: true; readonly profile: PersonFactProfile } | { readonly success: false; readonly error: string } {
  if (!profile || typeof profile !== 'object') {
    return { success: false, error: 'Profile must be a valid object.' };
  }
  const emailStr = typeof input?.email === 'string' ? input.email.trim() : '';
  if (!emailStr || !emailStr.includes('@')) {
    return { success: false, error: 'email must be a valid non-empty string containing "@".' };
  }

  let confirmedAt: string;
  if (input.lastConfirmedAt !== undefined) {
    if (!isValidIsoTimestamp(input.lastConfirmedAt)) {
      return { success: false, error: 'lastConfirmedAt must be a valid timestamp string.' };
    }
    confirmedAt = input.lastConfirmedAt.trim();
  } else {
    confirmedAt = new Date().toISOString();
  }

  let sourceAppId: string | undefined;
  if (input.sourceApplicationId !== undefined) {
    const trimmedSource =
      typeof input.sourceApplicationId === 'string' ? input.sourceApplicationId.trim() : '';
    if (!trimmedSource) {
      return { success: false, error: 'sourceApplicationId must be a non-empty string if provided.' };
    }
    sourceAppId = trimmedSource;
  }

  const newFact: EmailFact = {
    email: emailStr,
    lastConfirmedAt: confirmedAt,
    ...(sourceAppId ? { sourceApplicationId: sourceAppId } : {})
  };

  return {
    success: true,
    profile: {
      ...profile,
      facts: {
        ...profile.facts,
        email: newFact
      }
    }
  };
}

export interface ConfirmResidentialAddressInput {
  readonly address: ResidentialAddress;
  readonly lastConfirmedAt?: string;
  readonly sourceApplicationId?: string;
}

export function confirmResidentialAddress(
  profile: PersonFactProfile,
  input: ConfirmResidentialAddressInput
): { readonly success: true; readonly profile: PersonFactProfile } | { readonly success: false; readonly error: string } {
  if (!profile || typeof profile !== 'object') {
    return { success: false, error: 'Profile must be a valid object.' };
  }
  const addr = input?.address;
  if (!addr || typeof addr !== 'object') {
    return { success: false, error: 'address must be a valid object.' };
  }
  if (!Array.isArray(addr.addressLines)) {
    return { success: false, error: 'address.addressLines must be an array of strings.' };
  }
  if (addr.addressLines.some((line) => typeof line !== 'string')) {
    return { success: false, error: 'address.addressLines must contain only strings.' };
  }

  const cleanedLines = addr.addressLines
    .map((l) => l.trim())
    .filter(Boolean);

  if (addr.locality !== undefined && typeof addr.locality !== 'string') {
    return { success: false, error: 'address.locality must be a string if provided.' };
  }
  const locality = typeof addr.locality === 'string' ? addr.locality.trim() : undefined;

  if (addr.region !== undefined && typeof addr.region !== 'string') {
    return { success: false, error: 'address.region must be a string if provided.' };
  }
  const region = typeof addr.region === 'string' ? addr.region.trim() : undefined;

  if (addr.postalCode !== undefined && typeof addr.postalCode !== 'string') {
    return { success: false, error: 'address.postalCode must be a string if provided.' };
  }
  const postalCode = typeof addr.postalCode === 'string' ? addr.postalCode.trim() : undefined;

  if (addr.countryCodeOrName !== undefined && typeof addr.countryCodeOrName !== 'string') {
    return { success: false, error: 'address.countryCodeOrName must be a string if provided.' };
  }
  const countryCodeOrName =
    typeof addr.countryCodeOrName === 'string' ? addr.countryCodeOrName.trim() : undefined;

  const hasLine = cleanedLines.length > 0;
  const hasLocality = Boolean(locality);
  const hasCountry = Boolean(countryCodeOrName);

  if (!hasLine && !hasLocality && !hasCountry) {
    return {
      success: false,
      error: 'address must provide at least one non-empty line, locality, or country after normalization.'
    };
  }

  let confirmedAt: string;
  if (input.lastConfirmedAt !== undefined) {
    if (!isValidIsoTimestamp(input.lastConfirmedAt)) {
      return { success: false, error: 'lastConfirmedAt must be a valid timestamp string.' };
    }
    confirmedAt = input.lastConfirmedAt.trim();
  } else {
    confirmedAt = new Date().toISOString();
  }

  let sourceAppId: string | undefined;
  if (input.sourceApplicationId !== undefined) {
    const trimmedSource =
      typeof input.sourceApplicationId === 'string' ? input.sourceApplicationId.trim() : '';
    if (!trimmedSource) {
      return { success: false, error: 'sourceApplicationId must be a non-empty string if provided.' };
    }
    sourceAppId = trimmedSource;
  }

  const newFact: ResidentialAddressFact = {
    address: {
      addressLines: cleanedLines,
      ...(locality ? { locality } : {}),
      ...(region ? { region } : {}),
      ...(postalCode ? { postalCode } : {}),
      ...(countryCodeOrName ? { countryCodeOrName } : {})
    },
    lastConfirmedAt: confirmedAt,
    ...(sourceAppId ? { sourceApplicationId: sourceAppId } : {})
  };

  return {
    success: true,
    profile: {
      ...profile,
      facts: {
        ...profile.facts,
        residentialAddress: newFact
      }
    }
  };
}

export function clearFact(
  profile: PersonFactProfile,
  factKey: keyof PersonFacts
): PersonFactProfile {
  if (!profile || typeof profile !== 'object') {
    return profile;
  }
  const updatedFacts = { ...profile.facts };
  delete updatedFacts[factKey];
  return {
    ...profile,
    facts: updatedFacts
  };
}
