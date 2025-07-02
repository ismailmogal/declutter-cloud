import { get, set, del, clear } from 'idb-keyval';
import { openDB } from 'idb';

// Cache for files/folders by folder id (or 'root')
export async function cacheFiles(folderId: string, files: any[], store?: any) {
  await set(`files_${folderId || 'root'}`, files, store);
}

export async function getCachedFiles(folderId: string, store?: any): Promise<any[]> {
  const result = await get(`files_${folderId || 'root'}`, store);
  return Array.isArray(result) ? result : [];
}

export async function clearFilesCache(folderId?: string, store?: any) {
  if (folderId) {
    await del(`files_${folderId}`, store);
  } else {
    // Clear all files cache
    await clear(store);
  }
}

// Cache for UI state (e.g., breadcrumbs, selected folders)
export async function cacheUIState(key: string, value: any, store?: any) {
  await set(`ui_${key}`, value, store);
}

export async function getCachedUIState(key: string, store?: any): Promise<any | null> {
  return await get(`ui_${key}`, store);
}

export async function clearUICache(key?: string, store?: any) {
  if (key) {
    await del(`ui_${key}`, store);
  } else {
    await clear(store);
  }
}

// Store token in both localStorage and IDB
export function storeToken(token: string) {
  localStorage.setItem('token', token);
  set('token', token);
} 