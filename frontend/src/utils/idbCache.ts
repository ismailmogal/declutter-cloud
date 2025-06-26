import { get, set, del, clear } from 'idb-keyval';
import { openDB, IDBPDatabase } from 'idb';

// Cache for files/folders by folder id (or 'root')
export async function cacheFiles(folderId: string, files: any[], db?: IDBPDatabase<any>) {
  await set(`files_${folderId || 'root'}`, files, db);
}

export async function getCachedFiles(folderId: string, db?: IDBPDatabase<any>): Promise<any[]> {
  const result = await get(`files_${folderId || 'root'}`, db);
  return Array.isArray(result) ? result : [];
}

export async function clearFilesCache(folderId?: string, db: IDBPDatabase<any> = null) {
  if (folderId) {
    await del(`files_${folderId}`, db);
  } else {
    // Clear all files cache
    await clear(db);
  }
}

// Cache for UI state (e.g., breadcrumbs, selected folders)
export async function cacheUIState(key: string, value: any, db: IDBPDatabase<any>) {
  await set(`ui_${key}`, value, db);
}

export async function getCachedUIState(key: string, db: IDBPDatabase<any>): Promise<any | null> {
  return await get(`ui_${key}`, db);
}

export async function clearUICache(key?: string, db: IDBPDatabase<any> = null) {
  if (key) {
    await del(`ui_${key}`, db);
  } else {
    await clear(db);
  }
} 