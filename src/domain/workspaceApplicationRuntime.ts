import type { Workspace, ApplicationIdentity, Person } from './workspace';
import type { SavedProject } from './types';
import { loadProjectById } from '../storage/db';
import type { SavedProjectReadResult } from '../storage/projectMigration';

export type SavedProjectLoader = (
  projectId: string
) => Promise<SavedProjectReadResult | undefined>;

export type LoadWorkspaceApplicationSwitchResult =
  | {
      readonly kind: 'success';
      readonly applicationIdentity: ApplicationIdentity;
      readonly person: Person;
      readonly project: SavedProject & { routeId: string };
      readonly routeId: string;
    }
  | {
      readonly kind: 'application_not_found';
      readonly targetApplicationId: string;
      readonly message: string;
    }
  | {
      readonly kind: 'person_not_found';
      readonly targetApplicationId: string;
      readonly applicantPersonId: string;
      readonly message: string;
    }
  | {
      readonly kind: 'project_not_found';
      readonly targetApplicationId: string;
      readonly message: string;
    }
  | {
      readonly kind: 'project_future';
      readonly targetApplicationId: string;
      readonly schemaVersion: number;
      readonly message: string;
    }
  | {
      readonly kind: 'project_invalid';
      readonly targetApplicationId: string;
      readonly message: string;
    }
  | {
      readonly kind: 'project_unknown_route';
      readonly targetApplicationId: string;
      readonly routeId: string;
      readonly message: string;
    }
  | {
      readonly kind: 'identity_mismatch';
      readonly targetApplicationId: string;
      readonly message: string;
    }
  | {
      readonly kind: 'storage_error';
      readonly targetApplicationId: string;
      readonly error: unknown;
      readonly message: string;
    };

export interface LoadWorkspaceApplicationForSwitchInput {
  readonly workspace: Workspace;
  readonly targetApplicationId: string;
  readonly loadProject?: SavedProjectLoader;
}

export async function loadWorkspaceApplicationForSwitch(
  input: LoadWorkspaceApplicationForSwitchInput
): Promise<LoadWorkspaceApplicationSwitchResult> {
  const { workspace, targetApplicationId, loadProject = loadProjectById } = input;

  if (typeof targetApplicationId !== 'string' || !targetApplicationId.trim()) {
    return {
      kind: 'application_not_found',
      targetApplicationId: typeof targetApplicationId === 'string' ? targetApplicationId : '',
      message: 'Target applicationId must be a non-empty string.'
    };
  }

  const trimmedAppId = targetApplicationId.trim();

  const matchingApps = workspace.applications.filter(
    (app) => typeof app.applicationId === 'string' && app.applicationId.trim() === trimmedAppId
  );

  if (matchingApps.length === 0) {
    return {
      kind: 'application_not_found',
      targetApplicationId: trimmedAppId,
      message: `Application "${trimmedAppId}" not found in Workspace.`
    };
  }

  if (matchingApps.length > 1) {
    return {
      kind: 'identity_mismatch',
      targetApplicationId: trimmedAppId,
      message: `Ambiguous Workspace application identity: multiple entries match "${trimmedAppId}".`
    };
  }

  const appIdentity = matchingApps[0];

  if (
    typeof appIdentity.applicationId !== 'string' ||
    typeof appIdentity.applicantPersonId !== 'string' ||
    typeof appIdentity.routeId !== 'string' ||
    !appIdentity.applicationId.trim() ||
    !appIdentity.applicantPersonId.trim() ||
    !appIdentity.routeId.trim() ||
    appIdentity.applicationId !== appIdentity.applicationId.trim() ||
    appIdentity.applicantPersonId !== appIdentity.applicantPersonId.trim() ||
    appIdentity.routeId !== appIdentity.routeId.trim()
  ) {
    return {
      kind: 'identity_mismatch',
      targetApplicationId: trimmedAppId,
      message: 'ApplicationIdentity contains non-canonical or malformed identifiers.'
    };
  }

  const matchingPeople = workspace.people.filter(
    (p) => typeof p.personId === 'string' && p.personId.trim() === appIdentity.applicantPersonId
  );

  if (matchingPeople.length === 0) {
    return {
      kind: 'person_not_found',
      targetApplicationId: trimmedAppId,
      applicantPersonId: appIdentity.applicantPersonId,
      message: `Applicant person "${appIdentity.applicantPersonId}" not found in Workspace.`
    };
  }

  if (matchingPeople.length > 1) {
    return {
      kind: 'identity_mismatch',
      targetApplicationId: trimmedAppId,
      message: `Ambiguous Workspace person identity: multiple entries match "${appIdentity.applicantPersonId}".`
    };
  }

  const person = matchingPeople[0];

  if (
    typeof person.personId !== 'string' ||
    person.personId !== person.personId.trim() ||
    person.personId !== appIdentity.applicantPersonId
  ) {
    return {
      kind: 'identity_mismatch',
      targetApplicationId: trimmedAppId,
      message: 'Person identity is non-canonical or does not exactly match ApplicationIdentity applicantPersonId.'
    };
  }

  let readResult: SavedProjectReadResult | undefined;
  try {
    readResult = await loadProject(trimmedAppId);
  } catch (err) {
    return {
      kind: 'storage_error',
      targetApplicationId: trimmedAppId,
      error: err,
      message: err instanceof Error ? err.message : 'Storage error loading SavedProject.'
    };
  }

  if (!readResult) {
    return {
      kind: 'project_not_found',
      targetApplicationId: trimmedAppId,
      message: `SavedProject "${trimmedAppId}" not found.`
    };
  }

  if (readResult.kind === 'future') {
    return {
      kind: 'project_future',
      targetApplicationId: trimmedAppId,
      schemaVersion: readResult.schemaVersion,
      message: `SavedProject "${trimmedAppId}" schema version ${readResult.schemaVersion} is not supported.`
    };
  }

  if (readResult.kind === 'invalid') {
    return {
      kind: 'project_invalid',
      targetApplicationId: trimmedAppId,
      message: `SavedProject "${trimmedAppId}" contains invalid or corrupted data.`
    };
  }

  if (readResult.kind === 'unknown_route') {
    return {
      kind: 'project_unknown_route',
      targetApplicationId: trimmedAppId,
      routeId: readResult.routeId,
      message: `SavedProject "${trimmedAppId}" references unregistered route "${readResult.routeId}".`
    };
  }

  // readResult is kind === 'current'
  const project = readResult.project;

  if (project.id !== appIdentity.applicationId) {
    return {
      kind: 'identity_mismatch',
      targetApplicationId: trimmedAppId,
      message: `Loaded project id "${project.id}" does not match Workspace applicationId "${appIdentity.applicationId}".`
    };
  }

  if (project.routeId !== appIdentity.routeId) {
    return {
      kind: 'identity_mismatch',
      targetApplicationId: trimmedAppId,
      message: `Loaded project routeId "${project.routeId}" does not match Workspace routeId "${appIdentity.routeId}".`
    };
  }

  return {
    kind: 'success',
    applicationIdentity: appIdentity,
    person,
    project,
    routeId: project.routeId
  };
}
