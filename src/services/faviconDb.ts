const DB_NAME = 'novanav_favicons_db';
const STORE_NAME = 'favicons';

let dbPromise: Promise<IDBDatabase> | null = null;
const requests = new Map<string, Promise<Blob | null>>();

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

function readBlob(db: IDBDatabase, source: string): Promise<Blob | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(source);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function writeBlob(db: IDBDatabase, source: string, blob?: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    if (blob) store.put(blob, source);
    else store.delete(source);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function getCachedFavicon(source: string): Promise<Blob | null> {
  const existing = requests.get(source);
  if (existing) return existing;

  const request = Promise.resolve().then(async () => {
    try {
      const db = await getDb();
      const cached = await readBlob(db, source);
      if (cached) return cached;

      const response = await fetch(source, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) throw new Error(`Favicon HTTP ${response.status}`);
      const blob = await response.blob();
      if (!blob.size) throw new Error('Empty favicon');

      const objectUrl = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      if (requests.get(source) !== request) return null;
      await writeBlob(db, source, blob);
      return blob;
    } catch (error) {
      console.warn('Failed to cache favicon:', source, error);
      return null;
    }
  });
  requests.set(source, request);
  return request;
}

export async function deleteCachedFavicon(source: string): Promise<void> {
  requests.delete(source);
  try {
    await writeBlob(await getDb(), source);
  } catch (error) {
    console.warn('Failed to delete cached favicon:', error);
  }
}