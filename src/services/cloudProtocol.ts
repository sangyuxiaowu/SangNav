import { isManagedKey, RESOURCE_FORMAT, semanticJson } from './cloudResources';
import { readBodies, readDelta, validateReadCapabilities } from './cloudRead';

export type Client = <T>(path: string, options?: RequestInit) => Promise<T>;
export type StagedLimits = { stagedBatchOperations: number; stagedBatchBytes: number; stagedCommitOperations: number; stagedCommitBytes: number; stagedBatchCount: number; stagedOpenSessionsPerAccount: number; stagedOpenSessionsPerWorkspace: number; stagedWorkspaceBytes: number; stagedLifetimeSeconds: number; stagedReceiptSeconds: number };
export type Limits = { resourceBytes: number; metadataBytes: number; attachmentBytes: number; requestBytes: number; commitOperations: number; resourceAttachments: number; pageSize: number } & Partial<StagedLimits>;
export type Capabilities = { apiVersion: string; features: string[]; limits: Limits; authentication: { scheme: string; scope: string }; resourceBatchRead?: { items: number; requestBytes: number; responseBytes: number; immutableVersions: boolean; missingItems: string; continuation: string }; resourceChanges?: { pageItems: number; pageBytes: number; cursorHours: number; retentionDays: number; scope: string; coalesced: boolean; tombstones: boolean; fixedTarget: boolean; content: string }; stagedCommits?: { idempotencyScope: string; batchIdentity: string; receiptSeconds: number; contentEncoding: string }; eventStreams?: { batchEvents: number; eventBytes: number; batchBytes: number; pageEvents: number; pageBytes: number; appendRequestsPerMinute: number; idempotencyScope: string }; eventAggregation?: { rows: number; metrics: number; groupDimensions: number; requestBytes: number; concurrentQueries: number; operations: string[]; timeBuckets: string[] } };
export type StoredResource = { id: string; version: number; content: unknown };
export type ResourceBaseline = { records: Map<string, StoredResource>; blocked: Set<string>; storeRevision?: string; checkedAt: number };
export type Upload = { id: string; sha256: string; size: number; contentType: string };
export type ResourceBody = { key: string; title: string; format: string; formatVersion: number; kind: 'json'; contentType: 'application/json'; jsonContent: unknown; metadata: Record<string, never>; attachmentIds: string[] };
type Summary = { id: string; key: string; version: number; format: string; formatVersion: number; kind: string };
export type Resource = { summary: Summary; jsonContent: unknown; attachmentIds: string[] };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class AttachmentIntegrityError extends Error {
  constructor(public attachmentId: string | undefined) { super('壁纸上传大小或 SHA-256 校验失败；已保留返回的附件 ID 供核查。'); }
}

export class ReadRevisionChanged extends Error {
  status = 409;
  details = { reason: 'read_revision_changed' };
  constructor() { super('读取修订发生变化或响应缺少匹配的 Store-Revision，已保留本地视图。'); }
}

export function validateStoreRevision(value: unknown): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('空间读取修订必须是十进制字符串。');
  return value;
}

export function stagedLimits(caps: Capabilities): StagedLimits {
  if (!caps.features.includes('commits.staged')) throw new Error('服务端尚未提供暂存提交能力。');
  const keys = ['stagedBatchOperations', 'stagedBatchBytes', 'stagedCommitOperations', 'stagedCommitBytes', 'stagedBatchCount', 'stagedOpenSessionsPerAccount', 'stagedOpenSessionsPerWorkspace', 'stagedWorkspaceBytes', 'stagedLifetimeSeconds', 'stagedReceiptSeconds'] as const;
  if (keys.some(key => !Number.isSafeInteger(caps.limits[key]) || caps.limits[key]! < 1)) throw new Error('暂存提交限额响应无效。');
  if (caps.stagedCommits?.idempotencyScope !== 'workspace+commitId' || caps.stagedCommits.batchIdentity !== 'sha256-raw-utf8' || caps.stagedCommits.contentEncoding !== 'identity' || !Number.isSafeInteger(caps.stagedCommits.receiptSeconds) || caps.stagedCommits.receiptSeconds < 1) throw new Error('暂存提交重试契约不兼容。');
  return caps.limits as Limits & StagedLimits;
}

export function validateCapabilities(input: Capabilities): Capabilities {
  const required = ['resources.json', 'resources.conditions', 'commits.atomic'];
  if (input?.apiVersion !== 'v1' || !Array.isArray(input.features) || required.some(feature => !input.features.includes(feature))) throw new Error('服务端缺少 JSON、条件写入或原子提交能力，不能连接。');
  if (input.authentication?.scheme !== 'Bearer' || input.authentication?.scope !== 'workspace') throw new Error('服务端认证方式不兼容。');
  const limits = ['resourceBytes', 'metadataBytes', 'attachmentBytes', 'requestBytes', 'commitOperations', 'resourceAttachments', 'pageSize'] as const;
  if (!input.limits || limits.some(key => !Number.isSafeInteger(input.limits[key]) || input.limits[key] < 1)) throw new Error('服务端限制响应无效。');
  if (input.features.includes('commits.staged')) stagedLimits(input);
  validateReadCapabilities(input);
  return input;
}

export function byteSize(value: unknown) { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
export async function sha256(bytes: Uint8Array<ArrayBuffer>) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function fromDataUrl(value: string) {
  const match = /^data:(image\/(?:png|jpeg|webp|gif|avif));base64,([\s\S]*)$/i.exec(value);
  if (!match) throw new Error('本地壁纸必须使用 PNG、JPEG、WebP、GIF 或 AVIF 格式。');
  const decoded = atob(match[2]);
  return { bytes: Uint8Array.from(decoded, char => char.charCodeAt(0)), contentType: match[1].toLowerCase() };
}

export async function prepareResource(key: string, content: unknown, client: Client, caps: Capabilities, uploads: Map<string, Upload>): Promise<ResourceBody> {
  let wire = content;
  const attachmentIds: string[] = [];
  if (key === 'wallpaper.json') {
    const wallpaper = content as Record<string, unknown>;
    if (typeof wallpaper.customWallpaperUrl === 'string' && wallpaper.customWallpaperUrl.startsWith('data:')) {
      if (!['attachments', 'attachments.references'].every(feature => caps.features.includes(feature))) throw new Error('服务端不支持壁纸附件，请使用网络图片。');
      const { bytes, contentType } = fromDataUrl(wallpaper.customWallpaperUrl);
      if (bytes.byteLength > Math.min(caps.limits.attachmentBytes, caps.limits.requestBytes)) throw new Error('壁纸超过服务端附件或请求大小限制。');
      const hash = await sha256(bytes);
      let upload = uploads.get(hash);
      if (!upload) {
        upload = await client<Upload>('/attachments?filename=wallpaper', { method: 'POST', headers: { 'Content-Type': contentType }, body: bytes });
        if (!upload || !UUID.test(upload.id) || upload.sha256 !== hash || upload.size !== bytes.byteLength || upload.contentType !== contentType) throw new AttachmentIntegrityError(upload?.id);
        uploads.set(hash, upload);
      }
      wire = { ...wallpaper, customWallpaperUrl: undefined, imageAttachment: upload };
      attachmentIds.push(upload.id);
    }
  }
  const jsonContent = { value: wire };
  if (byteSize(jsonContent) > caps.limits.resourceBytes) throw new Error(`资源 ${key} 超过服务端正文限制，请减少单项内容。`);
  if (byteSize({}) > caps.limits.metadataBytes || attachmentIds.length > caps.limits.resourceAttachments) throw new Error('资源元数据或附件引用超过服务端限制。');
  return { key, title: key, format: RESOURCE_FORMAT, formatVersion: 1, kind: 'json', contentType: 'application/json', jsonContent, metadata: {}, attachmentIds };
}

async function loadResourcesOnce(client: Client, download: (id: string, image: Upload) => Promise<ArrayBuffer>, caps: Capabilities, uploads: Map<string, Upload>, knownKeys: Iterable<string>, cached = new Map<string, StoredResource>()) {
  const records = new Map<string, StoredResource>();
  const blocked = new Set<string>();
  const seen = new Set<string>();
  const summaries: Summary[] = [];
  const pageSize = Math.min(100, caps.limits.pageSize);
  let total: number | null = null;
  for (let page = 1; ; page++) {
    const result = await client<{ items: Summary[]; pageNumber: number; pageSize: number; total: number }>(`/resources?page=${page}&pageSize=${pageSize}`);
    if (!Array.isArray(result.items) || result.pageNumber !== page || result.pageSize !== pageSize || !Number.isSafeInteger(result.total) || result.total < 0 || result.items.length > pageSize || (total !== null && total !== result.total)) throw new Error('资源分页响应无效或读取期间发生变化。');
    total = result.total;
    for (const summary of result.items) {
      if (!summary || typeof summary.key !== 'string' || seen.has(summary.key)) throw new Error('分页期间资源发生变化，请重新读取。');
      seen.add(summary.key);
      if (!isManagedKey(summary.key)) continue;
      if (summary.format !== RESOURCE_FORMAT || summary.formatVersion !== 1 || summary.kind !== 'json') { blocked.add(summary.key); continue; }
      summaries.push(summary);
    }
    if (page * pageSize >= result.total) break;
    if (result.items.length === 0 || page >= 100000) throw new Error('资源分页不完整。');
  }
  if (seen.size !== total) throw new Error('资源分页数量不完整；保留当前本地视图。');
  const missing = new Set(knownKeys);
  for (const summary of summaries) missing.delete(summary.key);
  for (const key of missing) {
    if (blocked.has(key)) continue;
    try {
      const current = await client<Resource>(`/resources/by-key?key=${encodeURIComponent(key)}`);
      if (current?.summary?.key !== key) throw new Error('按键读取的资源不匹配。');
      const summary = current.summary;
      if (summary.format !== RESOURCE_FORMAT || summary.formatVersion !== 1 || summary.kind !== 'json') blocked.add(key);
      else summaries.push(summary);
    } catch (error) {
      if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 404) throw error;
    }
  }
  const wanted = summaries.filter(summary => {
    if (!UUID.test(summary.id) || !Number.isSafeInteger(summary.version) || summary.version < 1) throw new Error('资源摘要无效。');
    const previous = cached.get(summary.key);
    return previous?.id !== summary.id || previous.version !== summary.version || !Object.hasOwn(previous, 'content');
  });
  const bodies = await readBodies(client, caps, wanted.map(({ id }) => ({ id })));
  await hydrateResources(summaries, bodies, records, cached, download, caps, uploads);
  validateReferences(records);
  return { records, blocked, consistency: 'unfenced' as const };
}

async function hydrateResources(summaries: Summary[], bodies: Map<string, Resource>, records: Map<string, StoredResource>, cached: Map<string, StoredResource>, download: (id: string, image: Upload) => Promise<ArrayBuffer>, caps: Capabilities, uploads: Map<string, Upload>) {
  for (let offset = 0; offset < summaries.length; offset += 6) {
    await Promise.all(summaries.slice(offset, offset + 6).map(async summary => {
      if (!UUID.test(summary.id) || !Number.isSafeInteger(summary.version) || summary.version < 1) throw new Error('资源摘要无效。');
      const previous = cached.get(summary.key);
      if (previous?.id === summary.id && previous.version === summary.version && Object.hasOwn(previous, 'content')) {
        records.set(summary.key, previous);
        return;
      }
      const resource = bodies.get(summary.id);
      if (resource?.summary?.key !== summary.key || resource.summary.id !== summary.id || resource.summary.version !== summary.version || resource.summary.format !== RESOURCE_FORMAT || resource.summary.formatVersion !== 1 || resource.summary.kind !== 'json' || !Array.isArray(resource.attachmentIds)) throw new Error('读取期间资源发生变化，请重新读取。');
      if (!resource.jsonContent || typeof resource.jsonContent !== 'object' || !Object.hasOwn(resource.jsonContent, 'value')) throw new Error('云端资源内容包络无效。');
      let content = (resource.jsonContent as { value: unknown }).value;
      if (summary.key === 'wallpaper.json') {
        const wallpaper = content as Record<string, unknown> | null;
        if (wallpaper?.imageAttachment) {
          const image = wallpaper.imageAttachment as Upload;
          if (!['attachments', 'attachments.references'].every(feature => caps.features.includes(feature)) || !UUID.test(image.id) || !resource.attachmentIds.includes(image.id) || !/^image\/(png|jpeg|webp|gif|avif)$/.test(image.contentType) || !Number.isSafeInteger(image.size) || image.size > caps.limits.attachmentBytes) throw new Error('壁纸附件引用无效。');
          const bytes = new Uint8Array(await download(image.id, image));
          if (bytes.byteLength !== image.size || await sha256(bytes) !== image.sha256) throw new Error('壁纸下载大小或 SHA-256 校验失败。');
          let binary = '';
          for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
          const { imageAttachment: _image, ...settings } = wallpaper;
          content = { ...settings, customWallpaperUrl: `data:${image.contentType};base64,${btoa(binary)}` };
          uploads.set(image.sha256, image);
        }
      }
      if (summary.key === 'app.json' && semanticJson(content) !== semanticJson({ schemaVersion: 1 })) throw new Error('不支持此云端数据版本。');
      records.set(summary.key, { id: summary.id, version: summary.version, content });
    }));
  }
}

function validateReferences(records: Map<string, StoredResource>) {
  const referenced = new Set<string>();
  for (const [key, record] of records) {
    if (!key.endsWith('/order.json') || !Array.isArray(record.content)) continue;
    for (const id of record.content) {
      if (typeof id !== 'string' || /[\\/%\x00-\x1f\x7f]/.test(id) || ['.', '..', 'order'].includes(id)) throw new Error('顺序清单 ID 无效。');
      referenced.add(`${key.slice(0, -'order.json'.length)}${id}.json`);
    }
  }
  if ([...referenced].some(key => !records.has(key))) throw new Error('分页遗漏顺序清单引用的资源；保留本地视图，需重新完整加载。');
}

export async function loadResources(client: Client, download: (id: string, image: Upload) => Promise<ArrayBuffer>, caps: Capabilities, uploads: Map<string, Upload>, knownKeys: Iterable<string> = [], baseline?: ResourceBaseline, force = false): Promise<{ records: Map<string, StoredResource>; blocked: Set<string>; consistency: 'fenced' | 'unfenced'; storeRevision?: string; checkedAt: number }> {
  if (baseline && [...baseline.records.values()].some(record => record.content === undefined || !UUID.test(record.id) || !Number.isSafeInteger(record.version) || record.version < 1)) baseline = undefined;
  const keys = [...knownKeys];
  const fenced = caps.features.includes('resources.read-fence');
  if (fenced && baseline?.storeRevision !== undefined && !force && Date.now() - baseline.checkedAt < 300000) return { ...baseline, records: new Map(baseline.records), blocked: new Set(baseline.blocked), consistency: 'fenced' };
  let incremental = fenced && baseline?.storeRevision !== undefined && baseline.blocked.size === 0 && caps.features.includes('resources.changes') &&
    (caps.features.includes('resources.batch-read') || caps.features.includes('resources.revisions'));
  for (let attempt = 0; attempt < 3; attempt++) {
    const bufferedUploads = new Map(uploads);
    const revision = fenced ? validateStoreRevision((await client<{ storeRevision: string }>('/read-state')).storeRevision) : undefined;
    if (fenced && baseline && revision === baseline.storeRevision) return { ...baseline, records: new Map(baseline.records), blocked: new Set(baseline.blocked), consistency: 'fenced', checkedAt: Date.now() };
    if (incremental && baseline?.storeRevision !== undefined) {
      try {
        const delta = await readDelta(client, caps, baseline.storeRevision);
        const records = new Map(baseline.records);
        const blocked = new Set<string>();
        for (const [key, record] of records) {
          const change = delta.changes.get(record.id);
          if (!change) continue;
          if (change.version <= record.version) throw new Error('资源增量版本未递增。');
          records.delete(key);
        }
        const summaries: Summary[] = [];
        const seenKeys = new Set(records.keys());
        for (const change of delta.changes.values()) {
          if (change.deleted || !isManagedKey(change.key)) continue;
          if (seenKeys.has(change.key)) throw new Error('资源增量出现重复逻辑键。');
          seenKeys.add(change.key);
          const summary = delta.bodies.get(change.id)?.summary;
          if (change.format !== RESOURCE_FORMAT || summary?.formatVersion !== 1 || summary.kind !== 'json') { blocked.add(change.key); continue; }
          summaries.push(summary);
        }
        await hydrateResources(summaries, delta.bodies, records, new Map(), download, caps, bufferedUploads);
        validateReferences(records);
        for (const [hash, upload] of bufferedUploads) uploads.set(hash, upload);
        return { records, blocked, consistency: 'fenced', storeRevision: delta.targetRevision, checkedAt: Date.now() };
      } catch (error) {
        const details = error && typeof error === 'object' && 'details' in error ? error.details : null;
        if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 410 || !details || typeof details !== 'object' || !('fullSyncRequired' in details) || details.fullSyncRequired !== true) throw error;
        incremental = false;
        continue;
      }
    }
    const scoped: Client = (path, options = {}) => {
      const headers = new Headers(options.headers);
      if (revision !== undefined) headers.set('If-Store-Revision', revision);
      return client(path, { ...options, headers });
    };
    try {
      const loaded = await loadResourcesOnce(scoped, download, caps, bufferedUploads, fenced ? [] : keys, baseline?.records);
      for (const [hash, upload] of bufferedUploads) uploads.set(hash, upload);
      return { ...loaded, consistency: fenced ? 'fenced' : 'unfenced', storeRevision: revision, checkedAt: Date.now() };
    } catch (error) {
      const details = error && typeof error === 'object' && 'details' in error ? error.details : null;
      if (!error || typeof error !== 'object' || !('status' in error) || error.status !== 409 || !details || typeof details !== 'object' || !('reason' in details) || details.reason !== 'read_revision_changed' || attempt === 2) throw error;
    }
  }
  throw new ReadRevisionChanged();
}