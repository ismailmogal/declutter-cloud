import { openDB } from 'idb';

const DB_NAME = 'onedrive-cache';
const STORE_NAME = 'folderFiles';

export async function getCacheKey(userId: string, folderId: string, depth: number) {
  return `${userId}:${folderId}:${depth}`;
}

export async function getCachedFiles(userId: string, folderId: string, depth: number) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  const key = await getCacheKey(userId, folderId, depth);
  return db.get(STORE_NAME, key);
}

export async function setCachedFiles(userId: string, folderId: string, depth: number, files: any[], meta: any = {}) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  const key = await getCacheKey(userId, folderId, depth);
  return db.put(STORE_NAME, { files, meta, timestamp: Date.now() }, key);
}

export async function clearCacheForFolder(userId: string, folderId: string, depth: number) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  const key = await getCacheKey(userId, folderId, depth);
  return db.delete(STORE_NAME, key);
} 