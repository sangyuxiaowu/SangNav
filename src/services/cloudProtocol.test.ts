import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadResources, type Capabilities, type Client, type ResourceBaseline } from './cloudProtocol';
import { RESOURCE_FORMAT } from './cloudResources';
import 'fake-indexeddb/auto';
import { cacheScope, cacheWrite, cachedAttachment, readBaseline, withCloudLock } from './cloudCache';
import { sha256 } from './cloudProtocol';

const caps: Capabilities = {
  apiVersion: 'v1', features: ['resources.read-fence'], authentication: { scheme: 'Bearer', scope: 'workspace' },
  limits: { resourceBytes: 10000, metadataBytes: 1000, attachmentBytes: 10000, requestBytes: 100000, commitOperations: 50, resourceAttachments: 10, pageSize: 100 },
};
const resourceId = '11111111-1111-4111-8111-111111111111';
const baseline = (): ResourceBaseline => ({ records: new Map([['settings.json', { id: resourceId, version: 1, content: { theme: 'dark' } }]]), blocked: new Set(), storeRevision: '90071992547409930', checkedAt: 0 });

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