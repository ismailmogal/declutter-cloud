import { get, set } from 'idb-keyval';

const SESSION_KEY = 'decluttercloud_session_id';

function getSessionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('session_id');
}

export async function getSessionId(): Promise<string> {
  // Check URL first
  const urlSessionId = getSessionIdFromUrl();
  if (urlSessionId) {
    await set(SESSION_KEY, urlSessionId);
    console.log('[DEBUG] Using sessionId from URL:', urlSessionId);
    return urlSessionId;
  }
  // Fallback to IndexedDB
  let sessionId = await get(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    await set(SESSION_KEY, sessionId);
    console.log('[DEBUG] Generated new sessionId:', sessionId);
  } else {
    console.log('[DEBUG] Loaded sessionId from IDB:', sessionId);
  }
  return sessionId;
} 