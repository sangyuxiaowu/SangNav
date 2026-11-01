import { UUID, sha256, type ResourceBaseline, type Upload } from './cloudProtocol';

let database: Promise<IDBDatabase> | undefined;
function openCache() {
  return database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('sangnav_cloud_cache', 1);
    request.onupgradeneeded = () => {
      for (const name of ['baselines', 'attachments']) request.result.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(request.error); };
  });
}

export async function cacheRead<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheWrite(store: string, key: string, value: unknown) {
  const db = await openCache();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    if (value === undefined) transaction.objectStore(store).delete(key);
    else transaction.objectStore(store).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('本地缓存事务已取消。'));
  });
}

const pendingLocks = new Map<string, Promise<unknown>>();
export async function withCloudLock<T>(scope: string, action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request(`sangnav:${scope}`, action);
  const previous = pendingLocks.get(scope) || Promise.resolve();
  const next = previous.catch(() => {}).then(action);
  pendingLocks.set(scope, next);
  try { return await next; }
  finally { if (pendingLocks.get(scope) === next) pendingLocks.delete(scope); }
}

export function cacheScope(url: string, userId: string) { return `${url}:${userId}:resources-v2:all`; }

export async function readBaseline(scope: string): Promise<ResourceBaseline | undefined> {
  const value = await cacheRead<ResourceBaseline>('baselines', scope);
  if (!value || !(value.records instanceof Map) || !(value.blocked instanceof Set) || value.storeRevision !== undefined && !/^\d+$/.test(value.storeRevision) || !Number.isFinite(value.checkedAt)) return undefined;
  if ([...value.records].some(([key, record]) => typeof key !== 'string' || !record || !UUID.test(record.id) || !Number.isSafeInteger(record.version) || record.version < 1 || record.content === undefined)) return undefined;
  return value;
}

export async function cachedAttachment(scope: string, image: Upload, download: () => Promise<ArrayBuffer>) {
  const key = `${scope}:${image.id}:${image.sha256}`;
  let bytes = await cacheRead<ArrayBuffer>('attachments', key).catch(() => undefined);
  const valid = async (value: ArrayBuffer) => value.byteLength === image.size && await sha256(new Uint8Array(value)) === image.sha256;
  if (!bytes || !await valid(bytes)) {
    bytes = await download();
    if (!await valid(bytes)) throw new Error('壁纸下载大小或 SHA-256 校验失败。');
    await cacheWrite('attachments', key, bytes);
  }
  return bytes;
}

let channel: BroadcastChannel | undefined;
export function cloudChannel() {
  if (typeof document !== 'undefined' && typeof BroadcastChannel !== 'undefined') channel ??= new BroadcastChannel('sangnav-cloud-v2');
  return channel;
}