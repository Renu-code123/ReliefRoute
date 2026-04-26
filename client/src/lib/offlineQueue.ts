export const DB_NAME = 'ReliefRouteOfflineDB';
export const DB_VERSION = 1;

export interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
  status: 'pending' | 'processing';
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state', { keyPath: 'key' });
      }
    };
  });
}

// Queue operations
export async function enqueueRequest(url: string, method: string, body: any): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('queue', 'readwrite');
  const store = tx.objectStore('queue');

  const req: OfflineRequest = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
    url,
    method,
    body,
    timestamp: Date.now(),
    status: 'pending'
  };

  store.put(req);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingQueue(): Promise<OfflineRequest[]> {
  const db = await getDB();
  const tx = db.transaction('queue', 'readonly');
  const store = tx.objectStore('queue');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('queue', 'readwrite');
  const store = tx.objectStore('queue');
  store.delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Last-known-good state operations
export async function saveLastKnownState(key: string, data: any): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('state', 'readwrite');
  const store = tx.objectStore('state');
  store.put({ key, data, timestamp: Date.now() });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLastKnownState(key: string): Promise<any | null> {
  const db = await getDB();
  const tx = db.transaction('state', 'readonly');
  const store = tx.objectStore('state');
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ? request.result.data : null);
    request.onerror = () => reject(request.error);
  });
}
