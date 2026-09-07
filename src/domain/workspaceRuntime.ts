import { DEFAULT_ROUTE_ID, isRegisteredRouteId } from '../content/registry';
import {
  loadProject,
  loadWorkspace
} from '../storage/db';
import type { SavedProjectReadResult } from '../storage/projectMigration';
import type { SavedProject } from './types';
import type { ApplicationIdentity } from './workspace';
import type { SavedWorkspaceReadResult } from './workspacePersistence';

export type ResolveWorkspaceApplicationResult =
  | {
      readonly success: true;
      readonly applicationIdentity: ApplicationIdentity;
      readonly project: SavedProject;
    }
  | {
      readonly success: false;
      readonly error: string;
    };

export async function loadDefaultWorkspace(
  loader: (id?: string) => Promise<SavedWorkspaceReadResult> = loadWorkspace
): Promise<SavedWorkspaceReadResult> {
  return loader('default');
}

export async function resolveWorkspaceApplication(
  applicationIdentity: ApplicationIdentity,
  loader: (id: string) => Promise<SavedProjectReadResult | undefined> = loadProject
): Promise<ResolveWorkspaceApplicationResult> {
  if (!applicationIdentity || typeof applicationIdentity !== 'object') {
    return { success: false, error: 'ApplicationIdentity must be a valid object.' };
  }

  const { applicationId, routeId } = applicationIdentity;
  if (typeof applicationId !== 'string' || applicationId.trim() === '') {
    return { success: false, error: 'ApplicationIdentity must have a non-empty applicationId.' };
  }
  if (typeof routeId !== 'string' || routeId.trim() === '') {
    return { success: false, error: 'ApplicationIdentity must have a non-empty routeId.' };
  }

  const readResult = await loader(applicationId);
  if (!readResult) {
    return {
      success: false,
      error: `SavedProject with id "${applicationId}" was not found.`
    };
  }

  if (readResult.kind === 'future') {
    return {
      success: false,
      error: `SavedProject with id "${applicationId}" has an unsupported future schema version (${readResult.schemaVersion}).`
    };
  }

  if (readResult.kind === 'unknown_route') {
    return {
      success: false,
      error: `SavedProject "${applicationId}" specifies unknown or unregistered routeId "${readResult.routeId}".`
    };
  }

  if (readResult.kind === 'invalid') {
    return {
      success: false,
      error: `SavedProject with id "${applicationId}" is invalid.`
    };
  }

  const project = readResult.project;
  const resolvedProjectRouteId = project.routeId;

  if (resolvedProjectRouteId !== routeId) {
    return {
      success: false,
      error: `Route mismatch for application "${applicationId}": ApplicationIdentity specifies "${routeId}" but SavedProject resolved to "${resolvedProjectRouteId}".`
    };
  }

  return {
    success: true,
    applicationIdentity,
    project
  };
}
