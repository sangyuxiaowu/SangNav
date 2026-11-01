import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import 'fake-indexeddb/auto';
import { DEFAULT_CATEGORIES, DEFAULT_LINKS, DEFAULT_SEARCH_ENGINES, DEFAULT_SETTINGS, DEFAULT_SECRET_LINKS, DEFAULT_SECRET_CATEGORIES } from '../data/defaultData';
import { forgetAccount, recallAccount, rememberAccount } from './credentialVault';
import { joinDocuments, RESOURCE_FORMAT, semanticJson, splitDocuments } from './cloudResources';
import { AttachmentIntegrityError, prepareResource, sha256, validateCapabilities, type Capabilities, type ResourceBody } from './cloudProtocol';
import { diffDocuments, planBatches, saveBatch } from './cloudSync';

test('commit serialization and documentation use the verified action/id contract', async () => {
  const resourceId = '11111111-1111-4111-8111-111111111111';
  let serialized: { operations: Record<string, unknown>[] } | null = null;
  await saveBatch([{ key: 'settings.json', id: resourceId, expectedVersion: null, deleted: false, content: { theme: 'dark' } }], async <T>(path: string, options?: RequestInit): Promise<T> => {
    assert.equal(path, '/commits');
    serialized = JSON.parse(String(options?.body));
    return { items: [{ id: resourceId, version: 1, deleted: false }] } as T;
  }, capabilities, new Map(), () => {});
  assert(serialized);
  const operation = (serialized as { operations: Record<string, unknown>[] }).operations[0];
  assert.deepEqual(Object.keys(operation).sort(), ['action', 'expectedVersion', 'id', 'resource']);
  assert.equal(operation.action, 'put');
  assert.equal(operation.id, resourceId);
  assert.equal(operation.expectedVersion, null);
  const guide = readFileSync(new URL('../../build/client-integration.md', import.meta.url), 'utf8');
  const jsonBlocks = [...guide.matchAll(/```json\r?\n([\s\S]*?)```/g)];
  const firstExample = jsonBlocks.map(block => JSON.parse(block[1])).find(value => Array.isArray(value.operations));
  assert(firstExample);
  assert.deepEqual(Object.keys(firstExample.operations[0]).sort(), Object.keys(operation).sort());
  for (const block of jsonBlocks) JSON.parse(block[1]);
  const scripts = [...guide.matchAll(/```javascript\r?\n([\s\S]*?)```/g)];
  assert(scripts.length >= 3);
  for (const script of scripts) assert.doesNotThrow(() => new Function('return async function(){' + script[1] + '}'));
});

const capabilities: Capabilities = {
  apiVersion: 'v1', features: ['workspaces', 'resources.json', 'resources.conditions', 'commits.atomic', 'attachments', 'attachments.references'],
  limits: { resourceBytes: 1048576, metadataBytes: 8192, attachmentBytes: 16777216, requestBytes: 20971520, commitOperations: 50, resourceAttachments: 100, pageSize: 100 },
  authentication: { scheme: 'Bearer', scope: 'workspace' },
};

test('resource round-trip, isolated changes, capability checks and transaction limits', () => {
  const values = { sangnav_links: DEFAULT_LINKS, sangnav_categories: DEFAULT_CATEGORIES, sangnav_search_history: ['hello'], sangnav_settings: DEFAULT_SETTINGS, sangnav_analytics_visits: [{ dateStr: '2026-11-01' }, { dateStr: '2026-11-02' }] };
  const before = splitDocuments(values);
  assert.deepEqual(joinDocuments(before, {}), values);
  const edited = { ...DEFAULT_LINKS[0], title: 'Changed' };
  const after = splitDocuments({ ...values, sangnav_links: [edited, ...DEFAULT_LINKS.slice(1)] });
  assert.deepEqual([...after.keys()].filter(key => semanticJson(after.get(key)) !== semanticJson(before.get(key))), [`links/${edited.id}.json`]);
  assert(![...after.keys()].some(key => key.includes('users/')));
  assert.throws(() => splitDocuments({ sangnav_links: [{ id: '../invalid' }] }));
  assert.throws(() => validateCapabilities({ ...capabilities, features: ['resources.json'] }));
  assert.throws(() => validateCapabilities({ ...capabilities, apiVersion: 'v2' }));
  assert.throws(() => validateCapabilities({ ...capabilities, limits: { ...capabilities.limits, pageSize: 0 } }));
  assert.doesNotThrow(() => planBatches(diffDocuments(before, new Map(), new Map()), capabilities));
  const many = splitDocuments({ sangnav_links: Array.from({ length: 51 }, (_, index) => ({ id: `link-${index}` })) });
  assert.throws(() => planBatches(diffDocuments(many, new Map(), new Map()), capabilities), /不能保证原子性/);
  const changes = diffDocuments(many, new Map(), new Map());
  assert.throws(() => planBatches(changes, capabilities, true), /完整本地数据与待同步计划已保留/);
  assert.throws(() => planBatches(changes, capabilities, true), /当前连接未声明 commits\.staged 能力/);
  const supportsStaged = { ...capabilities, features: [...capabilities.features, 'commits.staged'] };
  assert.throws(() => planBatches(changes, supportsStaged, true), /请改用暂存提交/);
  assert.throws(() => planBatches(changes, supportsStaged), /当前连接已支持暂存提交/);
  const expanded = { ...capabilities, limits: { ...capabilities.limits, commitOperations: 100 } };
  assert.equal(planBatches(changes, expanded, true)[0].length, changes.length);
});

test('default navigation can initialize under the real 50-operation limit without splitting related groups', () => {
  const values = { sangnav_links: DEFAULT_LINKS, sangnav_categories: DEFAULT_CATEGORIES, sangnav_secret_links: DEFAULT_SECRET_LINKS, sangnav_secret_categories: DEFAULT_SECRET_CATEGORIES, sangnav_settings: DEFAULT_SETTINGS, sangnav_engines: DEFAULT_SEARCH_ENGINES, sangnav_active_engine: 'bing', sangnav_search_history: [], sangnav_secret_pattern: null, sangnav_secret_autolock: false };
  const changes = diffDocuments(splitDocuments(values), new Map(), new Map());
  assert(changes.length > 50);
  const batches = planBatches(changes, capabilities);
  assert(batches.length > 1);
  assert(batches.every(batch => batch.length <= capabilities.limits.commitOperations));
  assert.equal(batches.flat().length, changes.length);
  const publicBatches = batches.filter(batch => batch.some(change => /^(links|categories)\//.test(change.key)));
  assert.equal(publicBatches.length, 1);
  const privateBatches = batches.filter(batch => batch.some(change => /^secret\/(links|categories)\//.test(change.key)));
  assert.equal(privateBatches.length, 1);
  const expanded = { ...capabilities, limits: { ...capabilities.limits, commitOperations: 100 } };
  assert.equal(planBatches(changes, expanded).length, 1);
});

test('attachment validation preserves the known ID after integrity failure', async () => {
  const attachmentId = '33333333-3333-4333-8333-333333333333';
  await assert.rejects(prepareResource('wallpaper.json', { customWallpaperUrl: 'data:image/png;base64,eA==' }, async <T>(): Promise<T> => ({ id: attachmentId, size: 1, sha256: 'BAD', contentType: 'image/png' }) as T, capabilities, new Map()), error => error instanceof AttachmentIntegrityError && error.attachmentId === attachmentId);
});

test('workspace resources HTTP contract, incremental saves, drafts, renewal and attachments', async context => {
  const local = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (key: string) => local.get(key) ?? null, setItem: (key: string, value: string) => local.set(key, value), removeItem: (key: string) => local.delete(key) }, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: { addEventListener() {} }, configurable: true });
  const cloud = await import('./cloudStorage');
  type Stored = { id: string; version: number; body: ResourceBody };
  type Operation = { action: 'put' | 'delete'; id: string; expectedVersion: number | null; resource?: ResourceBody };
  const spaces = new Map<string, Map<string, Stored>>();
  const attachments = new Map<string, Uint8Array<ArrayBuffer>>();
  const commits: Operation[][] = [];
  const reads: string[] = [];
  const revoked = new Set<string>();
  const tokens = new Map<string, string>();
  let serverCaps = structuredClone(capabilities);
  serverCaps.limits.pageSize = 3;
  let loginCount = 0;
  let rejectLogin = false;
  let limited = false;
  let failBefore = false;
  let failAfter = false;
  let failAtCommit = 0;
  let corruptUpload = false;
  let corruptDownload = false;
  let omittedListingKey: string | null = null;
  let uploadCount = 0;
  let pauseCommit: Promise<void> | null = null;
  let onCommit: (() => void) | null = null;
  let stagedPublishCount = 0;
  let failStagedPublish = false;
  let rejectFenceOnce = false;
  let omitFenceHeaderOnce = false;
  let fenceReadCount = 0;
  const stagedSessions = new Map<string, { declaration: { operationCount: number; batchCount: number; baseStoreRevision?: string }; batches: Map<number, string>; state: string; results: { id: string; version: number; deleted: boolean }[] }>();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    const workspaceId = url.pathname.split('/')[4];
    const resources = spaces.get(workspaceId) || new Map<string, Stored>();
    spaces.set(workspaceId, resources);
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const bytes = new Uint8Array(Buffer.concat(chunks));
    const respond = (status: number, data: unknown, msg = 'ok') => {
      const missingFence = omitFenceHeaderOnce && status === 200 && url.pathname.endsWith('/resources');
      if (missingFence) omitFenceHeaderOnce = false;
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}), ...(serverCaps.features.includes('resources.read-fence') && !missingFence ? { 'Store-Revision': String(stagedPublishCount) } : {}) });
      response.end(JSON.stringify({ code: status >= 400 ? status : 0, msg, data }));
    };
    if (url.pathname.endsWith('/login')) {
      loginCount++;
      const { username, password } = JSON.parse(new TextDecoder().decode(bytes));
      if (limited) return respond(429, null);
      if (password !== 'test-only-password' || rejectLogin) return respond(401, null, 'Invalid credentials.');
      const accessToken = `test-token-${username}-${loginCount}`;
      tokens.set(accessToken, workspaceId);
      return respond(200, { accessToken, resourceUserId: username === 'alice' ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222', workspaceId, expiresAt: new Date(Date.now() + 43200000).toISOString() });
    }
    const token = request.headers.authorization?.replace('Bearer ', '') || '';
    if (tokens.get(token) !== workspaceId || revoked.has(token)) return respond(401, null);
    if (url.pathname.endsWith('/capabilities')) return respond(200, serverCaps);
    if (url.pathname.endsWith('/read-state')) return respond(200, { storeRevision: String(stagedPublishCount) });
    if (request.headers['if-store-revision']) {
      fenceReadCount++;
      if (rejectFenceOnce || request.headers['if-store-revision'] !== String(stagedPublishCount)) {
        rejectFenceOnce = false;
        return respond(409, { reason: 'read_revision_changed' });
      }
    }
    if (url.pathname.endsWith('/logout')) { response.writeHead(204); response.end(); return; }
    if (url.pathname.includes('/commit-sessions/')) {
      const tail = url.pathname.split('/commit-sessions/')[1].split('/');
      const commitId = tail[0];
      let staged = stagedSessions.get(commitId);
      if (request.method === 'PUT' && tail.length === 1) {
        const declaration = JSON.parse(new TextDecoder().decode(bytes));
        if (!staged) { staged = { declaration, batches: new Map(), state: 'open', results: [] }; stagedSessions.set(commitId, staged); }
        else if (semanticJson(staged.declaration) !== semanticJson(declaration)) return respond(409, null);
        return respond(201, {});
      }
      if (!staged) return respond(404, null);
      if (tail.length === 1 && request.method === 'GET') {
        const batches = [];
        for (const [index, raw] of staged.batches) batches.push({ index, operationCount: JSON.parse(raw).operations.length, sha256: await sha256(new TextEncoder().encode(raw)) });
        return respond(200, { commitId, ...staged.declaration, baseStoreRevision: staged.declaration.baseStoreRevision ?? null, state: staged.state, resultCount: staged.results.length, storeRevision: staged.state === 'published' ? '1' : null, batches });
      }
      if (tail[1] === 'batches' && request.method === 'PUT') {
        const raw = new TextDecoder().decode(bytes);
        const index = Number(tail[2]);
        const previous = staged.batches.get(index);
        if (previous !== undefined && previous !== raw) return respond(409, null);
        staged.batches.set(index, raw);
        assert.equal(stagedPublishCount, 0);
        assert.equal(resources.size, 0);
        return respond(201, { index, operationCount: JSON.parse(raw).operations.length, sha256: await sha256(bytes) });
      }
      if (tail[1] === 'publish' && request.method === 'POST') {
        if (staged.state !== 'published') {
          const next = new Map(resources);
          const all = [...staged.batches].sort(([first], [second]) => first - second).flatMap(([, raw]) => JSON.parse(raw).operations as Operation[]);
          for (const operation of all) {
            const current = [...next.values()].find(item => item.id === operation.id);
            if ((current?.version ?? null) !== operation.expectedVersion) return respond(412, null);
            if (operation.action === 'delete') { if (current) next.delete(current.body.key); }
            else next.set(operation.resource!.key, { id: operation.id, version: (current?.version ?? 0) + 1, body: operation.resource! });
          }
          staged.results = all.map(operation => ({ id: operation.id, version: (operation.expectedVersion ?? 0) + 1, deleted: operation.action === 'delete' }));
          staged.state = 'published';
          spaces.set(workspaceId, next);
          stagedPublishCount++;
        }
        if (failStagedPublish) { failStagedPublish = false; return respond(503, null); }
        return respond(200, { commitId, state: 'published', storeRevision: '1', resultCount: staged.results.length });
      }
      if (tail[1] === 'results') {
        const page = Number(url.searchParams.get('page'));
        const pageSize = Number(url.searchParams.get('pageSize'));
        return respond(200, { items: staged.results.slice((page - 1) * pageSize, page * pageSize), pageNumber: page, pageSize, total: staged.results.length });
      }
      return respond(400, null);
    }
    if (url.pathname.endsWith('/attachments') && request.method === 'POST') {
      const id = crypto.randomUUID();
      uploadCount++;
      attachments.set(id, bytes);
      return respond(201, { id, filename: 'wallpaper', contentType: request.headers['content-type'], size: bytes.byteLength, sha256: corruptUpload ? 'BAD' : await sha256(bytes), createdAt: new Date().toISOString() });
    }
    if (url.pathname.includes('/attachments/')) {
      const content = attachments.get(url.pathname.split('/').pop()!);
      if (!content) return respond(404, null);
      response.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      response.end(corruptDownload ? Buffer.from('broken') : content);
      return;
    }
    if (url.pathname.endsWith('/resources')) {
      reads.push(url.search);
      const page = Number(url.searchParams.get('page'));
      const pageSize = Number(url.searchParams.get('pageSize'));
      if (pageSize > serverCaps.limits.pageSize) return respond(400, null);
      const items = [...resources.values()].sort((first, second) => first.body.key.localeCompare(second.body.key)).map(item => ({ ...item.body, id: item.id, version: item.version }));
      if (omittedListingKey) {
        const index = items.findIndex(item => item.key === omittedListingKey);
        if (index >= 0) items[index] = { ...items[index], key: 'other-app/omitted-placeholder.json', format: 'other.application' };
      }
      return respond(200, { items: items.slice((page - 1) * pageSize, page * pageSize), pageNumber: page, pageSize, total: items.length });
    }
    if (url.pathname.includes('/resources/')) {
      const resource = url.pathname.endsWith('/resources/by-key') ? resources.get(url.searchParams.get('key')!) : [...resources.values()].find(item => item.id === url.pathname.split('/').pop());
      if (!resource) return respond(404, null);
      response.setHeader('ETag', `"${resource.version}"`);
      return respond(200, { summary: { ...resource.body, id: resource.id, version: resource.version }, jsonContent: resource.body.jsonContent, attachmentIds: resource.body.attachmentIds });
    }
    if (url.pathname.endsWith('/commits')) {
      const { operations } = JSON.parse(new TextDecoder().decode(bytes)) as { operations: Operation[] };
      if (!Array.isArray(operations) || operations.some(item => !item || Object.keys(item).some(key => !['action', 'id', 'expectedVersion', 'resource'].includes(key)) || !['put', 'delete'].includes(item.action))) return respond(400, null, 'Invalid request fields.');
      commits.push(operations);
      if (commits.length === failAtCommit) { failAtCommit = 0; return respond(503, null); }
      if (operations.length > serverCaps.limits.commitOperations || operations.length > 50 || new Set(operations.map(item => item.id)).size !== operations.length) return respond(400, null);
      if (failBefore) { failBefore = false; return respond(503, null); }
      const next = new Map(resources);
      const items = [];
      for (const operation of operations) {
        const current = [...next.values()].find(item => item.id === operation.id);
        if ((current?.version ?? null) !== operation.expectedVersion) return respond(412, null);
        if (operation.action === 'delete') {
          if (!current) return respond(404, null);
          next.delete(current.body.key);
        } else {
          const body = operation.resource!;
          const occupied = next.get(body.key);
          if (occupied && occupied.id !== operation.id) return respond(409, null);
          if (body.jsonContent === null || new TextEncoder().encode(JSON.stringify(body.jsonContent)).length > serverCaps.limits.resourceBytes) return respond(413, null);
          next.set(body.key, { id: operation.id, version: (current?.version ?? 0) + 1, body });
        }
        items.push({ id: operation.id, version: (current?.version ?? 0) + 1, deleted: operation.action === 'delete' });
      }
      spaces.set(workspaceId, next);
      if (pauseCommit) { onCommit?.(); await pauseCommit; pauseCommit = null; onCommit = null; }
      if (failAfter) { failAfter = false; return respond(500, null); }
      return respond(200, { items });
    }
    return respond(404, null);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/v1/workspaces/`;
  const workspaceId = 'AbCdEf1234_-';
  const url = `${base}${workspaceId}`;
  const data = () => spaces.get(workspaceId)!;
  const content = (key: string) => (data().get(key)!.body.jsonContent as { value: unknown }).value;
  const historyKey = 'sangnav_search_history';
  const login = (username = 'alice', workspace = url, importLocal = false) => cloud.loginCloud(workspace, username, 'test-only-password', importLocal, {});
  const defaults = { sangnav_links: DEFAULT_LINKS, sangnav_categories: DEFAULT_CATEGORIES, sangnav_engines: DEFAULT_SEARCH_ENGINES, sangnav_settings: DEFAULT_SETTINGS, sangnav_search_history: [], sangnav_active_engine: 'bing', sangnav_secret_links: [], sangnav_secret_categories: [], sangnav_secret_pattern: null, sangnav_secret_autolock: false, sangnav_analytics_visits: [], sangnav_analytics_searches: [] };
  for (const [key, value] of Object.entries(defaults)) cloud.readValue(key, value);
  try {
    await context.test('checks capabilities and never writes when unsupported', async () => {
      serverCaps.features = ['resources.json'];
      await assert.rejects(login(), /缺少/);
      assert.equal(commits.length, 0);
      serverCaps.features = [...capabilities.features];
    });
    await context.test('oversized related group retains complete local data and plan without any commits', async () => {
      serverCaps.limits.commitOperations = 5;
      await login('alice', `${base}LmNoPq1234_-`, true);
      const before = commits.length;
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'error');
      assert.match(cloud.getCloudState().message, /不能保证原子性/);
      assert.equal(commits.length, before);
      assert.deepEqual(cloud.readValue('sangnav_links', []), DEFAULT_LINKS);
      const storedDraft = [...local.entries()].find(([key]) => key.startsWith('sangnav_cloud_draft:') && key.includes('LmNoPq1234_-'));
      assert(storedDraft);
      const draft = JSON.parse(storedDraft[1]);
      assert.equal(draft.snapshot.values.sangnav_links.length, DEFAULT_LINKS.length);
      assert(draft.plan.length > serverCaps.limits.commitOperations);
      assert.equal(draft.atomicPublish, false);
      await cloud.logoutCloud();
      serverCaps.limits.commitOperations = 50;
    });
    await context.test('all default data syncs in independent groups and resumes after a later batch fails', async () => {
      cloud.writeValue('sangnav_secret_links', DEFAULT_SECRET_LINKS, []);
      cloud.writeValue('sangnav_secret_categories', DEFAULT_SECRET_CATEGORIES, []);
      const target = `${base}QrStUv1234_-`;
      await login('alice', target, true);
      await cloud.logoutCloud();
      const draftKey = [...local.keys()].find(key => key.startsWith('sangnav_cloud_draft:') && key.includes('QrStUv1234_-'))!;
      const legacyDraft = JSON.parse(local.get(draftKey)!);
      legacyDraft.atomicPublish = true;
      delete legacyDraft.publication;
      local.set(draftKey, JSON.stringify(legacyDraft));
      await login('alice', target);
      const before = commits.length;
      failAtCommit = before + 2;
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      assert.deepEqual(cloud.readValue('sangnav_links', []), DEFAULT_LINKS);
      assert.deepEqual(cloud.readValue('sangnav_secret_links', []), DEFAULT_SECRET_LINKS);
      const draft = JSON.parse(local.get(draftKey)!);
      assert(draft.records.length > 0);
      assert(draft.plan.length > 0);
      assert.equal(draft.publication, 'independent');
      const expectedCount = splitDocuments(draft.snapshot.values).size;
      assert(expectedCount > 50);
      assert(spaces.get('QrStUv1234_-')!.size < expectedCount);
      await cloud.logoutCloud();
      await login('alice', target);
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      await cloud.reconcileCloud(false);
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.equal(spaces.get('QrStUv1234_-')!.size, expectedCount);
      assert(commits.slice(before).every(batch => batch.length <= 50));
      await cloud.logoutCloud();
      cloud.writeValue('sangnav_secret_links', [], []);
      cloud.writeValue('sangnav_secret_categories', [], []);
    });
    await context.test('initializes independent resources and isolates one changed bookmark', async () => {
      cloud.writeValue(historyKey, ['local-only'], []);
      await login('alice', url, true);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.deepEqual(content('search/history.json'), ['local-only']);
      assert.equal(content('secret/pattern.json'), null);
      assert(![...data().keys()].some(key => key.includes('users/')));
      assert.equal(content('app.json') && data().get('app.json')!.body.format, RESOURCE_FORMAT);
      const first = DEFAULT_LINKS[0];
      cloud.writeValue<typeof DEFAULT_LINKS>('sangnav_links', previous => previous.map(link => link.id === first.id ? { ...link, title: 'Edited bookmark' } : link), []);
      await cloud.saveCloud();
      assert.deepEqual(commits.at(-1)!.map(item => item.resource?.key), [`links/${first.id}.json`]);
      assert.equal(commits.at(-1)![0].expectedVersion, 1);
      assert.equal(local.get(historyKey), '["local-only"]');
    });
    await context.test('same URL shares data across accounts and different URLs are isolated', async () => {
      cloud.writeValue(historyKey, ['shared-workspace'], []);
      await cloud.saveCloud();
      await cloud.logoutCloud();
      await login('bob');
      assert.deepEqual(cloud.readValue(historyKey, []), ['shared-workspace']);
      assert(reads.some(query => query.includes('page=2')));
      await cloud.logoutCloud();
      await login('alice', `${base}ZyXwVu9876_-`);
      assert.deepEqual(cloud.readValue(historyKey, []), []);
      await cloud.saveCloud();
      await cloud.logoutCloud();
      await login();
      assert.deepEqual(cloud.readValue(historyKey, []), ['shared-workspace']);
    });
    await context.test('statistics use date shards without changing bookmark resources', async () => {
      const analytics = await import('./analyticsDb');
      const bookmark = data().get(`links/${DEFAULT_LINKS[0].id}.json`)!;
      const before = bookmark.version;
      await analytics.recordVisit(DEFAULT_LINKS[0]);
      await cloud.saveCloud();
      const day = new Date().toISOString().split('T')[0];
      assert.deepEqual(commits.at(-1)!.map(item => item.resource?.key), [`analytics/visits/${day}.json`]);
      assert.equal(data().get(`links/${DEFAULT_LINKS[0].id}.json`)!.version, before);
      await analytics.recordSearch('query', DEFAULT_SEARCH_ENGINES[0]);
      await cloud.saveCloud();
      assert.deepEqual(commits.at(-1)!.map(item => item.resource?.key), [`analytics/searches/${day}.json`]);
      await analytics.clearAllAnalytics();
      await cloud.saveCloud();
      assert(commits.at(-1)!.every(item => item.action === 'delete'));
      assert(!data().has(`analytics/visits/${day}.json`));
    });
    await context.test('stable totals and unique keys cannot publish an incomplete view or trigger deletion', async () => {
      const before = cloud.readValue('sangnav_links', DEFAULT_LINKS);
      const commitsBefore = commits.length;
      const key = 'links/new-unlisted-link.json';
      const originalOrder = data().get('links/order.json')!;
      const savedContent = originalOrder.body.jsonContent;
      const newLink = { ...DEFAULT_LINKS[0], id: 'new-unlisted-link' };
      data().set(key, { id: crypto.randomUUID(), version: 1, body: { ...data().get(`links/${DEFAULT_LINKS[0].id}.json`)!.body, key, jsonContent: { value: newLink } } });
      originalOrder.body.jsonContent = { value: [...(content('links/order.json') as string[]), newLink.id] };
      omittedListingKey = key;
      await cloud.reconcileCloud(true);
      assert.equal(cloud.getCloudState().status, 'error');
      assert.deepEqual(cloud.readValue('sangnav_links', []), before);
      assert.equal(commits.length, commitsBefore);
      omittedListingKey = null;
      data().delete(key);
      originalOrder.body.jsonContent = savedContent;
      await cloud.reconcileCloud(true);
      assert.equal(cloud.getCloudState().status, 'saved');
    });
    await context.test('preserves unknown formats and unrelated resource edits', async () => {
      data().set('other-app/document.json', { id: crypto.randomUUID(), version: 1, body: { ...data().get('settings.json')!.body, key: 'other-app/document.json', format: 'other.application', jsonContent: { unknown: true } } });
      const remote = data().get('settings.json')!;
      remote.version++;
      (remote.body.jsonContent as { value: Record<string, unknown> }).value.showClock = false;
      cloud.writeValue(historyKey, ['independent-edit'], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.equal((content('settings.json') as Record<string, unknown>).showClock, false);
      assert(data().has('other-app/document.json'));
      await cloud.reconcileCloud(false);
      assert.equal(cloud.readValue('sangnav_settings', DEFAULT_SETTINGS).showClock, false);
    });
    await context.test('never overwrites a reserved key occupied by an unknown format', async () => {
      const history = data().get('search/history.json')!;
      history.body.format = 'future.application';
      await cloud.logoutCloud();
      await login();
      const before = commits.length;
      cloud.writeValue(historyKey, ['must-not-overwrite'], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'error');
      assert.equal(commits.length, before);
      assert.equal(data().get('search/history.json')!.body.format, 'future.application');
      history.body.format = RESOURCE_FORMAT;
      await cloud.reconcileCloud(true);
    });
    await context.test('deletes a bookmark with its order and creates a new UUID when restored', async () => {
      const links = cloud.readValue('sangnav_links', DEFAULT_LINKS);
      const removed = links.at(-1)!;
      const key = `links/${removed.id}.json`;
      const originalId = data().get(key)!.id;
      cloud.writeValue('sangnav_links', links.slice(0, -1), []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'saved');
      assert(!data().has(key));
      assert.equal(commits.at(-1)!.length, 2);
      assert(commits.at(-1)!.some(item => item.action === 'delete' && item.id === originalId));
      cloud.writeValue('sangnav_links', links, []);
      await cloud.saveCloud();
      assert.notEqual(data().get(key)!.id, originalId);
      assert.equal(data().get(key)!.version, 1);
    });
    await context.test('retains conflict drafts, including after logout and re-login', async () => {
      const remote = data().get('search/history.json')!;
      remote.version++;
      remote.body.jsonContent = { value: ['other-device'] };
      cloud.writeValue(historyKey, ['draft'], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'conflict');
      await cloud.logoutCloud();
      await login('bob');
      assert.deepEqual(cloud.readValue(historyKey, []), ['other-device']);
      await cloud.logoutCloud();
      await login();
      assert.deepEqual(cloud.readValue(historyKey, []), ['draft']);
      const before = commits.length;
      await cloud.reconcileCloud(false);
      assert.equal(cloud.getCloudState().status, 'conflict');
      assert.equal(commits.length, before);
      await cloud.reconcileCloud(true);
      assert.deepEqual(cloud.readValue(historyKey, []), ['other-device']);
    });
    await context.test('checks uncertain results instead of replaying committed writes', async () => {
      failAfter = true;
      cloud.writeValue(historyKey, ['committed-response-lost'], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      const before = commits.length;
      await cloud.saveCloud();
      assert.equal(commits.length, before);
      await cloud.reconcileCloud(false);
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.equal(commits.length, before);
      failBefore = true;
      cloud.writeValue(historyKey, ['safe-retry'], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      await cloud.logoutCloud();
      await login();
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      const pendingCommits = commits.length;
      cloud.writeValue(historyKey, ['safe-retry-after-edit'], []);
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      await cloud.saveCloud();
      assert.equal(commits.length, pendingCommits);
      await cloud.reconcileCloud(false);
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.deepEqual(content('search/history.json'), ['safe-retry-after-edit']);
    });
    await context.test('related category deletion and link changes are atomic', async () => {
      const originalCategories = cloud.readValue('sangnav_categories', DEFAULT_CATEGORIES);
      const originalLinks = cloud.readValue('sangnav_links', DEFAULT_LINKS);
      const removed = originalCategories[0];
      const remote = data().get(`links/${originalLinks[0].id}.json`)!;
      remote.version++;
      const before = semanticJson([...data()]);
      cloud.writeValue('sangnav_categories', originalCategories.filter(category => category.id !== removed.id), []);
      cloud.writeValue('sangnav_links', originalLinks.map(link => ({ ...link, categoryId: 'other' })), []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'conflict');
      assert.equal(semanticJson([...data()]), before);
      assert(commits.at(-1)!.some(item => item.action === 'delete'));
      await cloud.reconcileCloud(true);
    });
    await context.test('edits made during save are submitted in the next batch', async () => {
      let release!: () => void;
      pauseCommit = new Promise(resolve => { release = resolve; });
      const committed = new Promise<void>(resolve => { onCommit = resolve; });
      cloud.writeValue(historyKey, ['first'], []);
      const saving = cloud.saveCloud();
      await committed;
      cloud.writeValue(historyKey, ['second'], []);
      release();
      await saving;
      assert.equal(cloud.getCloudState().status, 'pending');
      await cloud.saveCloud();
      assert.deepEqual(content('search/history.json'), ['second']);
    });
    await context.test('wallpapers are separate verified attachments, reused after failed commits', async () => {
      const image = `data:image/png;base64,${Buffer.from('test-image-bytes').toString('base64')}`;
      corruptUpload = true;
      cloud.writeValue('sangnav_settings', { ...cloud.readValue('sangnav_settings', DEFAULT_SETTINGS), customWallpaperUrl: image, wallpaperPreset: 'custom' }, DEFAULT_SETTINGS);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'error');
      corruptUpload = false;
      failBefore = true;
      await cloud.reconcileCloud(false);
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      const before = uploadCount;
      await cloud.reconcileCloud(false);
      assert.equal(uploadCount, before);
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.deepEqual(commits.at(-1)!.map(item => item.resource?.key), ['wallpaper.json']);
      assert.equal(data().get('wallpaper.json')!.body.attachmentIds.length, 1);
      await cloud.logoutCloud();
      await login();
      assert.equal(cloud.readValue('sangnav_settings', DEFAULT_SETTINGS).customWallpaperUrl, image);
      await cloud.logoutCloud();
      corruptDownload = true;
      await assert.rejects(login(), /校验失败/);
      corruptDownload = false;
      await login();
    });
    await context.test('enforces resource limits without uploading a whole snapshot attachment', async () => {
      serverCaps.limits.resourceBytes = 100;
      await cloud.logoutCloud();
      await login();
      const before = uploadCount;
      cloud.writeValue(historyKey, ['x'.repeat(200)], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'error');
      assert.equal(uploadCount, before);
      serverCaps.limits.resourceBytes = 1048576;
      await cloud.reconcileCloud(true);
      await cloud.logoutCloud();
      await login();
    });
    await context.test('restores encrypted sessions and renews revoked or expired tokens', async () => {
      const account = (await recallAccount())!;
      await cloud.logoutCloud();
      await rememberAccount(account);
      const before = loginCount;
      await cloud.restoreCloudAccount();
      assert.equal(loginCount, before);
      revoked.add((await recallAccount())!.session.accessToken);
      cloud.writeValue(historyKey, ['renewed'], []);
      await cloud.saveCloud();
      assert.equal(loginCount, before + 1);
      assert.equal(cloud.getCloudState().status, 'saved');
      const expired = (await recallAccount())!;
      await cloud.logoutCloud();
      expired.session.expiresAt = new Date(Date.now() - 1000).toISOString();
      await rememberAccount(expired);
      await cloud.restoreCloudAccount();
      assert.equal(loginCount, before + 2);
      assert(![...local.values()].some(value => value.includes('test-token') || value.includes('test-only-password')));
    });
    await context.test('stops credential retries after password rejection and preserves drafts', async () => {
      rejectLogin = true;
      revoked.add((await recallAccount())!.session.accessToken);
      cloud.writeValue(historyKey, ['draft-on-password-reset'], []);
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'expired');
      assert.equal(await recallAccount(), null);
      assert.deepEqual(cloud.readValue(historyKey, []), ['draft-on-password-reset']);
      await cloud.logoutCloud();
      rejectLogin = false;
    });
    await context.test('staged initial sync restores retained receipt after lost publish response', async () => {
      serverCaps.features.push('commits.staged');
      serverCaps.features.push('resources.read-fence');
      Object.assign(serverCaps.limits, { stagedBatchOperations: 10, stagedBatchBytes: 20971520, stagedCommitOperations: 10000, stagedCommitBytes: 268435456, stagedBatchCount: 1000, stagedOpenSessionsPerAccount: 2, stagedOpenSessionsPerWorkspace: 8, stagedWorkspaceBytes: 536870912, stagedLifetimeSeconds: 86400, stagedReceiptSeconds: 604800 });
      serverCaps.stagedCommits = { idempotencyScope: 'workspace+commitId', batchIdentity: 'sha256-raw-utf8', receiptSeconds: 604800, contentEncoding: 'identity' };
      cloud.writeValue('sangnav_secret_links', DEFAULT_SECRET_LINKS, []);
      cloud.writeValue('sangnav_secret_categories', DEFAULT_SECRET_CATEGORIES, []);
      const target = `${base}StAgEd1234_-`;
      rejectFenceOnce = true;
      omitFenceHeaderOnce = true;
      await login('alice', target, true);
      assert.equal(rejectFenceOnce, false);
      assert.equal(omitFenceHeaderOnce, false);
      assert(fenceReadCount >= 3);
      const before = commits.length;
      failStagedPublish = true;
      await cloud.saveCloud();
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      assert.equal(stagedPublishCount, 1);
      assert.equal(commits.length, before);
      assert(spaces.get('StAgEd1234_-')!.size > 50);
      await cloud.logoutCloud();
      await login('alice', target);
      assert.equal(cloud.getCloudState().status, 'unconfirmed');
      await cloud.reconcileCloud(false);
      assert.equal(cloud.getCloudState().status, 'saved');
      assert.equal(stagedPublishCount, 1);
      assert.equal(stagedSessions.size, 1);
      await cloud.logoutCloud();
      serverCaps.features = [...capabilities.features];
      delete serverCaps.stagedCommits;
      cloud.writeValue('sangnav_secret_links', [], []);
      cloud.writeValue('sangnav_secret_categories', [], []);
    });
    await context.test('honors Retry-After and blocks repeated login requests', async () => {
      limited = true;
      await assert.rejects(login('alice', `${base}ZyXwVu9876_-`), /60/);
      const before = loginCount;
      await assert.rejects(login('alice', `${base}ZyXwVu9876_-`), /限流/);
      assert.equal(loginCount, before);
      limited = false;
    });
  } finally {
    await cloud.logoutCloud().catch(() => {});
    server.close();
    server.closeAllConnections();
    await once(server, 'close');
  }
});

test('account vault encrypts credentials and deletes its non-extractable key on logout', async () => {
  const account = { workspaceUrl: 'https://example.com/api/v1/workspaces/AbCdEf1234_-', username: 'vault-user', password: 'vault-password', session: { accessToken: 'vault-token', resourceUserId: '11111111-1111-4111-8111-111111111111', workspaceId: 'AbCdEf1234_-', expiresAt: new Date(Date.now() + 43200000).toISOString() } };
  await rememberAccount(account);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('sangnav_account_vault', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    const entry = await new Promise<{ key: CryptoKey; ciphertext: ArrayBuffer }>((resolve, reject) => {
      const request = db.transaction('vault').objectStore('vault').get('account');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    assert.equal(entry.key.extractable, false);
    assert(!new TextDecoder().decode(entry.ciphertext).includes(account.password));
    await assert.rejects(crypto.subtle.exportKey('raw', entry.key));
    assert.deepEqual(await recallAccount(), account);
    await forgetAccount();
    assert.equal(await recallAccount(), null);
  } finally { db.close(); }
});