import { DEFAULT_ROUTE_ID, isRegisteredRouteId } from '../content/registry';
import type { SavedProject } from './types';
import type { ApplicationIdentity, Workspace } from './workspace';

export type CreateApplicationIdentityResult =
  | { success: true; application: ApplicationIdentity }
  | { success: false; error: string };

export type UpsertApplicationIdentityResult =
  | { success: true; workspace: Workspace }
  | { success: false; error: string };

export function createApplicationIdentityFromSavedProject(
  project: SavedProject,
  applicantPersonId: string
): CreateApplicationIdentityResult {
  if (!project || typeof project !== 'object') {
    return { success: false, error: 'SavedProject must be a valid object.' };
  }

  if (typeof project.id !== 'string' || project.id.trim() === '') {
    return { success: false, error: 'SavedProject must have a valid non-empty id.' };
  }

  if (typeof applicantPersonId !== 'string' || applicantPersonId.trim() === '') {
    return { success: false, error: 'applicantPersonId must be a valid non-empty string.' };
  }

  const rawRouteId = project.routeId;
  let normalizedRouteId: string;

  if (rawRouteId === undefined) {
    normalizedRouteId = DEFAULT_ROUTE_ID;
  } else if (typeof rawRouteId === 'string' && rawRouteId.trim() !== '') {
    if (!isRegisteredRouteId(rawRouteId)) {
      return { success: false, error: `Unknown or unregistered routeId: "${rawRouteId}".` };
    }
    normalizedRouteId = rawRouteId;
  } else {
    return { success: false, error: `Invalid routeId format in SavedProject: ${String(rawRouteId)}.` };
  }

  return {
    success: true,
    application: {
      applicationId: project.id,
      applicantPersonId,
      routeId: normalizedRouteId
    }
  };
}

export function upsertApplicationIdentity(
  workspace: Workspace,
  application: ApplicationIdentity
): UpsertApplicationIdentityResult {
  if (!workspace || typeof workspace !== 'object') {
    return { success: false, error: 'Workspace must be a valid object.' };
  }

  if (!application || typeof application !== 'object') {
    return { success: false, error: 'ApplicationIdentity must be a valid object.' };
  }

  const personExists = workspace.people.some((p) => p.personId === application.applicantPersonId);
  if (!personExists) {
    return {
      success: false,
      error: `Applicant person "${application.applicantPersonId}" does not exist in workspace.`
    };
  }

  const existingIndex = workspace.applications.findIndex(
    (app) => app.applicationId === application.applicationId
  );

  let newApplications: ApplicationIdentity[];
  if (existingIndex >= 0) {
    newApplications = workspace.applications.map((app, idx) =>
      idx === existingIndex ? application : app
    );
  } else {
    newApplications = [...workspace.applications, application];
  }

  return {
    success: true,
    workspace: {
      people: workspace.people,
      relationships: workspace.relationships,
      applications: newApplications
    }
  };
}
