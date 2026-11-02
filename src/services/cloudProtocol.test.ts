import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadResources, type Capabilities, type Client, type ResourceBaseline } from './cloudProtocol';
import { RESOURCE_FORMAT } from './cloudResources';
import 'fake-indexeddb/auto';
import { cacheScope, cacheWrite, cachedAttachment, readBaseline, withCloudLock } from './cloudCache';
import { sha256 } from './cloudProtocol';
import { readBodies, validateReadCapabilities } from './cloudRead';

const caps: Capabilities = {
  apiVersion: 'v1', features: ['resources.read-fence'], authentication: { scheme: 'Bearer', scope: 'workspace' },
  limits: { resourceBytes: 10000, metadataBytes: 1000, attachmentBytes: 10000, requestBytes: 100000, commitOperations: 50, resourceAttachments: 10, pageSize: 100 },
};
const resourceId = '11111111-1111-4111-8111-111111111111';
const baseline = (): ResourceBaseline => ({ records: new Map([['settings.json', { id: resourceId, version: 1, content: { theme: 'dark' } }]]), blocked: new Set(), storeRevision: '90071992547409930', checkedAt: 0 });

const batchCaps: Capabilities = { ...caps, features: [...caps.features, 'resources.batch-read'], resourceBatchRead: { items: 100, requestBytes: 32768, responseBytes: 8388608, immutableVersions: true, missingItems: 'per-item-not_found', continuation: 'resubmit-items-from-nextOffset' } };
const deltaCaps: Capabilities = { ...batchCaps, features: [...batchCaps.features, 'resources.changes'], resourceChanges: { pageItems: 500, pageBytes: 1048576, cursorHours: 24, retentionDays: 30, scope: 'workspace', coalesced: true, tombstones: true, fixedTarget: true, content: 'batch-read-by-id-and-version' } };

test('delta collects all pages before replacing old IDs and reads immutable target versions without a fence', async () => {
  const base = { ...baseline(), storeRevision: '12' };
  const replacement = '22222222-2222-4222-8222-222222222222';
  const paths: string[] = [];
  const summary = { id: replacement, key: 'settings.json', version: 1, format: RESOURCE_FORMAT, formatVersion: 1, kind: 'json' };
  const client: Client = async <T>(path: string, options?: RequestInit) => {
    paths.push(path);
    assert.equal(new Headers(options?.headers).get('If-Store-Revision'), null);
    if (path === '/read-state') return { storeRevision: '15' } as T;
    if (path.startsWith('/resources/changes')) {
      const last = path.includes('cursor=');
      assert.equal(path, last ? '/resources/changes?cursor=next%2Fpage' : '/resources/changes?sinceRevision=12&limit=500');
      return { sinceRevision: '12', targetRevision: '15', items: [{ id: last ? resourceId : replacement, key: 'settings.json', format: RESOURCE_FORMAT, version: last ? 2 : 1, deleted: last, storeRevision: '14' }], nextCursor: last ? null : 'next/page' } as T;
    }
    assert.equal(path, '/resources/batch-read');
    assert.deepEqual(JSON.parse(options!.body as string), { items: [{ id: replacement, version: 1 }] });
    return { items: [{ id: replacement, requestedVersion: 1, status: 'ok', resource: { summary, jsonContent: { value: { theme: 'light' } }, attachmentIds: [] } }], nextOffset: null } as T;
  };
  const loaded = await loadResources(client, async () => new ArrayBuffer(0), deltaCaps, new Map(), [], base);
  assert.equal(loaded.storeRevision, '15');
  assert.equal(loaded.records.get('settings.json')?.id, replacement);
  assert.equal(base.records.get('settings.json')?.id, resourceId);
  assert.equal(paths.some(path => path.startsWith('/resources?')), false);
  assert.equal(paths.length, 4);
});

test('expired delta requests a new read-state and fenced full restore without changing the old baseline', async () => {
  const base = { ...baseline(), storeRevision: '12' };
  let checks = 0;
  const client: Client = async <T>(path: string, options?: RequestInit) => {
    if (path === '/read-state') return { storeRevision: String(15 + checks++) } as T;
    if (path.startsWith('/resources/changes')) throw Object.assign(new Error('expired'), { status: 410, details: { fullSyncRequired: true, reason: 'change_cursor_expired' } });
    assert.equal(new Headers(options?.headers).get('If-Store-Revision'), '16');
    assert.ok(path.startsWith('/resources?'));
    return { items: [], pageNumber: 1, pageSize: 100, total: 0 } as T;
  };
  const loaded = await loadResources(client, async () => new ArrayBuffer(0), deltaCaps, new Map(), [], base);
  assert.equal(checks, 2);
  assert.equal(loaded.storeRevision, '16');
  assert.equal(loaded.records.size, 0);
  assert.equal(base.records.size, 1);
});

test('delta handles renames, format changes, moves out of scope and deletion without mutating drafts', async () => {
  for (const mode of ['rename', 'format', 'unsupported-version', 'outside', 'delete']) {
    const base = { ...baseline(), storeRevision: '12' };
    const change = { id: resourceId, key: mode === 'rename' ? 'search/active.json' : mode === 'outside' ? 'another-app/settings.json' : 'settings.json', format: mode === 'format' ? 'other.resource' : RESOURCE_FORMAT, version: 2, deleted: mode === 'delete', storeRevision: '13' };
    let bodies = 0;
    const client: Client = async <T>(path: string) => {
      if (path === '/read-state') return { storeRevision: '13' } as T;
      if (path.startsWith('/resources/changes')) return { sinceRevision: '12', targetRevision: '13', items: [change], nextCursor: null } as T;
      assert.equal(path, '/resources/batch-read');
      bodies++;
      return { items: [{ id: resourceId, requestedVersion: 2, status: 'ok', resource: { summary: { ...change, formatVersion: mode === 'unsupported-version' ? 2 : 1, kind: 'json' }, jsonContent: { value: 'bing' }, attachmentIds: [] } }], nextOffset: null } as T;
    };
    const loaded = await loadResources(client, async () => new ArrayBuffer(0), deltaCaps, new Map(), [], base);
    assert.equal(loaded.records.has('settings.json'), false);
    assert.equal(loaded.records.size, mode === 'rename' ? 1 : 0);
    assert.equal(loaded.blocked.has('settings.json'), ['format', 'unsupported-version'].includes(mode));
    assert.equal(bodies, ['rename', 'unsupported-version'].includes(mode) ? 1 : 0);
    assert.deepEqual(base.records.get('settings.json')?.content, { theme: 'dark' });
  }
});

test('invalid delta pages, missing history and transient errors never advance the baseline', async () => {
  for (const mode of ['interval', 'target', 'cursor', 'duplicate', 'missing', 'wrong-key', 'wrong-version', 'network', 'unrelated-410']) {
    const base = { ...baseline(), storeRevision: '12' };
    let pages = 0;
    const client: Client = async <T>(path: string) => {
      if (path === '/read-state') return { storeRevision: '13' } as T;
      if (path.startsWith('/resources/changes')) {
        if (mode === 'network') throw new Error('offline');
        if (mode === 'unrelated-410') throw Object.assign(new Error('gone'), { status: 410 });
        pages++;
        return { sinceRevision: mode === 'interval' ? '11' : '12', targetRevision: mode === 'target' && pages > 1 ? '14' : '13',
          items: [{ id: mode === 'cursor' && pages > 1 ? '22222222-2222-4222-8222-222222222222' : resourceId, key: 'settings.json', format: RESOURCE_FORMAT, version: 2, deleted: false, storeRevision: '13' }],
          nextCursor: ['cursor', 'duplicate', 'target'].includes(mode) ? 'repeat' : null } as T;
      }
      assert.equal(path, '/resources/batch-read');
      return { items: [{ id: resourceId, requestedVersion: 2, status: mode === 'missing' ? 'not_found' : 'ok', resource: mode === 'missing' ? null : {
        summary: { id: resourceId, key: mode === 'wrong-key' ? 'wallpaper.json' : 'settings.json', format: RESOURCE_FORMAT, formatVersion: 1, kind: 'json', version: mode === 'wrong-version' ? 3 : 2 }, jsonContent: { value: {} }, attachmentIds: [] } }], nextOffset: null } as T;
    };
    await assert.rejects(loadResources(client, async () => new ArrayBuffer(0), deltaCaps, new Map(), [], base), mode);
    assert.equal(base.storeRevision, '12');
    assert.equal(base.checkedAt, 0);
    assert.equal(base.records.get('settings.json')?.version, 1);
    assert.ok(pages <= 2);
  }
});

test('empty delta advances a large string target without downloading any bodies', async () => {
  const base = baseline();
  const targetRevision = '90071992547409932';
  const client: Client = async <T>(path: string) => {
    if (path === '/read-state') return { storeRevision: targetRevision } as T;
    assert.ok(path.startsWith('/resources/changes?sinceRevision=90071992547409930'));
    return { sinceRevision: base.storeRevision, targetRevision, items: [], nextCursor: null } as T;
  };
  const loaded = await loadResources(client, async () => new ArrayBuffer(0), deltaCaps, new Map(), [], base);
  assert.equal(loaded.storeRevision, targetRevision);
  assert.deepEqual(loaded.records, base.records);
});

test('batch reads respect runtime item and UTF-8 byte limits and split 413 down to historical GET', async () => {
  const items = [resourceId, '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'].map(id => ({ id, version: 2 }));
  for (const mode of ['count', 'bytes', '413']) {
    const limits = { ...batchCaps.resourceBatchRead!, items: mode === 'count' ? 1 : 100, requestBytes: mode === 'bytes' ? 80 : 32768 };
    let posts = 0;
    let gets = 0;
    const client: Client = async <T>(path: string, options?: RequestInit) => {
      if (path !== '/resources/batch-read') {
        gets++;
        assert.ok(path.endsWith('/revisions/2'));
        return { summary: { id: path.split('/')[2], version: 2 } } as T;
      }
      posts++;
      assert.ok(new TextEncoder().encode(options!.body as string).byteLength <= limits.requestBytes);
      const input = JSON.parse(options!.body as string).items as { id: string; version: number }[];
      assert.ok(input.length <= limits.items);
      if (mode === '413') throw Object.assign(new Error('too large'), { status: 413 });
      return { items: input.map(item => ({ id: item.id, requestedVersion: 2, status: 'ok', resource: { summary: { id: item.id, version: 2 } } })), nextOffset: null } as T;
    };
    const result = await readBodies(client, { ...batchCaps, resourceBatchRead: limits }, items);
    assert.equal(result.size, 3);
    assert.equal(gets, mode === '413' ? 3 : 0);
    assert.equal(posts, mode === '413' ? 5 : 3);
  }
});

test('batch rejects invalid continuations, missing items, mismatched versions and invalid capabilities', async () => {
  const items = [{ id: resourceId, version: 2 }, { id: '22222222-2222-4222-8222-222222222222', version: 2 }];
  for (const mode of ['zero', 'offset', 'tail', 'empty', 'missing', 'version', 'order']) {
    const client: Client = async <T>() => ({ items: mode === 'empty' ? [] : [{ id: mode === 'order' ? items[1].id : resourceId, requestedVersion: mode === 'version' ? null : 2, status: mode === 'missing' ? 'not_found' : 'ok', resource: { summary: { id: resourceId, version: 2 } } }], nextOffset: mode === 'zero' ? 0 : mode === 'offset' ? 2 : mode === 'tail' ? null : 1 }) as T;
    await assert.rejects(readBodies(client, batchCaps, items), mode);
  }
  assert.throws(() => validateReadCapabilities({ ...batchCaps, resourceBatchRead: { ...batchCaps.resourceBatchRead!, items: 0 } }));
  assert.throws(() => validateReadCapabilities({ ...deltaCaps, resourceChanges: { ...deltaCaps.resourceChanges!, fixedTarget: false } }));
});

test('first read batches current bodies and resumes relative nextOffset under the same fence', async () => {
  const paths: string[] = [];
  const summaries = ['settings.json', 'wallpaper.json', 'search/active.json'].map((key, index) => ({ id: `${index + 1}1111111-1111-4111-8111-111111111111`, key, version: 1, format: RESOURCE_FORMAT, formatVersion: 1, kind: 'json' }));
  const inputs: string[][] = [];
  const client: Client = async <T>(path: string, options?: RequestInit) => {
    paths.push(path);
    if (path === '/read-state') return { storeRevision: '12' } as T;
    assert.equal(new Headers(options?.headers).get('If-Store-Revision'), '12');
    if (path.startsWith('/resources?')) return { items: summaries, pageNumber: 1, pageSize: 100, total: 3 } as T;
    assert.equal(path, '/resources/batch-read');
    const input = JSON.parse(options!.body as string).items as { id: string }[];
    inputs.push(input.map(item => item.id));
    const summary = summaries.find(item => item.id === input[0].id)!;
    return { items: [{ id: summary.id, requestedVersion: null, status: 'ok', resource: { summary, jsonContent: { value: {} }, attachmentIds: [] } }], nextOffset: input.length > 1 ? 1 : null } as T;
  };
  const loaded = await loadResources(client, async () => new ArrayBuffer(0), batchCaps, new Map());
  assert.equal(loaded.records.size, 3);
  assert.deepEqual(inputs.map(items => items.length), [3, 2, 1]);
  assert.equal(paths.filter(path => path.startsWith('/resources/111')).length, 0);
});

test('fresh baseline uses no requests; unchanged revision only checks read-state', async () => {
  const paths: string[] = [];
  const client: Client = async <T>(path: string) => { paths.push(path); return { storeRevision: '90071992547409930' } as T; };
  await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], { ...baseline(), checkedAt: Date.now() });
  assert.deepEqual(paths, []);
  const loaded = await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], baseline());
  assert.deepEqual(paths, ['/read-state']);
  assert.equal(loaded.storeRevision, '90071992547409930');
});

test('changed revision reuses matching identity and version but reads replacement UUID', async () => {
  for (const replace of [false, true]) {
    const paths: string[] = [];
    const summary = { id: replace ? '22222222-2222-4222-8222-222222222222' : resourceId, key: 'settings.json', version: 1, format: RESOURCE_FORMAT, formatVersion: 1, kind: 'json' };
    const client: Client = async <T>(path: string, options?: RequestInit) => {
      paths.push(path);
      if (path === '/read-state') return { storeRevision: '90071992547409931' } as T;
      assert.equal(new Headers(options?.headers).get('If-Store-Revision'), '90071992547409931');
      if (path.startsWith('/resources?')) return { items: [summary], pageNumber: 1, pageSize: 100, total: 1 } as T;
      return { summary, jsonContent: { value: { theme: 'light' } }, attachmentIds: [] } as T;
    };
    const loaded = await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], baseline());
    assert.equal(paths.length, replace ? 3 : 2);
    assert.deepEqual(loaded.records.get('settings.json')?.content, { theme: replace ? 'light' : 'dark' });
  }
});

test('manual checks bypass freshness; missing body and partial saves cannot claim a verified revision', async () => {
  const paths: string[] = [];
  const client: Client = async <T>(path: string) => {
    paths.push(path);
    if (path === '/read-state') return { storeRevision: baseline().storeRevision } as T;
    return { items: [], pageNumber: 1, pageSize: 100, total: 0 } as T;
  };
  const fresh = { ...baseline(), checkedAt: Date.now() };
  await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], fresh, true);
  assert.deepEqual(paths.splice(0), ['/read-state']);
  fresh.records.get('settings.json')!.content = undefined;
  await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], fresh);
  assert.equal(paths.length, 2);
  paths.length = 0;
  await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], { ...baseline(), storeRevision: undefined, checkedAt: Date.now() });
  assert.equal(paths.length, 2);
});

test('serialized checks reread shared baseline after lock; cached attachments verify integrity', async () => {
  const scope = cacheScope('https://example.test/api/v1/workspaces/AbCdEf1234_-', 'alice');
  let checks = 0;
  const client: Client = async <T>() => { checks++; return { storeRevision: baseline().storeRevision } as T; };
  await cacheWrite('baselines', scope, baseline());
  const check = () => withCloudLock(scope, async () => {
    const result = await loadResources(client, async () => new ArrayBuffer(0), caps, new Map(), [], await readBaseline(scope));
    await cacheWrite('baselines', scope, result);
  });
  await Promise.all([check(), check()]);
  assert.equal(checks, 1);
  assert.equal(await readBaseline(cacheScope('https://other.test/api/v1/workspaces/AbCdEf1234_-', 'alice')), undefined);
  const bytes = new TextEncoder().encode('verified-wallpaper');
  const image = { id: resourceId, sha256: await sha256(bytes), size: bytes.byteLength, contentType: 'image/png' };
  let downloads = 0;
  const download = async () => { downloads++; return bytes.buffer; };
  await cachedAttachment(scope, image, download);
  await cachedAttachment(scope, image, download);
  assert.equal(downloads, 1);
  await cacheWrite('attachments', `${scope}:${image.id}:${image.sha256}`, new ArrayBuffer(0));
  await cachedAttachment(scope, image, download);
  assert.equal(downloads, 2);
  await cacheWrite('attachments', `${scope}:${image.id}:${image.sha256}`, new ArrayBuffer(0));
  await assert.rejects(cachedAttachment(scope, image, async () => new ArrayBuffer(0)), /校验失败/);
});