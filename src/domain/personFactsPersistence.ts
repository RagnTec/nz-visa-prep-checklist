import {
  isValidDateOnly,
  isValidIsoTimestamp,
  type DateOfBirthFact,
  type EmailFact,
  type PersonFactProfile,
  type PersonFacts,
  type ResidentialAddress,
  type ResidentialAddressFact
} from './personFacts';

export const CURRENT_SAVED_PERSON_FACTS_SCHEMA_VERSION = 1;

export interface SavedPersonFactProfile {
  readonly personId: string;
  readonly schemaVersion: number;
  readonly facts: PersonFacts;
  readonly updatedAt: string;
}

export type SavedPersonFactProfileReadResult =
  | { readonly kind: 'empty'; readonly personId: string }
  | {
      readonly kind: 'current';
      readonly profile: PersonFactProfile;
      readonly savedProfile: SavedPersonFactProfile;
    }
  | {
      readonly kind: 'future';
      readonly personId: string;
      readonly schemaVersion: number;
      readonly rawData: unknown;
    }
  | {
      readonly kind: 'invalid';
      readonly personId: string;
      readonly errors: readonly string[];
      readonly rawData: unknown;
    };

export function createSavedPersonFactProfile(
  profile: PersonFactProfile,
  overrides: { schemaVersion?: number; updatedAt?: string } = {}
): SavedPersonFactProfile {
  if (!profile || typeof profile !== 'object') {
    throw new Error('profile must be a valid object.');
  }
  const personId = typeof profile.personId === 'string' ? profile.personId.trim() : '';
  if (!personId) {
    throw new Error('profile.personId must be a valid non-empty string.');
  }
  if (overrides.updatedAt !== undefined && !isValidIsoTimestamp(overrides.updatedAt)) {
    throw new Error('overrides.updatedAt must be a valid timestamp string.');
  }

  return {
    personId,
    schemaVersion: overrides.schemaVersion ?? CURRENT_SAVED_PERSON_FACTS_SCHEMA_VERSION,
    facts: profile.facts ?? {},
    updatedAt: overrides.updatedAt ?? new Date().toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseSourceApplicationId(
  raw: Record<string, unknown>,
  factPath: string,
  errors: string[]
): string | undefined {
  if (!('sourceApplicationId' in raw) || raw.sourceApplicationId === undefined) {
    return undefined;
  }
  if (typeof raw.sourceApplicationId !== 'string' || !raw.sourceApplicationId.trim()) {
    errors.push(`${factPath}.sourceApplicationId must be a non-empty string if provided.`);
    return undefined;
  }
  return raw.sourceApplicationId.trim();
}

function parseDateOfBirthFact(raw: unknown, errors: string[]): DateOfBirthFact | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('facts.dateOfBirth must be an object.');
    return undefined;
  }
  const date = typeof raw.date === 'string' ? raw.date.trim() : '';
  if (!isValidDateOnly(date)) {
    errors.push('facts.dateOfBirth.date must be a valid real YYYY-MM-DD string.');
    return undefined;
  }
  const lastConfirmedAt = typeof raw.lastConfirmedAt === 'string' ? raw.lastConfirmedAt.trim() : '';
  if (!isValidIsoTimestamp(lastConfirmedAt)) {
    errors.push('facts.dateOfBirth.lastConfirmedAt must be a valid timestamp string.');
    return undefined;
  }
  const sourceApplicationId = parseSourceApplicationId(raw, 'facts.dateOfBirth', errors);

  return {
    date,
    lastConfirmedAt,
    ...(sourceApplicationId ? { sourceApplicationId } : {})
  };
}

function parseEmailFact(raw: unknown, errors: string[]): EmailFact | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('facts.email must be an object.');
    return undefined;
  }
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  if (!email || !email.includes('@')) {
    errors.push('facts.email.email must be a valid email string containing "@".');
    return undefined;
  }
  const lastConfirmedAt = typeof raw.lastConfirmedAt === 'string' ? raw.lastConfirmedAt.trim() : '';
  if (!isValidIsoTimestamp(lastConfirmedAt)) {
    errors.push('facts.email.lastConfirmedAt must be a valid timestamp string.');
    return undefined;
  }
  const sourceApplicationId = parseSourceApplicationId(raw, 'facts.email', errors);

  return {
    email,
    lastConfirmedAt,
    ...(sourceApplicationId ? { sourceApplicationId } : {})
  };
}

function parseResidentialAddressFact(raw: unknown, errors: string[]): ResidentialAddressFact | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('facts.residentialAddress must be an object.');
    return undefined;
  }
  const lastConfirmedAt = typeof raw.lastConfirmedAt === 'string' ? raw.lastConfirmedAt.trim() : '';
  if (!isValidIsoTimestamp(lastConfirmedAt)) {
    errors.push('facts.residentialAddress.lastConfirmedAt must be a valid timestamp string.');
    return undefined;
  }
  const sourceApplicationId = parseSourceApplicationId(raw, 'facts.residentialAddress', errors);

  const addr = raw.address;
  if (!isRecord(addr)) {
    errors.push('facts.residentialAddress.address must be an object.');
    return undefined;
  }

  if (!Array.isArray(addr.addressLines)) {
    errors.push('facts.residentialAddress.address.addressLines must be an array of strings.');
    return undefined;
  }

  if (addr.addressLines.some((l) => typeof l !== 'string')) {
    errors.push('facts.residentialAddress.address.addressLines must contain only strings.');
    return undefined;
  }

  // Known optional fields validation - must fail closed if present but not a string
  if ('locality' in addr && addr.locality !== undefined && typeof addr.locality !== 'string') {
    errors.push('facts.residentialAddress.address.locality must be a string if provided.');
    return undefined;
  }
  if ('region' in addr && addr.region !== undefined && typeof addr.region !== 'string') {
    errors.push('facts.residentialAddress.address.region must be a string if provided.');
    return undefined;
  }
  if ('postalCode' in addr && addr.postalCode !== undefined && typeof addr.postalCode !== 'string') {
    errors.push('facts.residentialAddress.address.postalCode must be a string if provided.');
    return undefined;
  }
  if ('countryCodeOrName' in addr && addr.countryCodeOrName !== undefined && typeof addr.countryCodeOrName !== 'string') {
    errors.push('facts.residentialAddress.address.countryCodeOrName must be a string if provided.');
    return undefined;
  }

  const cleanedLines = addr.addressLines
    .filter((l): l is string => typeof l === 'string')
    .map((l) => l.trim())
    .filter(Boolean);

  const locality = typeof addr.locality === 'string' ? addr.locality.trim() : undefined;
  const region = typeof addr.region === 'string' ? addr.region.trim() : undefined;
  const postalCode = typeof addr.postalCode === 'string' ? addr.postalCode.trim() : undefined;
  const countryCodeOrName =
    typeof addr.countryCodeOrName === 'string' ? addr.countryCodeOrName.trim() : undefined;

  if (cleanedLines.length === 0 && !locality && !countryCodeOrName) {
    errors.push(
      'facts.residentialAddress.address must provide at least one non-empty line, locality, or country after normalization.'
    );
    return undefined;
  }

  const address: ResidentialAddress = {
    addressLines: cleanedLines,
    ...(locality ? { locality } : {}),
    ...(region ? { region } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(countryCodeOrName ? { countryCodeOrName } : {})
  };

  return {
    address,
    lastConfirmedAt,
    ...(sourceApplicationId ? { sourceApplicationId } : {})
  };
}

export function prepareSavedPersonFactProfileForRead(
  record: unknown,
  requestedPersonId?: string
): SavedPersonFactProfileReadResult {
  const fallbackPersonId = typeof requestedPersonId === 'string' ? requestedPersonId.trim() : '';

  if (record === null || record === undefined) {
    return { kind: 'empty', personId: fallbackPersonId };
  }

  if (!isRecord(record)) {
    return {
      kind: 'invalid',
      personId: fallbackPersonId,
      errors: ['Profile record must be an object.'],
      rawData: record
    };
  }

  const recordPersonId = typeof record.personId === 'string' ? record.personId.trim() : '';
  const effectivePersonId = recordPersonId || fallbackPersonId;

  if (typeof record.schemaVersion !== 'number' || Number.isNaN(record.schemaVersion)) {
    return {
      kind: 'invalid',
      personId: effectivePersonId,
      errors: ['schemaVersion must be a number.'],
      rawData: record
    };
  }

  if (record.schemaVersion > CURRENT_SAVED_PERSON_FACTS_SCHEMA_VERSION) {
    return {
      kind: 'future',
      personId: effectivePersonId,
      schemaVersion: record.schemaVersion,
      rawData: record
    };
  }

  if (record.schemaVersion < 1) {
    return {
      kind: 'invalid',
      personId: effectivePersonId,
      errors: ['schemaVersion cannot be less than 1.'],
      rawData: record
    };
  }

  const errors: string[] = [];

  if (!recordPersonId) {
    errors.push('personId must be a non-empty string.');
  } else if (fallbackPersonId && recordPersonId !== fallbackPersonId) {
    errors.push(`Record personId "${recordPersonId}" does not match requested "${fallbackPersonId}".`);
  }

  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt.trim() : '';
  if (!isValidIsoTimestamp(updatedAt)) {
    errors.push('updatedAt must be a valid timestamp string.');
  }

  if (!isRecord(record.facts)) {
    errors.push('facts must be an object.');
    return {
      kind: 'invalid',
      personId: effectivePersonId,
      errors,
      rawData: record
    };
  }

  // Parse known Pilot facts; unknown extra fields in record.facts are deliberately excluded
  const dateOfBirth = parseDateOfBirthFact(record.facts.dateOfBirth, errors);
  const email = parseEmailFact(record.facts.email, errors);
  const residentialAddress = parseResidentialAddressFact(record.facts.residentialAddress, errors);

  if (errors.length > 0) {
    return {
      kind: 'invalid',
      personId: effectivePersonId,
      errors,
      rawData: record
    };
  }

  const normalizedFacts: PersonFacts = {
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(email ? { email } : {}),
    ...(residentialAddress ? { residentialAddress } : {})
  };

  const profile: PersonFactProfile = {
    personId: effectivePersonId,
    facts: normalizedFacts
  };

  const savedProfile: SavedPersonFactProfile = {
    personId: effectivePersonId,
    schemaVersion: record.schemaVersion,
    facts: normalizedFacts,
    updatedAt
  };

  return {
    kind: 'current',
    profile,
    savedProfile
  };
}
