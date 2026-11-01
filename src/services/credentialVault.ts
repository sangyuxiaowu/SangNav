export interface RememberedAccount {
  workspaceUrl: string;
  username: string;
  password: string;
  session: { accessToken: string; expiresAt: string; resourceUserId: string; workspaceId: string };
}

type VaultEntry = { key: CryptoKey; iv: Uint8Array; ciphertext: ArrayBuffer };
const DATABASE = 'sangnav_account_vault';

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('vault'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function access<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('vault', mode);
      const request = action(transaction.objectStore('vault'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('账户存储事务已中止。'));
    });
  } finally { db.close(); }
}

export async function rememberAccount(account: RememberedAccount) {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(account)));
  await access('readwrite', store => store.put({ key, iv, ciphertext } satisfies VaultEntry, 'account'));
}

export async function recallAccount(): Promise<RememberedAccount | null> {
  const entry = await access<VaultEntry | undefined>('readonly', store => store.get('account'));
  if (!entry) return null;
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(entry.iv) }, entry.key, entry.ciphertext);
  const account = JSON.parse(new TextDecoder().decode(plaintext)) as RememberedAccount;
  if (typeof account.workspaceUrl !== 'string' || typeof account.username !== 'string' || typeof account.password !== 'string' || !account.session || typeof account.session.accessToken !== 'string') {
    throw new Error('保存的账户无效，请重新登录。');
  }
  return account;
}

export async function forgetAccount() {
  await access('readwrite', store => store.delete('account'));
}