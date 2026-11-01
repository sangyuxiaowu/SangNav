import { validateCloudValues } from './cloudSchema';
import { forgetAccount, recallAccount, rememberAccount } from './credentialVault';
import { isManagedKey, joinDocuments, semanticJson, splitDocuments } from './cloudResources';
import { AttachmentIntegrityError, loadResources, ReadRevisionChanged, UUID, validateCapabilities, type Capabilities, type Client, type StoredResource, type Upload } from './cloudProtocol';
import { CommitResultUnconfirmed, diffDocuments, planBatches, saveBatch, type Change } from './cloudSync';
import { buildStagedPlan, cancelStagedPlan, deleteStagedDraft, readStagedDraft, resumeStagedPlan, saveStagedDraft, StagedSessionUnavailable, validateStagedPlan, type StagedPlan } from './cloudStaged';

type Values = Record<string, unknown>;
type Snapshot = { schemaVersion: 1; values: Values };
type Session = { accessToken: string; expiresAt: string; resourceUserId: string; workspaceId: string };
type Draft = { schemaVersion: 2; snapshot: Snapshot; records: [string, StoredResource][]; identities: [string, string][]; uploads: [string, Upload][]; atomicPublish?: boolean; publication?: 'restore' | 'independent'; unconfirmed?: boolean; plan?: Change[]; unverifiedAttachmentIds?: string[]; stagedPlan?: StagedPlan; durableStaged?: boolean; storeRevision?: string };
export type CloudState = {
  status: 'local' | 'connecting' | 'saved' | 'pending' | 'saving' | 'error' | 'conflict' | 'expired' | 'unconfirmed';
  username: string;
  workspaceUrl: string;
  message: string;
};

const listeners = new Set<() => void>();
const defaults: Values = {};
const local: Values = {};
let values: Values = local;
let state: CloudState = { status: 'local', username: '', workspaceUrl: '', message: '' };
let session: Session | null = null;
let draftKey = '';
let records = new Map<string, StoredResource>();
let blocked = new Set<string>();
let identities = new Map<string, string>();
let uploads = new Map<string, Upload>();
let capabilities: Capabilities | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let dirty = false;
let busy = false;
let backgroundLoading = false;
let atomicPublish = false;
let stagedPlan: StagedPlan | undefined;
let storeRevision: string | undefined;
let unverifiedAttachmentIds: string[] = [];
let draftPersistenceFailed = false;
let renewalTimer: ReturnType<typeof setTimeout> | undefined;
let renewal: Promise<void> | null = null;
const loginRetryUntil = new Map<string, number>();

function scheduleRenewal(delay?: number) {
  clearTimeout(renewalTimer);
  if (!session) return;
  renewalTimer = setTimeout(() => {
    void renewCloudSession().then(async () => {
      if (state.status === 'error') await reconcileCloud(false);
    }).catch(error => {
      const invalid = error instanceof CloudError && error.status === 401;
      updateState({ status: invalid ? 'expired' : 'error', message: error instanceof Error ? error.message : '自动重新登录暂时失败，将稍后重试。' });
      if (!invalid) scheduleRenewal(Math.max(60000, error instanceof CloudError ? error.retryAfterMs : 0));
    });
  }, delay ?? Math.max(1000, Math.min(2147483647, Date.parse(session.expiresAt) - Date.now() - 30000)));
}

async function renewCloudSession() {
  if (renewal) return renewal;
  const active = session;
  const attempt = generation;
  if (!active) throw new CloudError(401, '请重新登录云端账户。');
  renewal = (async () => {
    const account = await recallAccount();
    if (!account || account.workspaceUrl !== state.workspaceUrl || account.session.resourceUserId !== active.resourceUserId) throw new CloudError(401, '无法读取已保存的账户，请重新登录。');
    let next: Session;
    try {
      next = await request<Session>(`${account.workspaceUrl}/login`, null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: account.username, password: account.password }) });
    } catch (error) {
      if (error instanceof CloudError && error.status === 401) await forgetAccount();
      throw error;
    }
    if (!next.accessToken || next.resourceUserId !== active.resourceUserId || next.workspaceId !== active.workspaceId || !(Date.parse(next.expiresAt) > Date.now())) throw new CloudError(401, '重新登录响应无效，请重新登录。');
    if (attempt !== generation) return;
    await rememberAccount({ ...account, session: next });
    if (attempt !== generation) return;
    session = next;
    scheduleRenewal();
  })().finally(() => { renewal = null; });
  return renewal;
}

async function authenticatedFetch(url: string, token: string | null, options: RequestInit = {}) {
  const activeRequest = !!token && !!session && url.startsWith(`${state.workspaceUrl}/`);
  if (activeRequest && Date.parse(session!.expiresAt) <= Date.now()) await renewCloudSession();
  let sentToken: string | null = null;
  const send = () => {
    const headers = new Headers(options.headers);
    sentToken = activeRequest ? session?.accessToken || token : token;
    if (sentToken) headers.set('Authorization', `Bearer ${sentToken}`);
    return fetch(url, { ...options, headers, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(30000) });
  };
  let response = await send();
  if (response.status === 401 && activeRequest) {
    if (session?.accessToken === sentToken) await renewCloudSession();
    response = await send();
  }
  return response;
}

export class CloudError extends Error {
  constructor(public status: number, message: string, public retryAfterMs = 0, public details?: unknown) { super(message); }
}

function emit() { for (const listener of listeners) listener(); }
function updateState(patch: Partial<CloudState>) {
  state = { ...state, ...patch };
  if (dirty && draftPersistenceFailed && !state.message.includes('浏览器无法保留草稿')) state = { ...state, message: `${state.message} 浏览器无法保留草稿，请立即完整备份。`.trim() };
  emit();
}
export function subscribeStorage(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function getCloudState() { return state; }
export function isCloudActive() { return values !== local; }

export function readValue<T>(key: string, initialValue: T): T {
  if (!(key in defaults)) defaults[key] = initialValue;
  if (!(key in local)) {
    try { local[key] = JSON.parse(localStorage.getItem(key) || 'null') ?? initialValue; }
    catch { local[key] = initialValue; }
  }
  return (key in values ? values[key] : defaults[key]) as T;
}

export function writeValue<T>(key: string, value: T | ((previous: T) => T), initialValue: T) {
  if (state.status === 'connecting' && !isCloudActive()) return;
  const next = typeof value === 'function' ? (value as (previous: T) => T)(readValue(key, initialValue)) : value;
  values = { ...values, [key]: next };
  if (!isCloudActiveBeforeWrite()) {
    local[key] = next;
    values = local;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
    emit();
    return;
  }
  dirty = true;
  persistDraft();
  if (!['error', 'conflict', 'expired', 'unconfirmed'].includes(state.status)) {
    updateState({ status: 'pending', message: '' });
    scheduleSave();
  } else emit();
}

function isCloudActiveBeforeWrite() { return !!draftKey; }
function snapshot(): Snapshot { return { schemaVersion: 1, values: { ...defaults, ...values } }; }
function changes() { return diffDocuments(splitDocuments(snapshot().values), records, identities); }
const client: Client = (path, options) => {
  if (!session) throw new CloudError(401, '请重新登录。');
  return request(`${state.workspaceUrl}${path}`, session.accessToken, options);
};
async function loadCurrent() {
  if (!session || !capabilities) throw new Error('云端连接尚未就绪。');
  return loadResources(client, async id => {
    const response = await authenticatedFetch(`${state.workspaceUrl}/attachments/${id}`, session!.accessToken);
    if (!response.ok) throw new CloudError(response.status, '壁纸附件下载失败。');
    return response.arrayBuffer();
  }, capabilities, uploads, new Set([...records.keys(), ...splitDocuments(defaults).keys()]));
}
function persistDraft() {
  try {
    const draft = draftSnapshot();
    if (stagedPlan) void saveStagedDraft(draftKey, draft).catch(() => { draftPersistenceFailed = true; });
    localStorage.setItem(draftKey, JSON.stringify({ ...draft, stagedPlan: undefined, durableStaged: !!stagedPlan }));
    draftPersistenceFailed = false;
  } catch { draftPersistenceFailed = true; }
}
function draftSnapshot(): Draft {
  const plan = changes();
  return { schemaVersion: 2, snapshot: snapshot(), records: [...records], identities: [...identities], uploads: [...uploads], plan, atomicPublish, publication: atomicPublish ? 'restore' : 'independent', unconfirmed: state.status === 'unconfirmed', unverifiedAttachmentIds, stagedPlan, storeRevision };
}
async function checkpointStaged() {
  if (!stagedPlan) throw new Error('暂存计划缺失，未发送请求。');
  await saveStagedDraft(draftKey, draftSnapshot());
  draftPersistenceFailed = false;
}
function scheduleSave() {
  clearTimeout(timer);
  timer = setTimeout(() => { void saveCloud(); }, 700);
}

export function normalizeWorkspaceUrl(input: string) {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('空间地址必须使用 HTTPS（本机开发地址除外）。');
  }
  if (url.username || url.password || url.search || url.hash || !/\/api\/v1\/workspaces\/[A-Za-z0-9_-]{12}\/?$/.test(url.pathname)) {
    throw new Error('请输入后台提供的完整空间接入地址。');
  }
  return url.href.replace(/\/$/, '');
}

async function request<T>(url: string, token: string | null, options: RequestInit = {}): Promise<T> {
  const waiting = (loginRetryUntil.get(url) || 0) - Date.now();
  if (waiting > 0) throw new CloudError(429, `登录限流，请在 ${Math.ceil(waiting / 1000)} 秒后重试。`, waiting);
  const response = await authenticatedFetch(url, token, options);
  if (response.status === 204) return undefined as T;
  const envelope = await response.json().catch(() => null);
  if (!response.ok || !envelope || envelope.code !== 0) {
    const retry = response.headers.get('Retry-After');
    const retryAfterMs = response.status === 429 ? Math.max(1000, retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : retry && Number.isFinite(Date.parse(retry)) ? Date.parse(retry) - Date.now() : 60000) : 0;
    if (response.status === 429 && url.endsWith('/login')) loginRetryUntil.set(url, Date.now() + retryAfterMs);
    const message = response.status === 429 ? `登录过于频繁，请在 ${Math.ceil(retryAfterMs / 1000)} 秒后重试。` : envelope?.msg || `请求失败（HTTP ${response.status}）`;
    throw new CloudError(response.status, message, retryAfterMs, envelope?.data);
  }
  const revision = new Headers(options.headers).get('If-Store-Revision');
  if (revision !== null && response.headers.get('Store-Revision') !== revision) throw new ReadRevisionChanged();
  return envelope.data as T;
}

function validateSnapshot(input: unknown): Snapshot {
  if (!input || typeof input !== 'object') throw new Error('云端数据格式无效。');
  const result = input as Snapshot;
  if (result.schemaVersion !== 1 || !result.values || typeof result.values !== 'object' || Array.isArray(result.values)) throw new Error('无法读取此版本的云端数据。');
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = result.values[key];
    if (value === undefined || (Array.isArray(fallback) ? !Array.isArray(value) : fallback !== null && (typeof value !== typeof fallback || value === null))) {
      throw new Error(`云端字段 ${key} 无效，已保留当前数据。`);
    }
  }
  validateCloudValues(result.values);
  return result;
}

export async function loginCloud(workspaceUrl: string, username: string, password: string, importLocal: boolean, analytics: Values, existingSession?: Session, useCache = false) {
  if (isCloudActive() || busy) throw new Error('请先退出当前云端账户。');
  const url = normalizeWorkspaceUrl(workspaceUrl);
  const attempt = ++generation;
  updateState({ status: 'connecting', message: '' });
  let authenticated: Session | null = null;
  let cachedUnconfirmed = false;
  try {
    if (useCache && existingSession) {
      const key = `sangnav_cloud_draft:v2:${url}:${existingSession.resourceUserId}`;
      let cached: Draft | null = null;
      try {
        cached = await readStagedDraft<Draft>(key) || JSON.parse(localStorage.getItem(key) || 'null');
        if (cached) {
          validateSnapshot(cached.snapshot);
          if (cached.schemaVersion !== 2 || cached.durableStaged && !cached.stagedPlan || !Array.isArray(cached.records) || !Array.isArray(cached.identities) || !Array.isArray(cached.uploads) || cached.records.some(([recordKey, record]) => !isManagedKey(recordKey) || !record || !UUID.test(record.id) || !Number.isSafeInteger(record.version) || record.version < 1)) cached = null;
        }
      } catch { cached = null; }
      if (cached && attempt === generation) {
        backgroundLoading = true;
        session = existingSession;
        draftKey = key;
        values = cached.snapshot.values;
        records = new Map(cached.records);
        blocked = new Set();
        capabilities = null;
        identities = new Map(cached.identities);
        uploads = new Map(cached.uploads);
        storeRevision = cached.storeRevision;
        stagedPlan = cached.stagedPlan ? validateStagedPlan(cached.stagedPlan) : undefined;
        atomicPublish = cached.publication === 'restore' || !!cached.atomicPublish;
        unverifiedAttachmentIds = cached.unverifiedAttachmentIds || [];
        dirty = !!stagedPlan || changes().length > 0;
        cachedUnconfirmed = !!cached.unconfirmed || !!stagedPlan;
        updateState({ workspaceUrl: url, username: username.trim(), status: cachedUnconfirmed ? 'unconfirmed' : 'connecting', message: '' });
      }
    }
    authenticated = existingSession || await request<Session>(`${url}/login`, null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
    if (!authenticated.accessToken || !UUID.test(authenticated.resourceUserId) || authenticated.workspaceId !== url.split('/').pop() || !Number.isFinite(Date.parse(authenticated.expiresAt))) throw new Error('登录响应无效。');
    capabilities = validateCapabilities(await request<Capabilities>(`${url}/capabilities`, authenticated.accessToken));
    const loadedUploads = new Map<string, Upload>();
    const remote = await loadResources((path, options) => request(`${url}${path}`, authenticated!.accessToken, options), async id => {
      const response = await authenticatedFetch(`${url}/attachments/${id}`, authenticated!.accessToken);
      if (!response.ok) throw new CloudError(response.status, '壁纸附件下载失败。');
      return response.arrayBuffer();
    }, capabilities, loadedUploads, splitDocuments(defaults).keys());
    if (attempt !== generation) return;
    if (backgroundLoading && session) authenticated = session;
    const durable = await readStagedDraft<Draft>(`sangnav_cloud_draft:v2:${url}:${authenticated.resourceUserId}`);
    if (attempt !== generation) return;
    session = authenticated;
    records = remote.records;
    blocked = remote.blocked;
    uploads = loadedUploads;
    identities = new Map();
    stagedPlan = undefined;
    storeRevision = remote.storeRevision;
    draftKey = `sangnav_cloud_draft:v2:${url}:${authenticated.resourceUserId}`;
    const hasData = records.size > 0;
    atomicPublish = false;
    unverifiedAttachmentIds = [];
    const initial = { ...defaults, ...(hasData ? {} : importLocal ? { ...local, ...analytics } : {}) };
    values = validateSnapshot({ schemaVersion: 1, values: joinDocuments(new Map([...records].map(([key, record]) => [key, record.content])), initial) }).values;
    dirty = changes().length > 0;
    let recovered: Draft | null = null;
    try { recovered = JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch { /* Ignore malformed local drafts. */ }
    if (durable) recovered = durable;
    else if (recovered?.durableStaged) throw new Error('暂存计划的持久副本缺失，已停止自动提交；请保留草稿并人工核对。');
    updateState({ workspaceUrl: url, username: username.trim(), status: dirty ? 'pending' : 'saved', message: '' });
    if (recovered) {
      const savedDraft = validateSnapshot(recovered.snapshot);
      if (recovered.schemaVersion !== 2 || !Array.isArray(recovered.records) || !Array.isArray(recovered.identities) || !Array.isArray(recovered.uploads)) throw new Error('本机草稿格式无效，请先备份原始草稿。');
      const previous = new Map(recovered.records);
      if ([...previous].some(([key, record]) => !isManagedKey(key) || !record || !UUID.test(record.id) || !Number.isSafeInteger(record.version) || record.version < 1)) throw new Error('本机草稿版本无效。');
      identities = new Map(recovered.identities);
      stagedPlan = recovered.stagedPlan ? validateStagedPlan(recovered.stagedPlan) : undefined;
      atomicPublish = recovered.publication === 'restore' || (recovered.publication === undefined && !!recovered.atomicPublish && recovered.records.length > 0);
      unverifiedAttachmentIds = recovered.unverifiedAttachmentIds || [];
      for (const [hash, upload] of recovered.uploads) uploads.set(hash, upload);
      const edits = diffDocuments(splitDocuments(savedDraft.values), previous, identities);
      const merged = new Map([...records].map(([key, record]) => [key, record.content]));
      let conflict = false;
      for (const edit of edits) {
        const latest = records.get(edit.key);
        if (edit.deleted ? !latest : latest && semanticJson(latest.content) === semanticJson(edit.content)) continue;
        if ((latest?.version ?? null) !== edit.expectedVersion || (latest && latest.id !== edit.id)) conflict = true;
        if (edit.deleted) merged.delete(edit.key); else merged.set(edit.key, edit.content);
        const base = previous.get(edit.key);
        if (base) records.set(edit.key, base); else records.delete(edit.key);
      }
      values = validateSnapshot({ schemaVersion: 1, values: joinDocuments(merged, defaults) }).values;
      dirty = !!stagedPlan || changes().length > 0;
      updateState({ status: stagedPlan || recovered.unconfirmed && dirty ? 'unconfirmed' : conflict ? 'conflict' : dirty ? 'pending' : 'saved', message: stagedPlan ? '已恢复暂存提交原始计划，请核实并续传同一提交。' : recovered.unconfirmed && dirty ? '已恢复结果待确认的提交计划，请先核实云端状态。' : dirty ? '已恢复此空间中当前身份未保存的本机草稿。' : '' });
    }
    persistDraft();
    if (dirty && !['conflict', 'unconfirmed'].includes(state.status)) scheduleSave();
    try { await rememberAccount({ workspaceUrl: url, username: username.trim(), password, session: authenticated }); }
    catch { updateState({ message: '浏览器无法加密保存账户，当前登录有效，刷新后需重新登录。' }); }
    scheduleRenewal();
    emit();
  } catch (error) {
    if (backgroundLoading && attempt === generation) {
      updateState({ status: error instanceof CloudError && error.status === 401 ? 'expired' : cachedUnconfirmed ? 'unconfirmed' : 'error', message: `云端暂不可用，正在使用本机缓存。${error instanceof Error ? error.message : ''}` });
      scheduleRenewal(60000);
      throw error;
    }
    if (authenticated && !existingSession) void request(`${url}/logout`, authenticated.accessToken, { method: 'POST' }).catch(() => {});
    session = null;
    draftKey = '';
    values = local;
    dirty = false;
    updateState({ status: 'local', username: '', workspaceUrl: '', message: error instanceof Error ? error.message : '登录失败。' });
    throw error;
  } finally { backgroundLoading = false; }
}

let restoring: Promise<void> | null = null;
export function restoreCloudAccount(): Promise<void> {
  if (restoring) return restoring;
  restoring = (async () => {
    if (isCloudActive() || state.status === 'connecting') return;
    updateState({ status: 'connecting', message: '' });
    try {
      const account = await recallAccount();
      if (!account) { updateState({ status: 'local' }); return; }
      const existing = account.session;
      try {
        await loginCloud(account.workspaceUrl, account.username, account.password, false, {}, existing, true);
      } catch (error) {
        if (!(error instanceof CloudError) || error.status !== 401) throw error;
        if (isCloudActive()) { await forgetAccount(); throw error; }
        if (!existing) { await forgetAccount(); throw error; }
        try { await loginCloud(account.workspaceUrl, account.username, account.password, false, {}); }
        catch (failure) {
          if (failure instanceof CloudError && failure.status === 401) await forgetAccount();
          throw failure;
        }
      }
    } catch (error) {
      if (!isCloudActive()) updateState({ status: 'local', message: error instanceof Error ? `自动登录失败：${error.message}` : '无法恢复账户，请重新登录。' });
    }
  })().finally(() => { restoring = null; });
  return restoring;
}

export async function saveCloud() {
  if (!session || !capabilities || !dirty || busy || backgroundLoading || ['error', 'conflict', 'expired', 'unconfirmed'].includes(state.status)) return;
  clearTimeout(timer);
  busy = true;
  const attempt = generation;
  updateState({ status: 'saving', message: '' });
  try {
    validateCloudValues(snapshot().values);
    const pending = changes();
    if (pending.some(change => blocked.has(change.key))) throw new Error('逻辑键被未知格式占用，已保留该资源，请先人工处理。');
    persistDraft();
    const shouldStage = !!stagedPlan || capabilities.features.includes('commits.staged') && pending.length > 0 && (atomicPublish || !records.has('app.json') || pending.length > capabilities.limits.commitOperations);
    if (shouldStage) {
      if (!stagedPlan) {
        if (capabilities.features.includes('resources.read-fence')) {
          const current = await loadCurrent();
          if (current.records.size !== records.size || [...records].some(([key, record]) => {
            const latest = current.records.get(key);
            return !latest || latest.id !== record.id || latest.version !== record.version;
          })) throw new CloudError(412, '暂存前核对发现远端变化，已保留原始草稿版本。');
          storeRevision = current.storeRevision;
        }
        stagedPlan = await buildStagedPlan(pending, client, capabilities, uploads, persistDraft, storeRevision);
      }
      await checkpointStaged();
      const currentPlan = stagedPlan;
      const receipt = await resumeStagedPlan(currentPlan, client, capabilities, checkpointStaged);
      if (attempt !== generation) return;
      for (const [index, change] of currentPlan.changes.entries()) {
        if (change.deleted) { records.delete(change.key); identities.delete(change.key); }
        else records.set(change.key, { id: change.id, version: receipt.items[index].version, content: change.content });
      }
      storeRevision = receipt.storeRevision;
      stagedPlan = undefined;
      await deleteStagedDraft(draftKey);
    }
    const batches = shouldStage || changes().length === 0 ? [] : planBatches(changes(), capabilities, atomicPublish);
    for (const batch of batches) {
      const result = await saveBatch(batch, client, capabilities, uploads, persistDraft);
      if (attempt !== generation) return;
      for (const [index, change] of batch.entries()) {
        if (change.deleted) { records.delete(change.key); identities.delete(change.key); }
        else records.set(change.key, { id: change.id, version: result[index].version, content: change.content });
      }
      persistDraft();
    }
    dirty = changes().length > 0;
    if (!dirty) atomicPublish = false;
    persistDraft();
    updateState({ status: dirty ? 'pending' : 'saved', message: '' });
  } catch (error) {
    if (attempt !== generation) return;
    const status = error instanceof CloudError ? error.status : 0;
    if (error instanceof AttachmentIntegrityError && error.attachmentId) unverifiedAttachmentIds.push(error.attachmentId);
    updateState({ status: error instanceof CommitResultUnconfirmed || error instanceof StagedSessionUnavailable ? 'unconfirmed' : status === 401 ? 'expired' : [409, 412].includes(status) ? 'conflict' : 'error', message: error instanceof AttachmentIntegrityError ? `${error.message} 附件 ID：${error.attachmentId || '未返回'}` : status === 401 ? '登录已失效，本机草稿已保留，请重新登录。' : [409, 412].includes(status) ? '云端版本已改变，本机修改已保留。' : error instanceof Error ? error.message : '保存失败，本机草稿已保留。' });
    persistDraft();
    if (stagedPlan) await checkpointStaged().catch(() => { draftPersistenceFailed = true; });
    if (status === 429) scheduleRenewal(Math.max(60000, error instanceof CloudError ? error.retryAfterMs : 0));
  } finally {
    busy = false;
    if (attempt === generation && dirty && state.status === 'pending') scheduleSave();
  }
}

export async function reconcileCloud(useRemote: boolean) {
  if (!session || busy || backgroundLoading) return;
  busy = true;
  const wasUnconfirmed = state.status === 'unconfirmed';
  try {
    if (!capabilities) capabilities = validateCapabilities(await client<Capabilities>('/capabilities'));
    if (stagedPlan && !useRemote) {
      busy = false;
      updateState({ status: 'pending', message: '正在查询暂存会话并续传原始批次。' });
      await saveCloud();
      return;
    }
    if (stagedPlan && useRemote) {
      await cancelStagedPlan(stagedPlan, client);
    }
    const remote = await loadCurrent();
    blocked = remote.blocked;
    if (useRemote) {
      values = validateSnapshot({ schemaVersion: 1, values: joinDocuments(new Map([...remote.records].map(([key, record]) => [key, record.content])), defaults) }).values;
      records = remote.records;
      stagedPlan = undefined;
      await deleteStagedDraft(draftKey);
      identities.clear();
      dirty = false;
      atomicPublish = false;
      storeRevision = remote.storeRevision;
      persistDraft();
      updateState({ status: 'saved', message: '' });
    } else {
      const pending = changes();
      const merged = new Map([...remote.records].map(([key, record]) => [key, record.content]));
      let conflict = false;
      for (const change of pending) {
        const latest = remote.records.get(change.key);
        if (change.deleted ? !latest : latest && semanticJson(latest.content) === semanticJson(change.content)) continue;
        if ((latest?.version ?? null) !== change.expectedVersion || (latest && latest.id !== change.id) || blocked.has(change.key)) conflict = true;
        if (change.deleted) merged.delete(change.key); else merged.set(change.key, change.content);
        const base = records.get(change.key);
        if (base) remote.records.set(change.key, base); else remote.records.delete(change.key);
        if (!latest && change.expectedVersion === null) identities.set(change.key, crypto.randomUUID());
      }
      values = validateSnapshot({ schemaVersion: 1, values: joinDocuments(merged, defaults) }).values;
      records = remote.records;
      storeRevision = remote.storeRevision;
      dirty = changes().length > 0;
      if (!dirty) atomicPublish = false;
      persistDraft();
      updateState({ status: conflict ? 'conflict' : dirty ? 'pending' : 'saved', message: conflict ? '同一资源已被其他设备修改，本机草稿已保留。请备份后选择云端版本。' : '' });
    }
  } catch (error) {
    updateState({ status: error instanceof CloudError && error.status === 401 ? 'expired' : wasUnconfirmed ? 'unconfirmed' : 'error', message: `${wasUnconfirmed ? '结果仍待确认，未重放提交。' : ''}${error instanceof Error ? error.message : '核实云端状态失败。'}` });
  } finally { busy = false; }
  if (dirty && state.status === 'pending') await saveCloud();
}

export async function logoutCloud() {
  if (busy || renewal || backgroundLoading) throw new Error('请求处理中，请稍后退出。');
  await forgetAccount();
  clearTimeout(renewalTimer);
  clearTimeout(timer);
  if (dirty) persistDraft();
  if (stagedPlan) await checkpointStaged();
  const previousSession = session;
  const url = state.workspaceUrl;
  ++generation;
  session = null;
  stagedPlan = undefined;
  storeRevision = undefined;
  draftKey = '';
  dirty = false;
  values = local;
  updateState({ status: 'local', username: '', workspaceUrl: '', message: '' });
  if (previousSession) {
    try { await request(`${url}/logout`, previousSession.accessToken, { method: 'POST' }); }
    catch (error) { if (!(error instanceof CloudError) || error.status !== 401) throw error; }
  }
}

export function exportCloudDraft() {
  const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `sangnav-cloud-backup-${Date.now()}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function restoreCloudBackup(input: unknown) {
  if (!session || busy) throw new Error('请先登录云端账户并等待当前请求完成。');
  if (stagedPlan) throw new Error('仍有未完成的暂存提交，请先核实回执或取消后读取云端，再恢复备份。');
  const backup = validateSnapshot(input);
  splitDocuments(backup.values);
  values = { ...backup.values };
  atomicPublish = true;
  dirty = true;
  persistDraft();
  if (!['error', 'conflict', 'expired', 'unconfirmed'].includes(state.status)) {
    updateState({ status: 'pending', message: '' });
    scheduleSave();
  } else emit();
}

window.addEventListener('beforeunload', event => {
  if (!isCloudActive() || !dirty) return;
  persistDraft();
  event.preventDefault();
  event.returnValue = '';
});