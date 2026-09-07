import Dexie, { type EntityTable } from 'dexie';
import type { SavedProject } from '../domain/types';
import { DB_NAME } from './config';
import {
  prepareSavedProjectForRead,
  type SavedProjectReadResult
} from './projectMigration';
import {
  prepareSavedWorkspaceForRead,
  type SavedWorkspace,
  type SavedWorkspaceReadResult
} from '../domain/workspacePersistence';
import {
  prepareSavedPersonFactProfileForRead,
  type SavedPersonFactProfile,
  type SavedPersonFactProfileReadResult
} from '../domain/personFactsPersistence';

const db = new Dexie(DB_NAME) as Dexie & {
  projects: EntityTable<SavedProject, 'id'>;
  workspaces: EntityTable<SavedWorkspace, 'id'>;
  personFactProfiles: EntityTable<SavedPersonFactProfile, 'personId'>;
};

db.version(1).stores({
  projects: 'id, updatedAt'
});

db.version(2).stores({
  projects: 'id, updatedAt',
  workspaces: 'id, updatedAt'
});

db.version(3).stores({
  projects: 'id, updatedAt',
  workspaces: 'id, updatedAt',
  personFactProfiles: 'personId, updatedAt'
});

export async function saveProject(project: SavedProject): Promise<void> {
  await db.projects.put(project);
}

export async function loadProject(id = 'default'): Promise<SavedProjectReadResult | undefined> {
  const project = await db.projects.get(id);
  return project ? prepareSavedProjectForRead(project) : undefined;
}

export async function loadProjectById(id: string): Promise<SavedProjectReadResult | undefined> {
  return loadProject(id);
}

export async function deleteProject(id = 'default'): Promise<void> {
  await db.projects.delete(id);
}

export async function saveWorkspace(workspace: SavedWorkspace): Promise<void> {
  await db.workspaces.put(workspace);
}

export async function loadWorkspace(id = 'default'): Promise<SavedWorkspaceReadResult> {
  const record = await db.workspaces.get(id);
  return prepareSavedWorkspaceForRead(record);
}

export async function deleteWorkspace(id = 'default'): Promise<void> {
  await db.workspaces.delete(id);
}

export async function createProjectAndWorkspace(
  project: SavedProject,
  workspace: SavedWorkspace
): Promise<void> {
  await db.transaction('rw', db.projects, db.workspaces, async () => {
    await db.projects.add(project);
    await db.workspaces.put(workspace);
  });
}

export async function deleteProjectAndSaveWorkspace(
  projectId: string,
  workspace: SavedWorkspace
): Promise<void> {
  await db.transaction('rw', db.projects, db.workspaces, async () => {
    await db.projects.delete(projectId);
    await db.workspaces.put(workspace);
  });
}

export async function savePersonFactProfile(profile: SavedPersonFactProfile): Promise<void> {
  await db.personFactProfiles.put(profile);
}

export async function loadPersonFactProfile(
  personId: string
): Promise<SavedPersonFactProfileReadResult> {
  const record = await db.personFactProfiles.get(personId);
  return prepareSavedPersonFactProfileForRead(record, personId);
}

export async function deletePersonFactProfile(personId: string): Promise<void> {
  await db.personFactProfiles.delete(personId);
}




