import { isRegisteredRouteId } from '../content/registry';
import { createProjectAndWorkspace } from '../storage/db';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION, type SavedProject } from './types';
import {
  type ApplicationIdentity,
  type Person,
  type Workspace,
  addPersonToWorkspace
} from './workspace';
import {
  type SavedWorkspace,
  createSavedWorkspace
} from './workspacePersistence';

export type ApplicantSelection =
  | { readonly kind: 'existing'; readonly personId: string }
  | { readonly kind: 'new'; readonly person: Person };

export interface CreateWorkspaceApplicationInput {
  readonly applicationId: string;
  readonly routeId: string;
  readonly applicant: ApplicantSelection;
}

export type CreateWorkspaceApplicationResult =
  | {
      readonly success: true;
      readonly person: Person;
      readonly applicationIdentity: ApplicationIdentity;
      readonly project: SavedProject;
      readonly workspace: Workspace;
      readonly savedWorkspace: SavedWorkspace;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export async function createWorkspaceApplication(
  workspace: Workspace,
  input: CreateWorkspaceApplicationInput,
  persistFn: (project: SavedProject, workspace: SavedWorkspace) => Promise<void> = createProjectAndWorkspace
): Promise<CreateWorkspaceApplicationResult> {
  if (!workspace || typeof workspace !== 'object') {
    return { success: false, error: 'Workspace must be a valid object.' };
  }

  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Input must be a valid object.' };
  }

  const applicationId =
    typeof input.applicationId === 'string' ? input.applicationId.trim() : '';
  if (!applicationId) {
    return { success: false, error: 'applicationId must be a valid non-empty string.' };
  }

  const routeId = typeof input.routeId === 'string' ? input.routeId.trim() : '';
  if (!routeId) {
    return { success: false, error: 'routeId must be a valid non-empty string.' };
  }

  if (!isRegisteredRouteId(routeId)) {
    return { success: false, error: `Unknown or unregistered routeId: "${routeId}".` };
  }

  if (workspace.applications.some((app) => app.applicationId === applicationId)) {
    return {
      success: false,
      error: `Application with ID "${applicationId}" already exists in workspace.`
    };
  }

  let selectedPerson: Person;
  let updatedPeople: readonly Person[];

  const applicant = input.applicant;
  if (!applicant || typeof applicant !== 'object') {
    return { success: false, error: 'Applicant selection must be provided.' };
  }

  if (applicant.kind === 'existing') {
    const personId = typeof applicant.personId === 'string' ? applicant.personId.trim() : '';
    if (!personId) {
      return { success: false, error: 'Existing applicant personId must be a non-empty string.' };
    }
    const existingPerson = workspace.people.find((p) => p.personId === personId);
    if (!existingPerson) {
      return {
        success: false,
        error: `Person with ID "${personId}" does not exist in workspace.`
      };
    }
    selectedPerson = existingPerson;
    updatedPeople = workspace.people;
  } else if (applicant.kind === 'new') {
    const addResult = addPersonToWorkspace(workspace, applicant.person);
    if (!addResult.success) {
      return { success: false, error: addResult.error };
    }
    const normalizedPerson =
      addResult.workspace.people[addResult.workspace.people.length - 1];
    selectedPerson = normalizedPerson;
    updatedPeople = addResult.workspace.people;
  } else {
    return { success: false, error: 'Applicant selection must be either "existing" or "new".' };
  }

  const now = new Date().toISOString();

  const project: SavedProject = {
    id: applicationId,
    routeId,
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    surveyCompleted: false,
    answers: {},
    statuses: {},
    updatedAt: now
  };

  const applicationIdentity: ApplicationIdentity = {
    applicationId,
    applicantPersonId: selectedPerson.personId,
    routeId
  };

  const updatedWorkspace: Workspace = {
    people: updatedPeople,
    relationships: workspace.relationships,
    applications: [...workspace.applications, applicationIdentity]
  };

  const savedWorkspace: SavedWorkspace = createSavedWorkspace(updatedWorkspace, {
    id: 'default',
    updatedAt: now
  });

  await persistFn(project, savedWorkspace);

  return {
    success: true,
    person: selectedPerson,
    applicationIdentity,
    project,
    workspace: updatedWorkspace,
    savedWorkspace
  };
}
