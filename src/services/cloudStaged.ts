import { prepareResource, sha256, stagedLimits, UUID, validateStoreRevision, type Capabilities, type Client, type Upload } from './cloudProtocol';
import { CommitResultUnconfirmed, type Change } from './cloudSync';

export type CommitItem = { id: string; version: number; deleted: boolean };
export type StagedPlan = { schemaVersion: 1; commitId: string; operationCount: number; batches: string[]; changes: Change[]; baseStoreRevision?: string; started?: boolean };
type SessionState = { commitId: string; state: 'open' | 'published' | 'cancelled' | 'expired'; operationCount: number; batchCount: number; baseStoreRevision: string | null; resultCount: number; storeRevision: string | null; expiresAt: string; retainUntil: string | null; batches: { index: number; operationCount: number; sha256: string }[] };

export class StagedSessionUnavailable extends Error {
  constructor(public status: number) { super('暂存会话已过期、不可访问或回执已回收；不能据此认定未发布。已保留原提交标识和完整计划，请核对云端或人工恢复。'); }
}

function statusOf(error: unknown) { return error && typeof error === 'object' && 'status' in error ? error.status : undefined; }
const size = (text: string) => new TextEncoder().encode(text).byteLength;
const hash = (text: string) => sha256(new TextEncoder().encode(text));

export async function buildStagedPlan(changes: Change[], client: Client, caps: Capabilities, uploads: Map<string, Upload>, onUpload: () => void, baseStoreRevision?: string): Promise<StagedPlan> {
  const limits = stagedLimits(caps);
  if (!changes.length || changes.length > limits.stagedCommitOperations || new Set(changes.map(change => change.id)).size !== changes.length) throw new Error('暂存提交项数超限或资源 ID 重复；完整数据与计划仍保留。');
  if (baseStoreRevision !== undefined) validateStoreRevision(baseStoreRevision);
  const batches: string[] = [];
  const maxBytes = Math.min(limits.stagedBatchBytes, caps.limits.requestBytes);
  let current: unknown[] = [];
  for (const change of changes) {
    const resource = change.deleted ? undefined : await prepareResource(change.key, change.content, client, caps, uploads);
    onUpload();
    const operation = { action: change.deleted ? 'delete' : 'put', id: change.id, expectedVersion: change.expectedVersion, resource };
    if (current.length && (current.length + 1 > limits.stagedBatchOperations || size(JSON.stringify({ operations: [...current, operation] })) > maxBytes)) {
      batches.push(JSON.stringify({ operations: current }));
      current = [];
    }
    current.push(operation);
    if (current.length > limits.stagedBatchOperations || size(JSON.stringify({ operations: current })) > maxBytes) throw new Error('单项资源超过暂存批次大小限制，已保留完整本地数据。');
  }
  if (current.length) batches.push(JSON.stringify({ operations: current }));
  if (batches.length > limits.stagedBatchCount || batches.reduce((total, batch) => total + size(batch), 0) > limits.stagedCommitBytes) throw new Error('完整关联组超过暂存总配额，不能拆成多次发布；完整本地数据已保留。');
  return { schemaVersion: 1, commitId: crypto.randomUUID(), operationCount: changes.length, batches, changes: structuredClone(changes), ...(baseStoreRevision === undefined ? {} : { baseStoreRevision }) };
}

export function validateStagedPlan(input: StagedPlan): StagedPlan {
  if (input?.schemaVersion !== 1 || !UUID.test(input.commitId) || !Array.isArray(input.changes) || !input.changes.length || input.operationCount !== input.changes.length || !Array.isArray(input.batches) || !input.batches.length) throw new Error('本地暂存计划无效，不能替换提交标识或强行重传。');
  if (input.baseStoreRevision !== undefined) validateStoreRevision(input.baseStoreRevision);
  const operations: { action: string; id: string; expectedVersion: number | null }[] = [];
  for (const batch of input.batches) {
    if (typeof batch !== 'string') throw new Error('原始暂存批次正文缺失。');
    const parsed = JSON.parse(batch);
    if (!Array.isArray(parsed.operations) || !parsed.operations.length) throw new Error('原始暂存批次正文无效。');
    operations.push(...parsed.operations);
  }
  if (operations.length !== input.operationCount || new Set(operations.map(item => item.id)).size !== operations.length) throw new Error('暂存计划计数或资源标识不一致。');
  for (const [index, item] of operations.entries()) {
    const change = input.changes[index];
    if (!change || !UUID.test(item.id) || item.id !== change.id || item.action !== (change.deleted ? 'delete' : 'put') || item.expectedVersion !== change.expectedVersion || (item.expectedVersion !== null && (!Number.isSafeInteger(item.expectedVersion) || item.expectedVersion < 1))) throw new Error('暂存计划与原始操作不一致。');
  }
  return input;
}

function validateSession(state: SessionState, plan: StagedPlan) {
  if (!state || state.commitId !== plan.commitId || !['open', 'published', 'cancelled', 'expired'].includes(state.state) || state.operationCount !== plan.operationCount || state.batchCount !== plan.batches.length || (state.baseStoreRevision ?? null) !== (plan.baseStoreRevision ?? null) || !Array.isArray(state.batches)) throw new Error('暂存会话身份或声明不匹配。');
}

async function collectResults(client: Client, plan: StagedPlan, count: number, caps: Capabilities) {
  if (count !== plan.operationCount) throw new Error('发布回执项数不匹配。');
  const items: CommitItem[] = [];
  const pageSize = Math.min(100, caps.limits.pageSize);
  for (let page = 1; items.length < count; page++) {
    const result = await client<{ items: CommitItem[]; pageNumber: number; pageSize: number; total: number }>(`/commit-sessions/${plan.commitId}/results?page=${page}&pageSize=${pageSize}`);
    if (result?.total !== count || result.pageNumber !== page || result.pageSize !== pageSize || !Array.isArray(result.items) || !result.items.length || result.items.length > pageSize || items.length + result.items.length > count) throw new Error('发布回执分页不完整。');
    for (const item of result.items) {
      const change = plan.changes[items.length];
      if (item.id !== change.id || item.deleted !== change.deleted || item.version !== (change.expectedVersion ?? 0) + 1) throw new Error('发布回执 ID、顺序或版本不一致。');
      items.push(item);
    }
  }
  return items;
}

export async function resumeStagedPlan(plan: StagedPlan, client: Client, caps: Capabilities, checkpoint: () => void | Promise<void>) {
  stagedLimits(caps);
  validateStagedPlan(plan);
  await checkpoint();
  const path = `/commit-sessions/${plan.commitId}`;
  const createSession = !plan.started;
  if (createSession) {
    plan.started = true;
    try { await checkpoint(); }
    catch (error) { plan.started = false; throw error; }
  }
  try {
    if (createSession) {
      await client(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operationCount: plan.operationCount, batchCount: plan.batches.length, ...(plan.baseStoreRevision === undefined ? {} : { baseStoreRevision: plan.baseStoreRevision }) }) });
    }
    const state = await client<SessionState>(path);
    validateSession(state, plan);
    if (state.state === 'cancelled' || state.state === 'expired') throw new StagedSessionUnavailable(state.state === 'expired' ? 410 : 409);
    if (state.state === 'published') {
      validateStoreRevision(state.storeRevision);
      return { items: await collectResults(client, plan, state.resultCount, caps), storeRevision: state.storeRevision! };
    }
    const received = new Map<number, SessionState['batches'][number]>();
    for (const batch of state.batches) {
      if (!Number.isInteger(batch.index) || batch.index < 0 || batch.index >= plan.batches.length || received.has(batch.index) || batch.operationCount !== JSON.parse(plan.batches[batch.index]).operations.length || batch.sha256 !== await hash(plan.batches[batch.index])) throw new Error('服务端暂存批次摘要与原始正文不一致。');
      received.set(batch.index, batch);
    }
    for (const [index, body] of plan.batches.entries()) {
      if (received.has(index)) continue;
      const uploaded = await client<{ index: number; operationCount: number; sha256: string }>(`${path}/batches/${index}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      if (uploaded?.index !== index || uploaded.operationCount !== JSON.parse(body).operations.length || uploaded.sha256 !== await hash(body)) throw new Error('暂存批次上传回执不匹配。');
      await checkpoint();
    }
    const receipt = await client<{ commitId: string; state: string; storeRevision: string; resultCount: number }>(`${path}/publish`, { method: 'POST' });
    if (receipt?.commitId !== plan.commitId || receipt.state !== 'published') throw new Error('暂存发布结果尚未确认。');
    validateStoreRevision(receipt.storeRevision);
    return { items: await collectResults(client, plan, receipt.resultCount, caps), storeRevision: receipt.storeRevision };
  } catch (error) {
    const status = statusOf(error);
    if (status === 404 || status === 410) throw new StagedSessionUnavailable(status);
    if (error instanceof StagedSessionUnavailable || (typeof status === 'number' && status >= 400 && status < 500)) throw error;
    throw new CommitResultUnconfirmed(error);
  }
}

export async function cancelStagedPlan(plan: StagedPlan, client: Client) {
  if (!plan.started) return;
  let state: SessionState;
  try { state = await client<SessionState>(`/commit-sessions/${plan.commitId}`); }
  catch (error) { if (statusOf(error) === 410) return; throw error; }
  validateSession(state, plan);
  if (state.state === 'published') throw new Error('该暂存计划已经发布，请先核实发布回执，不能取消。');
  if (state.state === 'open') await client(`/commit-sessions/${plan.commitId}`, { method: 'DELETE' });
}

let database: Promise<IDBDatabase> | null = null;
async function draftStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open('sangnav_cloud_sync', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('drafts'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
  const db = await database;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts', mode);
    const request = action(transaction.objectStore('drafts'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('暂存草稿持久化事务中止，未发送提交。'));
  });
}

export function saveStagedDraft(key: string, value: unknown) {
  const copy = structuredClone(value);
  return draftStore('readwrite', store => store.put(copy, key));
}
export function readStagedDraft<T>(key: string) { return draftStore<T | undefined>('readonly', store => store.get(key)); }
export function deleteStagedDraft(key: string) { return draftStore('readwrite', store => store.delete(key)); }