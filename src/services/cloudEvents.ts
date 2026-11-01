import { getCloudConnection, getCloudScope, subscribeStorage } from './cloudStorage';
import { withCloudLock } from './cloudCache';
import { byteSize, type Capabilities, type Client } from './cloudProtocol';

export type Stream = 'analytics.visits' | 'analytics.searches';
export type EventRecord = { eventId: string; eventTime: number; payload: Record<string, unknown> };
export type AnalyticsRange = '30days' | '7days' | 'today';
type Connection = { scope: string; client: Client; capabilities: Capabilities };
export type AggregateResult = { rows: Record<string, unknown>[]; from: number; to: number; timeZone: string; truncated: boolean };
let timer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let message = '';
const listeners = new Set<() => void>();
export function subscribeEventSync(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify() { for (const listener of listeners) listener(); }
export function getEventSyncMessage() { return message; }
const prefix = (scope: string) => `sangnav_events:v1:${scope}:`;

export function queuedEvents(scope: string) {
  const entries: { key: string; stream: Stream; event: EventRecord }[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix(scope))) continue;
    const value = JSON.parse(localStorage.getItem(key)!);
    entries.push({ key, ...value });
  }
  return entries.sort((first, second) => first.event.eventTime - second.event.eventTime);
}

export function queueEvent(connection: Pick<Connection, 'scope'>, stream: Stream, payload: Record<string, unknown>, eventTime: number, eventId = crypto.randomUUID()) {
  const event: EventRecord = { eventId, eventTime, payload: structuredClone(payload) };
  localStorage.setItem(`${prefix(connection.scope)}${stream}:${eventId}`, JSON.stringify({ stream, event }));
  return event;
}

function schedule(delay = 5000) {
  if (timer || failures >= 5 || !getCloudConnection()) return;
  timer = setTimeout(() => { timer = undefined; void flushCloudEvents(); }, delay);
  timer.unref?.();
}

export function recordCloudEvent(stream: Stream, payload: Record<string, unknown>, eventTime: number) {
  const scope = getCloudScope();
  if (!scope) throw new Error('事件连接尚未就绪。');
  try { queueEvent({ scope }, stream, payload, eventTime); }
  catch (error) { message = '浏览器无法保留统计事件，本次统计未记录。'; notify(); throw error; }
  schedule();
}

export async function uploadEvents(connection: Connection, keepalive = false) {
  return withCloudLock(`${connection.scope}:events`, async () => {
    const caps = connection.capabilities;
    const pending = queuedEvents(connection.scope);
    if (!pending.length) return false;
    const limits = caps.eventStreams;
    if (!caps.features.includes('streams.append') || !limits || limits.idempotencyScope !== 'workspace+streamType+eventId' || ![limits.batchBytes, limits.batchEvents, limits.eventBytes, limits.appendRequestsPerMinute].every(value => Number.isSafeInteger(value) && value > 0)) throw Object.assign(new Error('服务端缺少兼容的事件追加能力，事件仍保留在本机。'), { status: 400 });
    const rateKey = `sangnav_event_rate:v1:${connection.scope}`;
    const nextAttempt = Number(localStorage.getItem(rateKey) || 0);
    if (Date.now() < nextAttempt) return true;
    const stream = pending[0].stream;
    const batch: typeof pending = [];
    const maxBytes = Math.min(limits.batchBytes, caps.limits.requestBytes, keepalive ? 48000 : Infinity);
    for (const entry of pending.filter(item => item.stream === stream)) {
      if (byteSize(entry.event) > limits.eventBytes) throw new Error('单条统计事件超过服务端限额，已保留待处理。');
      if (batch.length >= limits.batchEvents || byteSize([...batch.map(item => item.event), entry.event]) > maxBytes) break;
      batch.push(entry);
    }
    if (!batch.length) throw new Error('统计事件超过请求限额，已保留待处理。');
    localStorage.setItem(rateKey, String(Date.now() + Math.ceil(60000 / limits.appendRequestsPerMinute)));
    try {
      const result = await connection.client<{ acceptedCount: number; duplicateCount: number }>(`/streams/${stream}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batch.map(item => item.event)), keepalive });
      if (!Number.isSafeInteger(result.acceptedCount) || result.acceptedCount < 0 || !Number.isSafeInteger(result.duplicateCount) || result.duplicateCount < 0 || result.acceptedCount + result.duplicateCount !== batch.length) throw new Error('事件追加回执无效，保留原事件等待确认。');
      for (const entry of batch) localStorage.removeItem(entry.key);
    } catch (error) {
      const details = error as { status?: number; retryAfterMs?: number };
      if (details.status === 429) localStorage.setItem(rateKey, String(Date.now() + Math.max(1000, details.retryAfterMs || 60000)));
      throw error;
    }
    return pending.length > batch.length;
  });
}

export async function flushCloudEvents(keepalive = false) {
  const connection = getCloudConnection();
  if (!connection) return;
  try {
    const remaining = await uploadEvents(connection, keepalive);
    failures = 0;
    message = '';
    if (remaining) schedule(2000);
  } catch (error) {
    message = error instanceof Error ? error.message : '统计暂未上传，已保留在本机。';
    const status = (error as { status?: number }).status;
    failures++;
    if (status === undefined || status === 429 || status >= 500) schedule(Math.min(60000, 2000 * 2 ** failures));
    else failures = 5;
  } finally { notify(); }
}

export function analyticsWindow(range: AnalyticsRange, now = Date.now()) {
  const start = range === 'today' ? new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() : now - (range === '7days' ? 7 : 30) * 86400000;
  return { from: start, to: now, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
}

export async function readEvents<T>(stream: Stream, range: AnalyticsRange, connection = getCloudConnection()): Promise<T[]> {
  if (!connection?.capabilities.features.includes('streams.read') || !connection.capabilities.eventStreams) throw new Error('服务端不支持事件读取。');
  const limit = connection.capabilities.eventStreams.pageEvents;
  const window = analyticsWindow(range);
  let path = `/streams/${stream}/events?from=${window.from}&to=${window.to}&limit=${limit}`;
  const events = new Map<string, EventRecord>();
  const cursors = new Set<string>();
  for (;;) {
    const page = await connection.client<{ items: EventRecord[]; nextCursor: string | null; from: number; to: number }>(path);
    if (!Array.isArray(page.items) || page.from !== window.from || page.to !== window.to || page.nextCursor !== null && typeof page.nextCursor !== 'string') throw new Error('事件分页响应无效。');
    for (const event of page.items) events.set(event.eventId, event);
    if (page.nextCursor === null) break;
    if (cursors.has(page.nextCursor)) throw new Error('事件游标重复。');
    cursors.add(page.nextCursor);
    path = `/streams/${stream}/events?after=${encodeURIComponent(page.nextCursor)}&limit=${limit}`;
  }
  for (const entry of queuedEvents(connection.scope)) if (entry.stream === stream && entry.event.eventTime >= window.from && entry.event.eventTime < window.to) events.set(entry.event.eventId, entry.event);
  return [...events.values()].map(event => ({ ...event.payload, eventId: event.eventId, timestamp: event.eventTime }) as T);
}

export async function aggregateEvents(stream: Stream, body: Record<string, unknown>): Promise<AggregateResult> {
  const connection = getCloudConnection();
  const caps = connection?.capabilities;
  if (!connection || !caps?.features.includes('streams.aggregate') || !caps.eventAggregation) throw new Error('服务端缺少统计聚合能力。');
  if (byteSize(body) > Math.min(caps.eventAggregation.requestBytes, caps.limits.requestBytes)) throw new Error('统计聚合请求超过限额。');
  const result = await connection.client<AggregateResult>(`/streams/${stream}/aggregate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!Array.isArray(result.rows) || typeof result.truncated !== 'boolean') throw new Error('统计聚合响应无效。');
  return result;
}

subscribeStorage(() => { if (getCloudConnection()) schedule(); });
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { failures = 0; schedule(1000); });
  window.addEventListener('pagehide', () => { void flushCloudEvents(true); });
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') void flushCloudEvents(true);
  else { failures = 0; schedule(1000); }
});