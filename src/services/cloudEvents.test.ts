import assert from 'node:assert/strict';
import { test } from 'node:test';
import 'fake-indexeddb/auto';
import type { Capabilities, Client } from './cloudProtocol';

const caps: Capabilities = {
  apiVersion: 'v1', features: ['streams.append', 'streams.read'], authentication: { scheme: 'Bearer', scope: 'workspace' },
  limits: { resourceBytes: 10000, metadataBytes: 1000, attachmentBytes: 10000, requestBytes: 100000, commitOperations: 50, resourceAttachments: 10, pageSize: 100 },
  eventStreams: { batchEvents: 2, eventBytes: 1000, batchBytes: 2000, pageEvents: 2, pageBytes: 2000, appendRequestsPerMinute: 60, idempotencyScope: 'workspace+streamType+eventId' },
};

test('durable event queue, byte limits, stable replay, isolation and cursor windows', async context => {
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    get length() { return stored.size; }, key: (index: number) => [...stored.keys()][index] ?? null,
    getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key),
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {} } });
  const events = await import('./cloudEvents');
  const scope = 'test-workspace:alice';
  const resetRate = () => stored.delete(`sangnav_event_rate:v1:${scope}`);
  await context.test('lost response retains exact IDs and duplicate receipts confirm them', async () => {
    let fail = true;
    const bodies: string[] = [];
    const client: Client = async <T>(path: string, options?: RequestInit) => {
      assert.equal(path, '/streams/analytics.visits/events');
      bodies.push(String(options?.body));
      assert(Array.isArray(JSON.parse(String(options?.body))));
      if (fail) throw new TypeError('network lost');
      return { acceptedCount: 0, duplicateCount: 2 } as T;
    };
    const connection = { scope, client, capabilities: caps };
    const original = events.queueEvent(connection, 'analytics.visits', { domain: 'example.com' }, 1000);
    events.queueEvent(connection, 'analytics.visits', { domain: 'example.org' }, 1001);
    events.queueEvent({ scope: 'other-account' }, 'analytics.visits', { domain: 'private.example' }, 1001);
    await assert.rejects(events.uploadEvents(connection));
    assert.equal(events.queuedEvents(scope).length, 2);
    assert.deepEqual(events.queuedEvents(scope)[0].event, original);
    fail = false;
    resetRate();
    await events.uploadEvents(connection);
    assert.equal(bodies[0], bodies[1]);
    assert.equal(events.queuedEvents(scope).length, 0);
    assert.equal(events.queuedEvents('other-account').length, 1);
  });
  await context.test('count and UTF-8 byte caps split batches; keepalive stays small', async () => {
    resetRate();
    const sizes: number[] = [];
    const client: Client = async <T>(_path: string, options?: RequestInit) => {
      assert.equal(options?.keepalive, true);
      const body = String(options?.body);
      sizes.push(new TextEncoder().encode(body).byteLength);
      return { acceptedCount: JSON.parse(body).length, duplicateCount: 0 } as T;
    };
    const connection = { scope, client, capabilities: { ...caps, eventStreams: { ...caps.eventStreams!, batchBytes: 220 } } };
    for (let index = 0; index < 3; index++) events.queueEvent(connection, 'analytics.visits', { title: '中文测试中文测试' }, index);
    assert.equal(await events.uploadEvents(connection, true), true);
    assert.equal(events.queuedEvents(scope).length, 2);
    assert(sizes.every(size => size <= 220));
    stored.clear();
  });
  await context.test('429 persists Retry-After and 409 never deletes the batch', async () => {
    let calls = 0;
    const client: Client = async () => { calls++; throw Object.assign(new Error('limited'), { status: 429, retryAfterMs: 60000 }); };
    const connection = { scope, client, capabilities: caps };
    events.queueEvent(connection, 'analytics.searches', { query: 'hello' }, Date.now());
    await assert.rejects(events.uploadEvents(connection));
    await events.uploadEvents(connection);
    assert.equal(calls, 1);
    assert.equal(events.queuedEvents(scope).length, 1);
    resetRate();
    await assert.rejects(events.uploadEvents({ ...connection, client: async () => { throw Object.assign(new Error('conflict'), { status: 409 }); } }));
    assert.equal(events.queuedEvents(scope).length, 1);
    stored.clear();
  });
  await context.test('cursor alone determines completion, including short pages', async () => {
    let calls = 0;
    let from = 0;
    let to = 0;
    const client: Client = async <T>(path: string) => {
      const url = new URL(path, 'https://example.com');
      if (calls++ === 0) {
        from = Number(url.searchParams.get('from')); to = Number(url.searchParams.get('to'));
        assert.equal(to - from, 30 * 86400000);
        return { items: [], nextCursor: 'opaque + /', from, to } as T;
      }
      assert.equal(url.searchParams.get('after'), 'opaque + /');
      assert(!url.searchParams.has('from'));
      return { items: [{ eventId: 'original', eventTime: from + 1, payload: { query: 'hello' } }], nextCursor: null, from, to } as T;
    };
    const rows = await events.readEvents<{ query: string }>('analytics.searches', '30days', { scope, client, capabilities: caps });
    assert.equal(rows[0].query, 'hello');
    assert.equal(calls, 2);
  });
  await context.test('local analytics query only the requested recent window, excluding old and future data', async () => {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, indexedDB } });
    const analytics = await import('./analyticsDb');
    await analytics.getVisits();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('sangnav_analytics_db', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = Date.now();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['visits', 'searches'], 'readwrite');
      for (const days of [31, 29, 3, 0.1, -1]) {
        transaction.objectStore('visits').add({ timestamp: now - days * 86400000 });
        transaction.objectStore('searches').add({ timestamp: now - days * 86400000 });
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    assert.equal((await analytics.getVisits()).length, 3);
    assert.equal((await analytics.getSearches('7days')).length, 2);
    db.close();
  });
});