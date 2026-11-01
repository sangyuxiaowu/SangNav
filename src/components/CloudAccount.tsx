import { useRef, useState, useSyncExternalStore } from 'react';
import { Cloud, CloudCheck, CloudOff, Download, LogIn, LogOut, RefreshCw, Upload } from 'lucide-react';
import { exportCloudDraft, getCloudState, isCloudActive, loginCloud, logoutCloud, reconcileCloud, restoreCloudBackup, subscribeStorage } from '../services/cloudStorage';
import { CLOUD_SEARCHES_KEY, CLOUD_VISITS_KEY, getSearches, getVisits } from '../services/analyticsDb';

const LABELS = {
  local: '本机模式', connecting: '正在登录', saved: '云端已保存', pending: '等待保存',
  saving: '正在保存', error: '保存失败', conflict: '版本冲突', expired: '需要重新登录',
};

export function CloudStatus({ onOpen }: { onOpen: () => void }) {
  const state = useSyncExternalStore(subscribeStorage, getCloudState);
  const Icon = state.status === 'saved' ? CloudCheck : ['error', 'conflict', 'expired'].includes(state.status) ? CloudOff : Cloud;
  return (
    <div className="flex justify-end">
      <button type="button" onClick={onOpen} className="inline-flex max-w-full items-center gap-2 text-xs text-theme-secondary hover:text-theme-primary cursor-pointer" title={state.message || '云端账户'}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="break-all">{state.username ? `${state.username} · ${LABELS[state.status]}` : '云端账户登录'}</span>
      </button>
    </div>
  );
}

export function CloudAccount() {
  const state = useSyncExternalStore(subscribeStorage, getCloudState);
  const [workspaceUrl, setWorkspaceUrl] = useState(() => { try { return localStorage.getItem('sangnav_cloud_url') || ''; } catch { return ''; } });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [importLocal, setImportLocal] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [confirmRemote, setConfirmRemote] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [backup, setBackup] = useState<{ content: unknown } | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const connected = isCloudActive();
  const disabled = working || state.status === 'connecting' || state.status === 'saving';

  async function run(action: () => Promise<unknown>) {
    setWorking(true);
    setError('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : '操作失败。'); }
    finally { setWorking(false); }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    const submittedPassword = password;
    setPassword('');
    await run(async () => {
      const analytics = importLocal ? { [CLOUD_VISITS_KEY]: await getVisits(), [CLOUD_SEARCHES_KEY]: await getSearches() } : {};
      await loginCloud(workspaceUrl, username, submittedPassword, importLocal, analytics);
      try { localStorage.setItem('sangnav_cloud_url', workspaceUrl.trim()); } catch {}
    });
  }

  const buttonClass = 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-theme-default text-xs font-medium hover:bg-theme-base disabled:opacity-50 cursor-pointer';
  const inputClass = 'w-full min-w-0 px-3 py-2.5 rounded-lg border border-theme-default bg-theme-base text-theme-primary text-sm outline-none focus:border-blue-500';

  return (
    <section className="space-y-4 pb-5 border-b border-theme-default" aria-label="云端账户">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><Cloud className="w-4 h-4 text-blue-500" />云端账户</h4>
        <span role="status" className="text-xs text-theme-muted">{LABELS[state.status]}</span>
      </div>
      {connected ? (
        <>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-theme-muted">账户</dt><dd className="break-all">{state.username}</dd>
            <dt className="text-theme-muted">空间</dt><dd className="break-all">{state.workspaceUrl}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={exportCloudDraft}><Download className="w-4 h-4" />完整备份</button>
            <button type="button" disabled={disabled} className={buttonClass} onClick={() => backupInput.current?.click()}><Upload className="w-4 h-4" />恢复完整备份</button>
            <button type="button" disabled={disabled || state.status === 'expired'} className={buttonClass} onClick={() => void run(() => reconcileCloud(false))}><RefreshCw className="w-4 h-4" />核实并重试</button>
            <button type="button" disabled={disabled || state.status === 'expired'} className={buttonClass} onClick={() => setConfirmRemote(true)}><Cloud className="w-4 h-4" />读取云端</button>
            <button type="button" disabled={disabled} className={buttonClass} onClick={() => setConfirmLogout(true)}><LogOut className="w-4 h-4" />退出账户</button>
          </div>
          <input type="file" accept="application/json,.json" className="hidden" ref={backupInput} aria-label="完整云端备份文件" onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            void run(async () => {
              if (file.size > 16 * 1024 * 1024) throw new Error('备份文件超过 16 MiB。');
              setBackup({ content: JSON.parse(await file.text()) });
            });
          }} />
          {backup && (
            <div className="space-y-2 text-xs text-amber-600" role="alert">
              <p>完整备份将替换当前空间的数据，包括私密导航和统计。</p>
              <div className="flex gap-2">
                <button type="button" disabled={disabled} className={buttonClass} onClick={() => void run(async () => { restoreCloudBackup(backup.content); setBackup(null); })}>确认恢复</button>
                <button type="button" className={buttonClass} onClick={() => setBackup(null)}>取消</button>
              </div>
            </div>
          )}
          {confirmRemote && (
            <div className="space-y-2 text-xs text-amber-600" role="alert">
              <p>读取云端将替换本机未保存的修改。请先完整备份。</p>
              <div className="flex gap-2">
                <button type="button" disabled={disabled} className={buttonClass} onClick={() => void run(async () => { await reconcileCloud(true); setConfirmRemote(false); })}>确认替换</button>
                <button type="button" className={buttonClass} onClick={() => setConfirmRemote(false)}>取消</button>
              </div>
            </div>
          )}
          {confirmLogout && (
            <div className="space-y-2 text-xs text-theme-muted" role="alert">
              <p>退出后返回本机数据；未保存草稿留在本机，下次以同一身份登录此空间可恢复。</p>
              <div className="flex gap-2">
                <button type="button" disabled={disabled} className={buttonClass} onClick={() => void run(async () => { await logoutCloud(); setConfirmLogout(false); })}>确认退出</button>
                <button type="button" className={buttonClass} onClick={() => setConfirmLogout(false)}>取消</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block space-y-1.5 text-xs text-theme-secondary"><span>空间接入地址</span><input type="url" required value={workspaceUrl} disabled={disabled} onChange={event => setWorkspaceUrl(event.target.value)} placeholder="https://example.com/api/v1/workspaces/AbCdEf1234_-" className={inputClass} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs text-theme-secondary"><span>资源用户名</span><input required autoComplete="username" maxLength={100} value={username} disabled={disabled} onChange={event => setUsername(event.target.value)} className={inputClass} /></label>
            <label className="block space-y-1.5 text-xs text-theme-secondary"><span>密码</span><input required type="password" autoComplete="current-password" maxLength={256} value={password} disabled={disabled} onChange={event => setPassword(event.target.value)} className={inputClass} /></label>
          </div>
          <label className="flex items-start gap-2 text-xs text-theme-secondary"><input type="checkbox" checked={importLocal} disabled={disabled} onChange={event => setImportLocal(event.target.checked)} className="mt-0.5 accent-blue-600" /><span>云端尚无数据时，导入本机全部数据（含私密导航、图案锁和统计）</span></label>
          <button type="submit" disabled={disabled} className={`${buttonClass} bg-blue-600 text-white border-blue-600 hover:bg-blue-500`}><LogIn className="w-4 h-4" />{disabled ? '正在登录...' : '登录云端账户'}</button>
        </form>
      )}
      {(error || state.message) && <p role="alert" className="text-xs text-red-500 break-words">{error || state.message}</p>}
    </section>
  );
}