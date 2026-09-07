import type {
  ApplicationIdentity,
  GuardianDependentRelationship,
  ParentChildRelationship,
  Person,
  PersonRelationship,
  SpouseOrPartnerRelationship,
  Workspace
} from './workspace';
import { validateWorkspaceReferences } from './workspace';

export const CURRENT_SAVED_WORKSPACE_SCHEMA_VERSION = 1;

export interface SavedWorkspace {
  readonly id: string;
  readonly schemaVersion: number;
  readonly workspace: Workspace;
  readonly updatedAt: string;
}

export type SavedWorkspaceReadResult =
  | { kind: 'empty'; workspace: Workspace }
  | { kind: 'current'; workspace: Workspace; savedWorkspace: SavedWorkspace }
  | { kind: 'future'; schemaVersion: number; rawData: unknown }
  | { kind: 'invalid'; errors: readonly string[]; rawData: unknown };

export function createEmptyWorkspace(): Workspace {
  return {
    people: [],
    relationships: [],
    applications: []
  };
}

export function createSavedWorkspace(
  workspace: Workspace,
  overrides: { id?: string; schemaVersion?: number; updatedAt?: string } = {}
): SavedWorkspace {
  return {
    id: typeof overrides.id === 'string' && overrides.id.trim() !== '' ? overrides.id : 'default',
    schemaVersion: overrides.schemaVersion ?? CURRENT_SAVED_WORKSPACE_SCHEMA_VERSION,
    workspace,
    updatedAt: overrides.updatedAt ?? new Date().toISOString()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseAndNormalizePerson(
  item: unknown,
  index: number,
  errors: string[]
): Person | null {
  if (!isRecord(item)) {
    errors.push(`Person at index ${index} must be an object.`);
    return null;
  }
  if (typeof item.personId !== 'string' || item.personId.trim() === '') {
    errors.push(`Person at index ${index} is missing a valid string personId.`);
    return null;
  }
  if (typeof item.displayName !== 'string' || item.displayName.trim() === '') {
    errors.push(`Person at index ${index} is missing a valid string displayName.`);
    return null;
  }
  return {
    personId: item.personId,
    displayName: item.displayName
  };
}

function parseAndNormalizeRelationship(
  item: unknown,
  index: number,
  errors: string[]
): PersonRelationship | null {
  if (!isRecord(item)) {
    errors.push(`Relationship at index ${index} must be an object.`);
    return null;
  }
  if (typeof item.relationshipId !== 'string' || item.relationshipId.trim() === '') {
    errors.push(`Relationship at index ${index} is missing a valid string relationshipId.`);
    return null;
  }
  if (item.kind === 'spouse_or_partner') {
    if (
      typeof item.personAId !== 'string' ||
      item.personAId.trim() === '' ||
      typeof item.personBId !== 'string' ||
      item.personBId.trim() === ''
    ) {
      errors.push(
        `SpouseOrPartnerRelationship at index ${index} must have valid string personAId and personBId.`
      );
      return null;
    }
    const normalized: SpouseOrPartnerRelationship = {
      kind: 'spouse_or_partner',
      relationshipId: item.relationshipId,
      personAId: item.personAId,
      personBId: item.personBId
    };
    return normalized;
  }
  if (item.kind === 'parent_child') {
    if (
      typeof item.parentPersonId !== 'string' ||
      item.parentPersonId.trim() === '' ||
      typeof item.childPersonId !== 'string' ||
      item.childPersonId.trim() === ''
    ) {
      errors.push(
        `ParentChildRelationship at index ${index} must have valid string parentPersonId and childPersonId.`
      );
      return null;
    }
    const normalized: ParentChildRelationship = {
      kind: 'parent_child',
      relationshipId: item.relationshipId,
      parentPersonId: item.parentPersonId,
      childPersonId: item.childPersonId
    };
    return normalized;
  }
  if (item.kind === 'guardian_dependent') {
    if (
      typeof item.guardianPersonId !== 'string' ||
      item.guardianPersonId.trim() === '' ||
      typeof item.dependentPersonId !== 'string' ||
      item.dependentPersonId.trim() === ''
    ) {
      errors.push(
        `GuardianDependentRelationship at index ${index} must have valid string guardianPersonId and dependentPersonId.`
      );
      return null;
    }
    const normalized: GuardianDependentRelationship = {
      kind: 'guardian_dependent',
      relationshipId: item.relationshipId,
      guardianPersonId: item.guardianPersonId,
      dependentPersonId: item.dependentPersonId
    };
    return normalized;
  }
  errors.push(`Relationship at index ${index} has unknown kind "${String(item.kind)}".`);
  return null;
}

function parseAndNormalizeApplication(
  item: unknown,
  index: number,
  errors: string[]
): ApplicationIdentity | null {
  if (!isRecord(item)) {
    errors.push(`Application at index ${index} must be an object.`);
    return null;
  }
  if (typeof item.applicationId !== 'string' || item.applicationId.trim() === '') {
    errors.push(`Application at index ${index} is missing a valid string applicationId.`);
    return null;
  }
  if (typeof item.applicantPersonId !== 'string' || item.applicantPersonId.trim() === '') {
    errors.push(`Application at index ${index} is missing a valid string applicantPersonId.`);
    return null;
  }
  if (typeof item.routeId !== 'string' || item.routeId.trim() === '') {
    errors.push(`Application at index ${index} is missing a valid string routeId.`);
    return null;
  }
  return {
    applicationId: item.applicationId,
    applicantPersonId: item.applicantPersonId,
    routeId: item.routeId
  };
}

export function prepareSavedWorkspaceForRead(raw: unknown): SavedWorkspaceReadResult {
  if (raw === null || raw === undefined) {
    return { kind: 'empty', workspace: createEmptyWorkspace() };
  }

  if (!isRecord(raw)) {
    return { kind: 'invalid', errors: ['Saved workspace data must be an object.'], rawData: raw };
  }

  const schemaVersion = raw.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    return { kind: 'invalid', errors: ['Missing or invalid integer schemaVersion.'], rawData: raw };
  }

  if (schemaVersion > CURRENT_SAVED_WORKSPACE_SCHEMA_VERSION) {
    return { kind: 'future', schemaVersion, rawData: raw };
  }

  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.trim() === '') {
    return { kind: 'invalid', errors: ['Missing or invalid string updatedAt.'], rawData: raw };
  }

  const rawWorkspace = raw.workspace;
  if (!isRecord(rawWorkspace)) {
    return { kind: 'invalid', errors: ['Missing workspace property or not an object.'], rawData: raw };
  }

  if (
    !Array.isArray(rawWorkspace.people) ||
    !Array.isArray(rawWorkspace.relationships) ||
    !Array.isArray(rawWorkspace.applications)
  ) {
    return {
      kind: 'invalid',
      errors: ['Workspace people, relationships, and applications must all be arrays.'],
      rawData: raw
    };
  }

  const structuralErrors: string[] = [];

  const people: Person[] = [];
  rawWorkspace.people.forEach((p, idx) => {
    const parsed = parseAndNormalizePerson(p, idx, structuralErrors);
    if (parsed) people.push(parsed);
  });

  const relationships: PersonRelationship[] = [];
  rawWorkspace.relationships.forEach((r, idx) => {
    const parsed = parseAndNormalizeRelationship(r, idx, structuralErrors);
    if (parsed) relationships.push(parsed);
  });

  const applications: ApplicationIdentity[] = [];
  rawWorkspace.applications.forEach((a, idx) => {
    const parsed = parseAndNormalizeApplication(a, idx, structuralErrors);
    if (parsed) applications.push(parsed);
  });

  if (structuralErrors.length > 0) {
    return { kind: 'invalid', errors: structuralErrors, rawData: raw };
  }

  const workspace: Workspace = {
    people,
    relationships,
    applications
  };

  const refCheck = validateWorkspaceReferences(workspace);
  if (!refCheck.valid) {
    return {
      kind: 'invalid',
      errors: refCheck.errors,
      rawData: raw
    };
  }

  const id = typeof raw.id === 'string' && raw.id.trim() !== '' ? raw.id : 'default';

  const savedWorkspace: SavedWorkspace = {
    id,
    schemaVersion,
    workspace,
    updatedAt: raw.updatedAt
  };

  return {
    kind: 'current',
    workspace,
    savedWorkspace
  };
}
