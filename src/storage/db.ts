import Dexie, { type EntityTable } from 'dexie';
import type { SavedProject } from '../domain/types';
import { DB_NAME } from './config';
import {
  prepareSavedProjectForRead,
  type SavedProjectReadResult
} from './projectMigration';

const db = new Dexie(DB_NAME) as Dexie & {
  projects: EntityTable<SavedProject, 'id'>;
};

db.version(1).stores({ projects: 'id, updatedAt' });

export async function saveProject(project: SavedProject): Promise<void> {
  await db.projects.put(project);
}

export async function loadProject(id = 'default'): Promise<SavedProjectReadResult | undefined> {
  const project = await db.projects.get(id);
  return project ? prepareSavedProjectForRead(project) : undefined;
}

export async function deleteProject(id = 'default'): Promise<void> {
  await db.projects.delete(id);
}
