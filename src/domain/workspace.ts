export interface Person {
  readonly personId: string;
  readonly displayName: string;
}

export interface SpouseOrPartnerRelationship {
  readonly kind: 'spouse_or_partner';
  readonly relationshipId: string;
  readonly personAId: string;
  readonly personBId: string;
}

export interface ParentChildRelationship {
  readonly kind: 'parent_child';
  readonly relationshipId: string;
  readonly parentPersonId: string;
  readonly childPersonId: string;
}

export interface GuardianDependentRelationship {
  readonly kind: 'guardian_dependent';
  readonly relationshipId: string;
  readonly guardianPersonId: string;
  readonly dependentPersonId: string;
}

export type PersonRelationship =
  | SpouseOrPartnerRelationship
  | ParentChildRelationship
  | GuardianDependentRelationship;

export interface ApplicationIdentity {
  readonly applicationId: string;
  readonly applicantPersonId: string;
  readonly routeId: string;
}

export interface Workspace {
  readonly people: readonly Person[];
  readonly relationships: readonly PersonRelationship[];
  readonly applications: readonly ApplicationIdentity[];
}

export interface WorkspaceValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export type WorkspaceMutationResult =
  | { readonly success: true; readonly workspace: Workspace }
  | { readonly success: false; readonly error: string };

export function findPersonById(workspace: Workspace, personId: string): Person | undefined {
  return workspace.people.find((person) => person.personId === personId);
}

export function getApplicationsForPerson(
  workspace: Workspace,
  personId: string
): readonly ApplicationIdentity[] {
  return workspace.applications.filter((app) => app.applicantPersonId === personId);
}

export function getRelationshipsForPerson(
  workspace: Workspace,
  personId: string
): readonly PersonRelationship[] {
  return workspace.relationships.filter((rel) => {
    switch (rel.kind) {
      case 'spouse_or_partner':
        return rel.personAId === personId || rel.personBId === personId;
      case 'parent_child':
        return rel.parentPersonId === personId || rel.childPersonId === personId;
      case 'guardian_dependent':
        return rel.guardianPersonId === personId || rel.dependentPersonId === personId;
    }
  });
}

export function validateWorkspaceReferences(workspace: Workspace): WorkspaceValidationResult {
  const errors: string[] = [];
  const personIds = new Set(workspace.people.map((p) => p.personId));

  for (const app of workspace.applications) {
    if (!personIds.has(app.applicantPersonId)) {
      errors.push(
        `Application "${app.applicationId}" references non-existent applicantPersonId "${app.applicantPersonId}".`
      );
    }
  }

  for (const rel of workspace.relationships) {
    switch (rel.kind) {
      case 'spouse_or_partner':
        if (!personIds.has(rel.personAId)) {
          errors.push(
            `Relationship "${rel.relationshipId}" references non-existent personAId "${rel.personAId}".`
          );
        }
        if (!personIds.has(rel.personBId)) {
          errors.push(
            `Relationship "${rel.relationshipId}" references non-existent personBId "${rel.personBId}".`
          );
        }
        break;
      case 'parent_child':
        if (!personIds.has(rel.parentPersonId)) {
          errors.push(
            `Relationship "${rel.relationshipId}" references non-existent parentPersonId "${rel.parentPersonId}".`
          );
        }
        if (!personIds.has(rel.childPersonId)) {
          errors.push(
            `Relationship "${rel.relationshipId}" references non-existent childPersonId "${rel.childPersonId}".`
          );
        }
        break;
      case 'guardian_dependent':
        if (!personIds.has(rel.guardianPersonId)) {
          errors.push(
            `Relationship "${rel.relationshipId}" references non-existent guardianPersonId "${rel.guardianPersonId}".`
          );
        }
        if (!personIds.has(rel.dependentPersonId)) {
          errors.push(
            `Relationship "${rel.relationshipId}" references non-existent dependentPersonId "${rel.dependentPersonId}".`
          );
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function addPersonToWorkspace(
  workspace: Workspace,
  person: Person
): WorkspaceMutationResult {
  if (!person || typeof person !== 'object') {
    return { success: false, error: 'Person must be a valid object.' };
  }
  const personId = typeof person.personId === 'string' ? person.personId.trim() : '';
  if (!personId) {
    return { success: false, error: 'personId must be a valid non-empty string.' };
  }
  const displayName = typeof person.displayName === 'string' ? person.displayName.trim() : '';
  if (!displayName) {
    return { success: false, error: 'displayName must be a valid non-empty string.' };
  }
  if (workspace.people.some((p) => p.personId === personId)) {
    return { success: false, error: `Person with ID "${personId}" already exists in workspace.` };
  }

  const newPerson: Person = {
    personId,
    displayName
  };

  return {
    success: true,
    workspace: {
      people: [...workspace.people, newPerson],
      relationships: workspace.relationships,
      applications: workspace.applications
    }
  };
}

export function updatePersonInWorkspace(
  workspace: Workspace,
  person: Person
): WorkspaceMutationResult {
  if (!person || typeof person !== 'object') {
    return { success: false, error: 'Person must be a valid object.' };
  }
  const personId = typeof person.personId === 'string' ? person.personId.trim() : '';
  if (!personId) {
    return { success: false, error: 'personId must be a valid non-empty string.' };
  }
  const displayName = typeof person.displayName === 'string' ? person.displayName.trim() : '';
  if (!displayName) {
    return { success: false, error: 'displayName must be a valid non-empty string.' };
  }

  const existingIndex = workspace.people.findIndex((p) => p.personId === personId);
  if (existingIndex < 0) {
    return { success: false, error: `Person with ID "${personId}" does not exist in workspace.` };
  }

  const updatedPerson: Person = {
    personId,
    displayName
  };

  const updatedPeople = workspace.people.map((p, idx) =>
    idx === existingIndex ? updatedPerson : p
  );

  return {
    success: true,
    workspace: {
      people: updatedPeople,
      relationships: workspace.relationships,
      applications: workspace.applications
    }
  };
}

export function removePersonFromWorkspace(
  workspace: Workspace,
  personId: string
): WorkspaceMutationResult {
  const normalizedId = typeof personId === 'string' ? personId.trim() : '';
  if (!normalizedId) {
    return { success: false, error: 'personId must be a valid non-empty string.' };
  }

  const existingPerson = workspace.people.find((p) => p.personId === normalizedId);
  if (!existingPerson) {
    return { success: false, error: `Person with ID "${normalizedId}" does not exist in workspace.` };
  }

  const applicationRefs = workspace.applications.filter(
    (app) => app.applicantPersonId === normalizedId
  );
  if (applicationRefs.length > 0) {
    return {
      success: false,
      error: `Cannot remove person "${normalizedId}": referenced by ${applicationRefs.length} application(s).`
    };
  }

  const relationshipRefs = workspace.relationships.filter((rel) => {
    switch (rel.kind) {
      case 'spouse_or_partner':
        return rel.personAId === normalizedId || rel.personBId === normalizedId;
      case 'parent_child':
        return rel.parentPersonId === normalizedId || rel.childPersonId === normalizedId;
      case 'guardian_dependent':
        return rel.guardianPersonId === normalizedId || rel.dependentPersonId === normalizedId;
    }
  });

  if (relationshipRefs.length > 0) {
    return {
      success: false,
      error: `Cannot remove person "${normalizedId}": referenced by ${relationshipRefs.length} relationship(s).`
    };
  }

  return {
    success: true,
    workspace: {
      people: workspace.people.filter((p) => p.personId !== normalizedId),
      relationships: workspace.relationships,
      applications: workspace.applications
    }
  };
}

export function upsertRelationshipInWorkspace(
  workspace: Workspace,
  relationship: PersonRelationship
): WorkspaceMutationResult {
  if (!relationship || typeof relationship !== 'object') {
    return { success: false, error: 'Relationship must be a valid object.' };
  }

  const relationshipId =
    typeof relationship.relationshipId === 'string' ? relationship.relationshipId.trim() : '';
  if (!relationshipId) {
    return { success: false, error: 'relationshipId must be a valid non-empty string.' };
  }

  const personIds = new Set(workspace.people.map((p) => p.personId));

  let normalizedRel: PersonRelationship;

  switch (relationship.kind) {
    case 'spouse_or_partner': {
      const personAId = typeof relationship.personAId === 'string' ? relationship.personAId.trim() : '';
      const personBId = typeof relationship.personBId === 'string' ? relationship.personBId.trim() : '';
      if (!personAId || !personBId) {
        return { success: false, error: 'personAId and personBId must be valid non-empty strings.' };
      }
      if (personAId === personBId) {
        return {
          success: false,
          error: 'Self-referential spouse_or_partner relationship is not allowed.'
        };
      }
      if (!personIds.has(personAId)) {
        return { success: false, error: `Person with ID "${personAId}" does not exist in workspace.` };
      }
      if (!personIds.has(personBId)) {
        return { success: false, error: `Person with ID "${personBId}" does not exist in workspace.` };
      }
      normalizedRel = {
        kind: 'spouse_or_partner',
        relationshipId,
        personAId,
        personBId
      };
      break;
    }
    case 'parent_child': {
      const parentPersonId =
        typeof relationship.parentPersonId === 'string' ? relationship.parentPersonId.trim() : '';
      const childPersonId =
        typeof relationship.childPersonId === 'string' ? relationship.childPersonId.trim() : '';
      if (!parentPersonId || !childPersonId) {
        return {
          success: false,
          error: 'parentPersonId and childPersonId must be valid non-empty strings.'
        };
      }
      if (parentPersonId === childPersonId) {
        return {
          success: false,
          error: 'Self-referential parent_child relationship is not allowed.'
        };
      }
      if (!personIds.has(parentPersonId)) {
        return { success: false, error: `Person with ID "${parentPersonId}" does not exist in workspace.` };
      }
      if (!personIds.has(childPersonId)) {
        return { success: false, error: `Person with ID "${childPersonId}" does not exist in workspace.` };
      }
      normalizedRel = {
        kind: 'parent_child',
        relationshipId,
        parentPersonId,
        childPersonId
      };
      break;
    }
    case 'guardian_dependent': {
      const guardianPersonId =
        typeof relationship.guardianPersonId === 'string' ? relationship.guardianPersonId.trim() : '';
      const dependentPersonId =
        typeof relationship.dependentPersonId === 'string' ? relationship.dependentPersonId.trim() : '';
      if (!guardianPersonId || !dependentPersonId) {
        return {
          success: false,
          error: 'guardianPersonId and dependentPersonId must be valid non-empty strings.'
        };
      }
      if (guardianPersonId === dependentPersonId) {
        return {
          success: false,
          error: 'Self-referential guardian_dependent relationship is not allowed.'
        };
      }
      if (!personIds.has(guardianPersonId)) {
        return { success: false, error: `Person with ID "${guardianPersonId}" does not exist in workspace.` };
      }
      if (!personIds.has(dependentPersonId)) {
        return { success: false, error: `Person with ID "${dependentPersonId}" does not exist in workspace.` };
      }
      normalizedRel = {
        kind: 'guardian_dependent',
        relationshipId,
        guardianPersonId,
        dependentPersonId
      };
      break;
    }
    default:
      return { success: false, error: `Unknown relationship kind.` };
  }

  const existingIndex = workspace.relationships.findIndex(
    (r) => r.relationshipId === relationshipId
  );

  let newRelationships: PersonRelationship[];
  if (existingIndex >= 0) {
    newRelationships = workspace.relationships.map((r, idx) =>
      idx === existingIndex ? normalizedRel : r
    );
  } else {
    newRelationships = [...workspace.relationships, normalizedRel];
  }

  return {
    success: true,
    workspace: {
      people: workspace.people,
      relationships: newRelationships,
      applications: workspace.applications
    }
  };
}

export function removeRelationshipFromWorkspace(
  workspace: Workspace,
  relationshipId: string
): WorkspaceMutationResult {
  const normalizedId = typeof relationshipId === 'string' ? relationshipId.trim() : '';
  if (!normalizedId) {
    return { success: false, error: 'relationshipId must be a valid non-empty string.' };
  }

  const existingRel = workspace.relationships.find((r) => r.relationshipId === normalizedId);
  if (!existingRel) {
    return {
      success: false,
      error: `Relationship with ID "${normalizedId}" does not exist in workspace.`
    };
  }

  return {
    success: true,
    workspace: {
      people: workspace.people,
      relationships: workspace.relationships.filter((r) => r.relationshipId !== normalizedId),
      applications: workspace.applications
    }
  };
}
