import { isManagedKey, RESOURCE_FORMAT, semanticJson } from './cloudResources';

export type Client = <T>(path: string, options?: RequestInit) => Promise<T>;
export type Limits = { resourceBytes: number; metadataBytes: number; attachmentBytes: number; requestBytes: number; commitOperations: number; resourceAttachments: number; pageSize: number };
export type Capabilities = { apiVersion: string; features: string[]; limits: Limits; authentication: { scheme: string; scope: string } };
export type StoredResource = { id: string; version: number; content: unknown };
export type Upload = { id: string; sha256: string; size: number; contentType: string };
export type ResourceBody = { key: string; title: string; format: string; formatVersion: number; kind: 'json'; contentType: 'application/json'; jsonContent: unknown; metadata: Record<string, never>; attachmentIds: string[] };
type Summary = { id: string; key: string; version: number; format: string; formatVersion: number; kind: string };
type Resource = { summary: Summary; jsonContent: unknown; attachmentIds: string[] };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCapabilities(input: Capabilities): Capabilities {
  const required = ['resources.json', 'resources.conditions', 'commits.atomic'];
  if (input?.apiVersion !== 'v1' || !Array.isArray(input.features) || required.some(feature => !input.features.includes(feature))) throw new Error('服务端缺少 JSON、条件写入或原子提交能力，不能连接。');
  if (input.authentication?.scheme !== 'Bearer' || input.authentication?.scope !== 'workspace') throw new Error('服务端认证方式不兼容。');
  const limits = ['resourceBytes', 'metadataBytes', 'attachmentBytes', 'requestBytes', 'commitOperations', 'resourceAttachments', 'pageSize'] as const;
  if (!input.limits || limits.some(key => !Number.isSafeInteger(input.limits[key]) || input.limits[key] < 1)) throw new Error('服务端限制响应无效。');
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
        if (!UUID.test(upload.id) || upload.sha256 !== hash || upload.size !== bytes.byteLength || upload.contentType !== contentType) throw new Error('壁纸上传大小或 SHA-256 校验失败。');
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

export async function loadResources(client: Client, download: (id: string) => Promise<ArrayBuffer>, caps: Capabilities, uploads: Map<string, Upload>) {
  const records = new Map<string, StoredResource>();
  const blocked = new Set<string>();
  const seen = new Set<string>();
  const summaries: Summary[] = [];
  const pageSize = Math.min(100, caps.limits.pageSize);
  for (let page = 1; ; page++) {
    const result = await client<{ items: Summary[]; pageNumber: number; pageSize: number; total: number }>(`/resources?page=${page}&pageSize=${pageSize}`);
    if (!Array.isArray(result.items) || result.pageNumber !== page || result.pageSize !== pageSize || !Number.isSafeInteger(result.total) || result.total < 0 || result.items.length > pageSize) throw new Error('资源分页响应无效。');
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
  for (let offset = 0; offset < summaries.length; offset += 6) {
    await Promise.all(summaries.slice(offset, offset + 6).map(async summary => {
      if (!UUID.test(summary.id) || !Number.isSafeInteger(summary.version) || summary.version < 1) throw new Error('资源摘要无效。');
      const resource = await client<Resource>(`/resources/${summary.id}`);
      if (resource?.summary?.key !== summary.key || resource.summary.id !== summary.id || resource.summary.version !== summary.version || resource.summary.format !== RESOURCE_FORMAT || resource.summary.formatVersion !== 1 || resource.summary.kind !== 'json' || !Array.isArray(resource.attachmentIds)) throw new Error('读取期间资源发生变化，请重新读取。');
      if (!resource.jsonContent || typeof resource.jsonContent !== 'object' || !Object.hasOwn(resource.jsonContent, 'value')) throw new Error('云端资源内容包络无效。');
      let content = (resource.jsonContent as { value: unknown }).value;
      if (summary.key === 'wallpaper.json') {
        const wallpaper = content as Record<string, unknown> | null;
        if (wallpaper?.imageAttachment) {
          const image = wallpaper.imageAttachment as Upload;
          if (!['attachments', 'attachments.references'].every(feature => caps.features.includes(feature)) || !UUID.test(image.id) || !resource.attachmentIds.includes(image.id) || !/^image\/(png|jpeg|webp|gif|avif)$/.test(image.contentType) || !Number.isSafeInteger(image.size) || image.size > caps.limits.attachmentBytes) throw new Error('壁纸附件引用无效。');
          const bytes = new Uint8Array(await download(image.id));
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
  return { records, blocked };
}