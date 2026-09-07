import { deleteProjectAndSaveWorkspace } from '../storage/db';
import type { ApplicationIdentity, Workspace } from './workspace';
import {
  type SavedWorkspace,
  createSavedWorkspace
} from './workspacePersistence';

export type DeleteWorkspaceApplicationResult =
  | {
      readonly success: true;
      readonly removedApplicationIdentity: ApplicationIdentity;
      readonly workspace: Workspace;
      readonly savedWorkspace: SavedWorkspace;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export async function deleteWorkspaceApplication(
  workspace: Workspace,
  applicationId: string,
  persistFn: (projectId: string, workspace: SavedWorkspace) => Promise<void> = deleteProjectAndSaveWorkspace
): Promise<DeleteWorkspaceApplicationResult> {
  if (!workspace || typeof workspace !== 'object') {
    return { success: false, error: 'Workspace must be a valid object.' };
  }

  const trimmedId = typeof applicationId === 'string' ? applicationId.trim() : '';
  if (!trimmedId) {
    return { success: false, error: 'applicationId must be a valid non-empty string.' };
  }

  const matchingApplication = workspace.applications.find(
    (app) => app.applicationId === trimmedId
  );
  if (!matchingApplication) {
    return {
      success: false,
      error: `Application with ID "${trimmedId}" does not exist in workspace.`
    };
  }

  const updatedApplications = workspace.applications.filter(
    (app) => app.applicationId !== trimmedId
  );

  const updatedWorkspace: Workspace = {
    people: workspace.people,
    relationships: workspace.relationships,
    applications: updatedApplications
  };

  const now = new Date().toISOString();
  const savedWorkspace: SavedWorkspace = createSavedWorkspace(updatedWorkspace, {
    id: 'default',
    updatedAt: now
  });

  await persistFn(trimmedId, savedWorkspace);

  return {
    success: true,
    removedApplicationIdentity: matchingApplication,
    workspace: updatedWorkspace,
    savedWorkspace
  };
}
