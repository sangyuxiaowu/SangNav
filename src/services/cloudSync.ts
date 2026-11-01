import { semanticJson, transactionGroup, type Documents } from './cloudResources';
import { byteSize, prepareResource, type Capabilities, type Client, type StoredResource, type Upload } from './cloudProtocol';

export type Change = { key: string; id: string; expectedVersion: number | null; deleted: boolean; content?: unknown };

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

export function planBatches(changes: Change[], caps: Capabilities) {
  const groups = new Map<string, Change[]>();
  for (const change of changes) {
    const group = transactionGroup(change.key);
    groups.set(group, [...groups.get(group) || [], change]);
  }
  const batches: Change[][] = [];
  let batch: Change[] = [];
  const max = Math.min(50, caps.limits.commitOperations);
  for (const group of groups.values()) {
    if (group.length > max) throw new Error(`关联变更超过单批 ${max} 项，不能保证原子性。请分次修改或导出备份后减少本次变更。`);
    if (batch.length + group.length > max) { batches.push(batch); batch = []; }
    batch.push(...group);
  }
  if (batch.length) batches.push(batch);
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
  const result = await client<{ items: { id: string; version: number; deleted: boolean }[] }>('/commits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  if (!Array.isArray(result?.items) || result.items.length !== changes.length) throw new Error('批量保存响应无效，请核实云端状态。');
  for (const [index, item] of result.items.entries()) {
    const change = changes[index];
    if (item.id !== change.id || item.deleted !== change.deleted || item.version !== (change.expectedVersion ?? 0) + 1) throw new Error('批量保存版本无效，请核实云端状态。');
  }
  return result.items;
}