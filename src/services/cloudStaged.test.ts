import assert from 'node:assert/strict';
import { test } from 'node:test';
import 'fake-indexeddb/auto';
import { buildStagedPlan, deleteStagedDraft, readStagedDraft, resumeStagedPlan, saveStagedDraft, StagedSessionUnavailable, type StagedPlan } from './cloudStaged';
import { loadResources, ReadRevisionChanged, sha256, validateCapabilities, type Capabilities, type Client } from './cloudProtocol';
import { CommitResultUnconfirmed, type Change } from './cloudSync';

export const stagedCapabilities: Capabilities = {
  apiVersion: 'v1', features: ['resources.json', 'resources.conditions', 'commits.atomic', 'commits.staged', 'resources.read-fence'],
  authentication: { scheme: 'Bearer', scope: 'workspace' },
  limits: { resourceBytes: 1048576, metadataBytes: 8192, attachmentBytes: 16777216, requestBytes: 20971520, commitOperations: 50, resourceAttachments: 100, pageSize: 17, stagedBatchOperations: 50, stagedBatchBytes: 20971520, stagedCommitOperations: 10000, stagedCommitBytes: 268435456, stagedBatchCount: 1000, stagedOpenSessionsPerAccount: 2, stagedOpenSessionsPerWorkspace: 8, stagedWorkspaceBytes: 536870912, stagedLifetimeSeconds: 86400, stagedReceiptSeconds: 604800 },
  stagedCommits: { idempotencyScope: 'workspace+commitId', batchIdentity: 'sha256-raw-utf8', receiptSeconds: 604800, contentEncoding: 'identity' },
};

function changes(count: number): Change[] {
  return Array.from({ length: count }, (_, index) => ({ key: `links/test-${index}.json`, id: crypto.randomUUID(), expectedVersion: null, deleted: false, content: { id: `test-${index}`, title: '中文数据' } }));
}
function failure(status: number, reason?: string) { return Object.assign(new Error(`HTTP ${status}`), { status, details: { reason } }); }

function stagedServer(plan: StagedPlan, caps = stagedCapabilities) {
  const uploaded = new Map<number, string>();
  const requests: { path: string; method: string; body: BodyInit | null | undefined }[] = [];
  let state = 'open';
  let available = false;
  let publishes = 0;
  let failBatchOnce = -1;
  let failPublish = false;
  let corruptReceipt = false;
  let missingStatus = 0;
  const root = `/commit-sessions/${plan.commitId}`;
  const client: Client = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const method = options.method || 'GET';
    requests.push({ path, method, body: options.body });
    if (path === root && method === 'PUT') {
      assert.deepEqual(JSON.parse(String(options.body)), { operationCount: plan.operationCount, batchCount: plan.batches.length, ...(plan.baseStoreRevision === undefined ? {} : { baseStoreRevision: plan.baseStoreRevision }) });
      available = true;
      return {} as T;
    }
    if (!available || missingStatus) throw failure(missingStatus || 404);
    if (path === root) {
      const batches = [];
      for (const [index, body] of uploaded) batches.push({ index, operationCount: JSON.parse(body).operations.length, sha256: await sha256(new TextEncoder().encode(body)) });
      return { commitId: plan.commitId, state, operationCount: plan.operationCount, batchCount: plan.batches.length, baseStoreRevision: plan.baseStoreRevision ?? null, resultCount: state === 'published' ? plan.operationCount : 0, storeRevision: state === 'published' ? '9007199254740993124' : null, batches } as T;
    }
    if (path.includes('/batches/')) {
      const index = Number(path.split('/').pop());
      assert.equal(options.body, plan.batches[index]);
      if (index === failBatchOnce) { failBatchOnce = -1; throw new TypeError('Connection interrupted'); }
      uploaded.set(index, String(options.body));
      assert.equal(publishes, 0);
      return { index, operationCount: JSON.parse(String(options.body)).operations.length, sha256: await sha256(new TextEncoder().encode(String(options.body))) } as T;
    }
    if (path.endsWith('/publish')) {
      assert.equal(options.body, undefined);
      assert.equal(uploaded.size, plan.batches.length);
      if (state !== 'published') { state = 'published'; publishes++; }
      if (failPublish) { failPublish = false; throw failure(503); }
      return { commitId: plan.commitId, state, resultCount: plan.operationCount, storeRevision: '9007199254740993124' } as T;
    }
    if (path.includes('/results?')) {
      const query = new URLSearchParams(path.split('?')[1]);
      const page = Number(query.get('page'));
      const pageSize = Number(query.get('pageSize'));
      assert.equal(pageSize, caps.limits.pageSize);
      const items = plan.changes.slice((page - 1) * pageSize, page * pageSize).map(change => ({ id: change.id, version: (change.expectedVersion ?? 0) + 1, deleted: change.deleted }));
      if (corruptReceipt && items.length) items[0].id = crypto.randomUUID();
      return { items, total: plan.operationCount, pageNumber: page, pageSize } as T;
    }
    throw new Error('Unexpected request');
  };
  return { client, uploaded, requests, get publishes() { return publishes; }, set failBatch(index: number) { failBatchOnce = index; }, set failPublishOnce(value: boolean) { failPublish = value; }, set badReceipt(value: boolean) { corruptReceipt = value; }, set unavailable(status: number) { missingStatus = status; } };
}

test('staged capabilities and UTF-8 batch/total limits use runtime values', async () => {
  assert.equal(validateCapabilities(stagedCapabilities), stagedCapabilities);
  assert.throws(() => validateCapabilities({ ...stagedCapabilities, limits: { ...stagedCapabilities.limits, stagedBatchOperations: undefined } }));
  const noNetwork: Client = async () => { throw new Error('Planning must not send requests without attachments'); };
  const plan = await buildStagedPlan(changes(123), noNetwork, stagedCapabilities, new Map(), () => {}, '9007199254740993123');
  assert.deepEqual(plan.batches.map(body => JSON.parse(body).operations.length), [50, 50, 23]);
  assert.equal(plan.baseStoreRevision, '9007199254740993123');
  assert(plan.batches.every(body => JSON.parse(body).operations.every((operation: Record<string, unknown>) => operation.action === 'put' && !('type' in operation))));
  const small = { ...stagedCapabilities, limits: { ...stagedCapabilities.limits, stagedBatchBytes: 900 } };
  const sized = await buildStagedPlan(changes(10), noNetwork, small, new Map(), () => {});
  assert(sized.batches.every(body => new TextEncoder().encode(body).byteLength <= 900));
  await assert.rejects(buildStagedPlan(changes(10), noNetwork, { ...small, limits: { ...small.limits, stagedCommitBytes: 100 } }, new Map(), () => {}), /不能拆成多次发布/);
  await assert.rejects(buildStagedPlan(changes(1), noNetwork, { ...small, limits: { ...small.limits, stagedBatchBytes: 20 } }, new Map(), () => {}), /单项资源/);
});

test('123 staged operations persist original bytes and advance only after receipt completion', async () => {
  const plan = await buildStagedPlan(changes(123), async () => { throw new Error('No upload expected'); }, stagedCapabilities, new Map(), () => {});
  const server = stagedServer(plan);
  const key = `workspace:alice:${plan.commitId}`;
  let checkpoints = 0;
  const result = await resumeStagedPlan(plan, server.client, stagedCapabilities, async () => {
    checkpoints++;
    await saveStagedDraft(key, { stagedPlan: plan, draft: 'unique local copy' });
  });
  assert.equal(result.items.length, 123);
  assert.equal(result.storeRevision, '9007199254740993124');
  assert.equal(server.publishes, 1);
  assert(checkpoints >= 5);
  const saved = await readStagedDraft<{ stagedPlan: StagedPlan }>(key);
  assert.deepEqual(saved!.stagedPlan.batches, plan.batches);
  const before = server.requests.length;
  const repeated = await resumeStagedPlan(saved!.stagedPlan, server.client, stagedCapabilities, () => {});
  assert.deepEqual(repeated, result);
  assert.equal(server.publishes, 1);
  assert(server.requests.slice(before).every(request => request.method === 'GET'));
  await deleteStagedDraft(key);
  assert.equal(await readStagedDraft(key), undefined);
});

test('staged upload interruption resumes missing batches with same commit ID and bytes', async () => {
  const plan = await buildStagedPlan(changes(123), async () => { throw new Error('No upload expected'); }, stagedCapabilities, new Map(), () => {});
  const server = stagedServer(plan);
  server.failBatch = 1;
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => {}), CommitResultUnconfirmed);
  assert.equal(server.uploaded.size, 1);
  assert.equal(server.publishes, 0);
  const before = server.requests.length;
  const restored = structuredClone(plan);
  const receipt = await resumeStagedPlan(restored, server.client, stagedCapabilities, () => {});
  assert.equal(receipt.items.length, 123);
  assert.equal(server.publishes, 1);
  assert(!server.requests.slice(before).some(request => request.path.endsWith('/batches/0')));
  assert(server.requests.every(request => request.path.startsWith(`/commit-sessions/${plan.commitId}`)));
});

test('lost publish response checks retained receipt and never publishes another commit', async () => {
  const plan = await buildStagedPlan(changes(60), async () => { throw new Error('No upload expected'); }, stagedCapabilities, new Map(), () => {});
  const server = stagedServer(plan);
  server.failPublishOnce = true;
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => {}), CommitResultUnconfirmed);
  assert.equal(server.publishes, 1);
  const result = await resumeStagedPlan(plan, server.client, stagedCapabilities, () => {});
  assert.equal(result.items.length, 60);
  assert.equal(server.publishes, 1);
  server.badReceipt = true;
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => {}), CommitResultUnconfirmed);
});

test('durability failure, missing/expired receipts and changed batches never create a new session', async () => {
  const plan = await buildStagedPlan(changes(2), async () => { throw new Error('No upload expected'); }, stagedCapabilities, new Map(), () => {});
  const server = stagedServer(plan);
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => { throw new Error('Quota exhausted'); }), /Quota exhausted/);
  assert.equal(server.requests.length, 0);
  let checkpoints = 0;
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => { if (++checkpoints === 2) throw new Error('Persisting started failed'); }), /Persisting started failed/);
  assert.equal(plan.started, false);
  assert.equal(server.requests.length, 0);
  await resumeStagedPlan(plan, server.client, stagedCapabilities, () => {});
  server.unavailable = 404;
  const before = server.requests.length;
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => {}), StagedSessionUnavailable);
  assert(server.requests.slice(before).every(request => request.method === 'GET'));
  server.unavailable = 410;
  await assert.rejects(resumeStagedPlan(plan, server.client, stagedCapabilities, () => {}), StagedSessionUnavailable);
  assert.equal(server.publishes, 1);
  const altered = structuredClone(plan);
  altered.batches[0] = altered.batches[0].replace('put', 'delete');
  await assert.rejects(resumeStagedPlan(altered, server.client, stagedCapabilities, () => {}), /不一致/);
});

test('read fence keeps large decimal revisions and discards whole buffers on revision changes', async () => {
  let rounds = 0;
  let listed = 0;
  const client: Client = async <T>(path: string, options?: RequestInit): Promise<T> => {
    if (path === '/read-state') return { storeRevision: String(9007199254740993123n + BigInt(rounds++)) } as T;
    const headers = new Headers(options?.headers);
    assert.equal(headers.get('If-Store-Revision'), String(9007199254740993122n + BigInt(rounds)));
    listed++;
    if (rounds === 1) throw Object.assign(new ReadRevisionChanged(), { details: { reason: 'read_revision_changed' } });
    return { items: [], pageNumber: 1, pageSize: 17, total: 0 } as T;
  };
  const result = await loadResources(client, async () => new ArrayBuffer(0), stagedCapabilities, new Map());
  assert.equal(result.consistency, 'fenced');
  assert.equal(result.storeRevision, '9007199254740993124');
  assert.equal(rounds, 2);
  assert.equal(listed, 2);
  const alwaysChanging: Client = async <T>(path: string): Promise<T> => {
    if (path === '/read-state') return { storeRevision: '123' } as T;
    throw new ReadRevisionChanged();
  };
  await assert.rejects(loadResources(alwaysChanging, async () => new ArrayBuffer(0), stagedCapabilities, new Map()), ReadRevisionChanged);
});