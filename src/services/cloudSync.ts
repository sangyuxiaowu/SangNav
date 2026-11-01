import { semanticJson, transactionGroup, type Documents } from './cloudResources';
import { byteSize, prepareResource, type Capabilities, type Client, type StoredResource, type Upload } from './cloudProtocol';

export type Change = { key: string; id: string; expectedVersion: number | null; deleted: boolean; content?: unknown };

export class CommitResultUnconfirmed extends Error {
  constructor(public cause: unknown) { super('结果待确认：提交可能已成功，已保留完整草稿与计划；请先核实云端状态，不要直接重放。'); }
}

export function diffDocuments(desired: Documents, records: Map<string, StoredResource>, identities: Map<string, string>): Change[] {
  const changes: Change[] = [];
  for (const key of new Set([...records.keys(), ...desired.keys()])) {
    const stored = records.get(key);
    const deleted = !desired.has(key);
    if (stored && !deleted && semanticJson(stored.content) === semanticJson(desired.get(key))) continue;
    if (!stored && deleted) continue;
    let id = stored?.id || identities.get(key);
    if (!id) { id = crypto.randomUUID(); identities.set(key, id); }
    changes.push({ key, id, expectedVersion: stored?.version ?? null, deleted, content: desired.get(key) });
  }
  return changes;
}

export function planBatches(changes: Change[], caps: Capabilities, atomicPublish = false) {
  const groups = new Map<string, Change[]>();
  for (const change of changes) {
    const group = transactionGroup(change.key);
    groups.set(group, [...groups.get(group) || [], change]);
  }
  const batches: Change[][] = [];
  let batch: Change[] = [];
  const max = caps.limits.commitOperations;
  const limitAdvice = caps.features.includes('commits.staged')
    ? '当前连接已支持暂存提交，请改用暂存提交完成分批上传和一次原子发布。'
    : '当前连接未声明 commits.staged 能力，请重新连接以刷新能力信息；未发送任何部分提交。';
  if (atomicPublish && changes.length > max) throw new Error(`本次完整同步需要 ${changes.length} 项，超过普通单次原子提交上限 ${max} 项。完整本地数据与待同步计划已保留；${limitAdvice}`);
  for (const group of groups.values()) {
    if (group.length > max) throw new Error(`关联变更需要 ${group.length} 项，超过普通提交上限 ${max} 项，拆开普通提交不能保证原子性。完整本地数据与待同步计划已保留；${limitAdvice}`);
    if (batch.length + group.length > max) { batches.push(batch); batch = []; }
    batch.push(...group);
  }
  if (batch.length) batches.push(batch);
  if (atomicPublish && changes.length) return [changes];
  return batches;
}

export async function saveBatch(changes: Change[], client: Client, caps: Capabilities, uploads: Map<string, Upload>, onUpload: () => void) {
  const operations = [];
  for (const change of changes) {
    const resource = change.deleted ? undefined : await prepareResource(change.key, change.content, client, caps, uploads);
    onUpload();
    operations.push({ action: change.deleted ? 'delete' : 'put', id: change.id, expectedVersion: change.expectedVersion, resource });
  }
  const body = JSON.stringify({ operations });
  if (byteSize({ operations }) > caps.limits.requestBytes) throw new Error('批量请求超过服务端大小限制，已保留草稿，请减少本次变更。');
  let result: { items: { id: string; version: number; deleted: boolean }[] };
  try {
    result = await client('/commits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    if (typeof status !== 'number' || status >= 500) throw new CommitResultUnconfirmed(error);
    throw error;
  }
  if (!Array.isArray(result?.items) || result.items.length !== changes.length) throw new CommitResultUnconfirmed(new Error('批量保存响应无效。'));
  for (const [index, item] of result.items.entries()) {
    const change = changes[index];
    if (item.id !== change.id || item.deleted !== change.deleted || item.version !== (change.expectedVersion ?? 0) + 1) throw new CommitResultUnconfirmed(new Error('批量保存版本无效。'));
  }
  return result.items;
}