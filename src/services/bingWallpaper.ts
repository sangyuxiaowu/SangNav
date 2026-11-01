export const BING_WALLPAPER_URL = 'https://uapis.cn/api/v1/image/bing-daily';

export interface BingWallpaper {
  date: string;
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let pending: Promise<BingWallpaper> | null = null;

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sangnav_wallpaper_db', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('wallpapers');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export async function readBingWallpaper(): Promise<BingWallpaper | undefined> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('wallpapers', 'readonly');
    const request = transaction.objectStore('wallpapers').get('bing');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function refreshBingWallpaper(now = new Date()): Promise<BingWallpaper> {
  if (pending) return pending;
  pending = (async () => {
    const date = localDate(now);
    const cached = await readBingWallpaper();
    if (cached && cached.date >= date) return cached;

    const response = await fetch(`${BING_WALLPAPER_URL}?date=${date}`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Wallpaper HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('Empty wallpaper');
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }

    const wallpaper = { date, blob };
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('wallpapers', 'readwrite');
      transaction.objectStore('wallpapers').put(wallpaper, 'bing');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return wallpaper;
  })().finally(() => { pending = null; });
  return pending;
}