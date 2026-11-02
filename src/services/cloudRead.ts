import { byteSize, UUID, validateStoreRevision, type Capabilities, type Client, type Resource } from './cloudProtocol';
import { isManagedKey, RESOURCE_FORMAT } from './cloudResources';

export type ReadItem = { id: string; version?: number };
type ResourceChange = { id: string; key: string; format: string; version: number; deleted: boolean; storeRevision: string };

export function validateReadCapabilities(caps: Capabilities) {
  if (caps.features.includes('resources.batch-read')) {
    const batch = caps.resourceBatchRead;
    if (!batch || [batch.items, batch.requestBytes, batch.responseBytes].some(value => !Number.isSafeInteger(value) || value < 1) ||
        batch.immutableVersions !== true || batch.missingItems !== 'per-item-not_found' || batch.continuation !== 'resubmit-items-from-nextOffset') {
      throw new Error('批量读取能力或限额无效。');
    }
  }
  if (caps.features.includes('resources.changes')) {
    const changes = caps.resourceChanges;
    if (!changes || [changes.pageItems, changes.pageBytes, changes.cursorHours, changes.retentionDays].some(value => !Number.isSafeInteger(value) || value < 1) ||
        changes.scope !== 'workspace' || changes.coalesced !== true || changes.tombstones !== true || changes.fixedTarget !== true || changes.content !== 'batch-read-by-id-and-version') {
      throw new Error('资源增量能力或限额无效。');
    }
  }
}

export async function readBodies(client: Client, caps: Capabilities, items: ReadItem[]): Promise<Map<string, Resource>> {
  const resources = new Map<string, Resource>();
  const single = async (item: ReadItem) => {
    const path = `/resources/${item.id}${item.version === undefined ? '' : `/revisions/${item.version}`}`;
    resources.set(item.id, await client<Resource>(path));
  };
  if (!caps.features.includes('resources.batch-read')) {
    for (let offset = 0; offset < items.length; offset += 6) await Promise.all(items.slice(offset, offset + 6).map(single));
    return resources;
  }
  validateReadCapabilities(caps);
  const limits = caps.resourceBatchRead!;
  const maxBytes = Math.min(limits.requestBytes, caps.limits.requestBytes);
  type Batch = { items: { id: string; requestedVersion: number | null; status: string; resource: Resource | null }[]; nextOffset: number | null };
  const readBatch = async (input: ReadItem[]): Promise<void> => {
    let remaining = input;
    while (remaining.length) {
      let result: Batch;
      try {
        result = await client<Batch>('/resources/batch-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: remaining }) });
      } catch (error) {
        if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 413) throw error;
        if (remaining.length === 1) await single(remaining[0]);
        else {
          const middle = Math.ceil(remaining.length / 2);
          await readBatch(remaining.slice(0, middle));
          await readBatch(remaining.slice(middle));
        }
        return;
      }
      if (!Array.isArray(result?.items) || !result.items.length || result.items.length > remaining.length || byteSize(result) > limits.responseBytes ||
          (result.nextOffset === null ? result.items.length !== remaining.length : result.nextOffset !== result.items.length || result.nextOffset >= remaining.length)) {
        throw new Error('批量正文响应或续读偏移无效。');
      }
      for (const [index, item] of result.items.entries()) {
        const expected = remaining[index];
        if (item?.id !== expected.id || item.requestedVersion !== (expected.version ?? null) || item.status !== 'ok' || !item.resource ||
            item.resource.summary?.id !== expected.id || (expected.version !== undefined && item.resource.summary.version !== expected.version)) {
          throw new Error('批量正文缺失或版本不匹配，已保留原同步基线。');
        }
        resources.set(expected.id, item.resource);
      }
      if (result.nextOffset === null) break;
      remaining = remaining.slice(result.nextOffset);
    }
  };
  let batch: ReadItem[] = [];
  for (const item of items) {
    if (batch.length && (batch.length >= limits.items || byteSize({ items: [...batch, item] }) > maxBytes)) {
      await readBatch(batch);
      batch = [];
    }
    if (byteSize({ items: [item] }) > maxBytes) await single(item);
    else batch.push(item);
  }
  if (batch.length) await readBatch(batch);
  return resources;
}

export async function readDelta(client: Client, caps: Capabilities, sinceRevision: string) {
  validateReadCapabilities(caps);
  const limits = caps.resourceChanges!;
  const changes = new Map<string, ResourceChange>();
  const cursors = new Set<string>();
  let path: string | null = `/resources/changes?sinceRevision=${encodeURIComponent(sinceRevision)}&limit=${limits.pageItems}`;
  let targetRevision: string | undefined;
  while (path !== null) {
    const page: { sinceRevision: string; targetRevision: string; items: ResourceChange[]; nextCursor: string | null } = await client(path);
    const target = validateStoreRevision(page?.targetRevision);
    if (page.sinceRevision !== sinceRevision || BigInt(target) < BigInt(sinceRevision) || (targetRevision !== undefined && targetRevision !== target) ||
        !Array.isArray(page.items) || page.items.length > limits.pageItems || byteSize(page) > limits.pageBytes ||
        (page.nextCursor !== null && (typeof page.nextCursor !== 'string' || !page.nextCursor || cursors.has(page.nextCursor)))) {
      throw new Error('资源增量区间或游标无效。');
    }
    targetRevision = target;
    for (const item of page.items) {
      if (!item || !UUID.test(item.id) || changes.has(item.id) || typeof item.key !== 'string' || !item.key || typeof item.format !== 'string' || !item.format ||
          !Number.isSafeInteger(item.version) || item.version < 1 || typeof item.deleted !== 'boolean' ||
          BigInt(validateStoreRevision(item.storeRevision)) <= BigInt(sinceRevision) || BigInt(item.storeRevision) > BigInt(target)) {
        throw new Error('资源增量条目无效或重复。');
      }
      changes.set(item.id, item);
    }
    if (page.nextCursor !== null) cursors.add(page.nextCursor);
    path = page.nextCursor === null ? null : `/resources/changes?cursor=${encodeURIComponent(page.nextCursor)}`;
  }
  const wanted = [...changes.values()].filter(item => !item.deleted && isManagedKey(item.key) && item.format === RESOURCE_FORMAT);
  const bodies = await readBodies(client, caps, wanted.map(({ id, version }) => ({ id, version })));
  for (const expected of wanted) {
    const summary = bodies.get(expected.id)?.summary;
    if (summary?.id !== expected.id || summary.version !== expected.version || summary.key !== expected.key || summary.format !== expected.format) {
      throw new Error('资源增量历史正文不匹配。');
    }
  }
  return { changes, bodies, targetRevision: targetRevision! };
}