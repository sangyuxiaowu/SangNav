import React, { useRef, useState, useSyncExternalStore } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  Download, 
  LogIn, 
  LogOut, 
  RefreshCw, 
  Upload, 
  ShieldCheck, 
  KeyRound, 
  Globe, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  exportCloudDraft, 
  getCloudState, 
  isCloudActive, 
  loginCloud, 
  logoutCloud, 
  reconcileCloud, 
  restoreCloudBackup, 
  subscribeStorage 
} from '../services/cloudStorage';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  local: { 
    label: '本机单机模式', 
    color: 'text-theme-muted', 
    bg: 'bg-theme-base', 
    border: 'border-theme-default' 
  },
  connecting: { 
    label: '正在连接校验', 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/20' 
  },
  saved: { 
    label: '云端已同步', 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10', 
    border: 'border-emerald-500/20' 
  },
  pending: { 
    label: '等待增量保存', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20' 
  },
  saving: { 
    label: '正在提交更改', 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10', 
    border: 'border-blue-500/20' 
  },
  error: { 
    label: '保存同步失败', 
    color: 'text-rose-500', 
    bg: 'bg-rose-500/10', 
    border: 'border-rose-500/20' 
  },
  unconfirmed: {
    label: '结果待确认',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  conflict: { 
    label: '检测到版本冲突', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10', 
    border: 'border-amber-500/20' 
  },
  expired: { 
    label: '会话已过期', 
    color: 'text-rose-500', 
    bg: 'bg-rose-500/10', 
    border: 'border-rose-500/20' 
  },
};

/**
 * Top bar compact status widget that opens the Cloud Account modal / tab
 */
export function CloudStatus({ onOpen }: { onOpen: () => void }) {
  const state = useSyncExternalStore(subscribeStorage, getCloudState);
  const cfg = STATUS_CONFIG[state.status] || STATUS_CONFIG.local;
  
  const isWorking = state.status === 'connecting' || state.status === 'saving';
  const isSaved = state.status === 'saved';
  const hasAlert = ['error', 'conflict', 'expired', 'unconfirmed'].includes(state.status);

  return (
    <div className="flex justify-end">
      <button 
        type="button" 
        onClick={onOpen} 
        className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all duration-200 cursor-pointer shadow-theme-sm hover:scale-[1.02] active:scale-[0.98] ${
          hasAlert 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
            : isSaved 
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15'
              : isWorking
                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400 hover:bg-blue-500/15'
                : state.status === 'pending'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-300 hover:bg-amber-500/15'
                  : 'bg-theme-surface/80 border-theme-default text-theme-secondary hover:text-theme-primary hover:bg-theme-surface hover:border-theme-hover'
        }`}
        title={state.message || (state.username ? `已连接空间: ${state.workspaceUrl}` : '点击配置并登录云端账户')}
        aria-label="云端空间状态"
      >
        {isWorking ? (
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin text-blue-400" />
        ) : isSaved ? (
          <CloudCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        ) : hasAlert ? (
          <CloudOff className="w-3.5 h-3.5 shrink-0 text-rose-400 animate-pulse" />
        ) : (
          <Cloud className="w-3.5 h-3.5 shrink-0 text-theme-muted group-hover:text-blue-400 transition-colors" />
        )}

        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {state.username ? (
            <>
              <span className="font-semibold text-theme-primary">{state.username}</span>
              <span className="text-theme-muted font-normal">·</span>
              <span className={cfg.color}>{cfg.label}</span>
            </>
          ) : (
            <>
              <span className="text-theme-secondary group-hover:text-theme-primary transition-colors">云端空间未连接</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">登录</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}

/**
 * Main Cloud Account Configuration & Management Component
 */
export function CloudAccount() {
  const state = useSyncExternalStore(subscribeStorage, getCloudState);
  const [workspaceUrl, setWorkspaceUrl] = useState(() => { 
    try { return localStorage.getItem('sangnav_cloud_url') || ''; } 
    catch { return ''; } 
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importLocal, setImportLocal] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  
  // Confirmation dialogues
  const [confirmRemote, setConfirmRemote] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [backup, setBackup] = useState<{ content: unknown } | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  const connected = isCloudActive();
  const disabled = working || state.status === 'connecting' || state.status === 'saving';
  const cfg = STATUS_CONFIG[state.status] || STATUS_CONFIG.local;

  async function run(action: () => Promise<unknown>) {
    setWorking(true);
    setError('');
    try { 
      await action(); 
    } catch (failure) { 
      setError(failure instanceof Error ? failure.message : '操作未能完成，请重试。'); 
    } finally { 
      setWorking(false); 
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    const submittedPassword = password;
    setPassword('');
    await run(async () => {
      const analytics = {};
      await loginCloud(workspaceUrl.trim(), username.trim(), submittedPassword, importLocal, analytics);
      try { 
        localStorage.setItem('sangnav_cloud_url', workspaceUrl.trim()); 
      } catch {}
    });
  }

  const handleCopyUrl = async () => {
    if (!state.workspaceUrl) return;
    try {
      await navigator.clipboard.writeText(state.workspaceUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6 text-theme-primary animate-in fade-in duration-200">
      {/* 1. Header Banner & Identity Card */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-theme-base via-theme-surface to-theme-base border border-theme-default shadow-theme-sm">
        {/* Decorative background glow */}
        <div 
          aria-hidden="true" 
          className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" 
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-theme-primary tracking-tight">云端数据中心与同步</h3>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${state.status === 'saved' ? 'bg-emerald-500' : state.status === 'connecting' || state.status === 'saving' ? 'bg-blue-500 animate-ping' : ['error', 'conflict', 'expired'].includes(state.status) ? 'bg-rose-500' : 'bg-slate-400'}`} />
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-theme-muted mt-1">
                连接 <a href="https://github.com/sangyuxiaowu/SangOmniStore?wt.mc_id=DT-MVP-5005195" target="_blank" rel="noopener noreferrer">SangOmniStore</a> 云端空间以实现书签、分类及偏好设置的跨设备实时漫游。
              </p>
            </div>
          </div>

          {connected && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                disabled={disabled || state.status === 'expired'}
                onClick={() => void run(() => reconcileCloud(false))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                title="核实远端版本并合并未冲突资源"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${working ? 'animate-spin' : ''}`} />
                <span>核查并同步</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Global Error or Status Notice */}
      {(error || state.message) && (
        <div 
          role="alert" 
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
            state.status === 'conflict'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : state.status === 'expired'
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-semibold">{error ? '操作遇到错误' : '云端同步提示'}</div>
            <div className="break-words opacity-90">{error || state.message}</div>
          </div>
        </div>
      )}

      {/* 3. Main Views: Connected State vs Login State */}
      {connected ? (
        <div className="space-y-6">
          {/* Workspace Details Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-theme-base border border-theme-default space-y-4">
            <div className="text-xs font-semibold text-theme-secondary flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>已绑定的云端空间会话</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {/* Account User */}
              <div className="p-3 rounded-xl bg-theme-surface border border-theme-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-theme-muted">当前账号</div>
                    <div className="font-semibold text-theme-primary truncate">{state.username}</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                  空间成员
                </span>
              </div>

              {/* Security Vault */}
              <div className="p-3 rounded-xl bg-theme-surface border border-theme-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-theme-muted">凭据保护</div>
                    <div className="font-semibold text-theme-primary">AES-256-GCM 本地金库</div>
                  </div>
                </div>
                <span className="text-[10px] text-theme-muted bg-theme-base px-2 py-0.5 rounded-md border border-theme-default shrink-0">
                  不可导出
                </span>
              </div>
            </div>

            {/* Workspace URL with copy action */}
            <div className="p-3 rounded-xl bg-theme-surface border border-theme-subtle space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-theme-muted">
                <span>空间接入地址 (Workspace URL)</span>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1 text-theme-secondary hover:text-theme-primary transition-colors cursor-pointer"
                  title="复制完整空间地址"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>复制地址</span>
                    </>
                  )}
                </button>
              </div>
              <code className="block break-all select-all font-mono text-[11px] text-theme-primary/90 bg-theme-base px-2.5 py-1.5 rounded-lg border border-theme-default">
                {state.workspaceUrl}
              </code>
            </div>
          </div>

          {/* Interactive Confirmation Drawers */}
          {backup && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in" role="alert">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-amber-400">确认恢复此完整云端备份？</h4>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    完整备份将校验并覆盖当前空间的所有数据，包括公开书签、分类编排、私密导航、图案锁及偏好设置。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 pl-6">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void run(async () => { restoreCloudBackup(backup.content); setBackup(null); })}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  确认恢复覆盖
                </button>
                <button
                  type="button"
                  onClick={() => setBackup(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-secondary text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {confirmRemote && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in" role="alert">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-amber-400">确认拉取远端数据并覆盖本地？</h4>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    读取云端将以远端空间的最新状态为准，重置本地尚未提交的任何草稿。若本地有未同步的修改，建议先点击「导出完整备份」。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 pl-6">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void run(async () => { await reconcileCloud(true); setConfirmRemote(false); })}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  确认拉取并覆盖
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemote(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-secondary text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {confirmLogout && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in" role="alert">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-rose-400">确认退出当前云端空间？</h4>
                  <p className="text-xs text-rose-200/80 leading-relaxed">
                    退出后将从本地 IndexedDB 销毁加密凭据，恢复登录前的单机本地数据。若存在未提交的草稿将妥善隔离保存在本机，下次以同一账户登录时可自动恢复。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 pl-6">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void run(async () => { await logoutCloud(); setConfirmLogout(false); })}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  确认退出登录
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLogout(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-secondary text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Action Cards: Categorized for effortless navigation */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-theme-secondary px-1">常用云端操作与灾备</div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export Full Cloud Backup */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex flex-col justify-between gap-3 hover:border-theme-hover transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-theme-primary">
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>导出完整备份</span>
                  </div>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    将当前空间的公开/私密书签、分类、图案锁和设置保存为 JSON 备份。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportCloudDraft}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary text-xs font-medium transition-colors cursor-pointer self-start"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出本地文件</span>
                </button>
              </div>

              {/* Restore Full Cloud Backup */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex flex-col justify-between gap-3 hover:border-theme-hover transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-theme-primary">
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>恢复完整备份</span>
                  </div>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    选择已导出的 JSON 备份文件，校验后整体增量同步并覆盖当前空间对应数据。
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => backupInput.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer self-start"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>选择备份恢复</span>
                </button>
              </div>

              {/* Pull Remote Overwrite */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex flex-col justify-between gap-3 hover:border-theme-hover transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-theme-primary">
                    <Cloud className="w-3.5 h-3.5 text-amber-500" />
                    <span>读取云端远端版本</span>
                  </div>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    从云端拉取最新全量数据并重置本地未保存的修改，用于解决多端冲突或放弃草稿。
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled || state.status === 'expired'}
                  onClick={() => setConfirmRemote(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-amber-400 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer self-start"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>读取远端并替换</span>
                </button>
              </div>

              {/* Sign Out */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex flex-col justify-between gap-3 hover:border-theme-hover transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-theme-primary">
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>退出当前账户</span>
                  </div>
                  <p className="text-[11px] text-theme-muted leading-relaxed">
                    安全清除本地加密凭据与会话，恢复单机模式；未提交草稿保留在本地。
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setConfirmLogout(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-theme-surface hover:bg-rose-500/10 border border-theme-default hover:border-rose-500/30 text-rose-400 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer self-start"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出账户</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hidden File Input for Backup Upload */}
          <input 
            type="file" 
            accept="application/json,.json" 
            className="hidden" 
            ref={backupInput} 
            aria-label="完整云端备份文件" 
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              void run(async () => {
                if (file.size > 16 * 1024 * 1024) throw new Error('备份文件大小超过 16 MiB 限制。');
                setBackup({ content: JSON.parse(await file.text()) });
              });
            }} 
          />
        </div>
      ) : (
        /* Login / Connect Form */
        <div className="space-y-6">
          {/* Form */}
          <form onSubmit={handleLogin} className="p-5 sm:p-6 rounded-2xl bg-theme-base border border-theme-default space-y-4 shadow-theme-sm">
            <div className="text-xs font-semibold text-theme-primary flex items-center gap-1.5 pb-1 border-b border-theme-subtle">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
              <span>登录或接入云端空间</span>
            </div>

            {/* Workspace URL */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-theme-secondary">
                <Globe className="w-3.5 h-3.5 text-theme-muted" />
                <span>空间接入地址 (Workspace URL)</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={workspaceUrl}
                  disabled={disabled}
                  onChange={event => setWorkspaceUrl(event.target.value)}
                  placeholder="https://example.com/api/v1/workspaces/AbCdEf1234_-"
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-theme-default bg-theme-surface text-theme-primary text-xs font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-theme-muted/60"
                />
              </div>
              <p className="text-[11px] text-theme-muted">
                填入服务提供商分发的标准空间接入地址，同一空间的成员共享同一套导航数据。
              </p>
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-theme-secondary">
                  <User className="w-3.5 h-3.5 text-theme-muted" />
                  <span>资源用户名</span>
                </label>
                <input
                  required
                  autoComplete="username"
                  maxLength={100}
                  value={username}
                  disabled={disabled}
                  onChange={event => setUsername(event.target.value)}
                  placeholder="输入用户名"
                  className="w-full px-3 py-2.5 rounded-xl border border-theme-default bg-theme-surface text-theme-primary text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-theme-muted/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-medium text-theme-secondary">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-theme-muted" />
                    <span>登录密码</span>
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-theme-muted hover:text-theme-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPassword ? '隐藏' : '显示'}</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    maxLength={256}
                    value={password}
                    disabled={disabled}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="输入密码"
                    className="w-full px-3 py-2.5 rounded-xl border border-theme-default bg-theme-surface text-theme-primary text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-theme-muted/60"
                  />
                </div>
              </div>
            </div>

            {/* First-time Data Migration Switch */}
            <div className="p-3.5 rounded-xl bg-theme-surface border border-theme-subtle flex items-start gap-3">
              <input
                id="import-local-checkbox"
                type="checkbox"
                checked={importLocal}
                disabled={disabled}
                onChange={event => setImportLocal(event.target.checked)}
                className="mt-1 w-4 h-4 rounded border-theme-default accent-blue-600 cursor-pointer"
              />
              <label htmlFor="import-local-checkbox" className="text-xs text-theme-secondary select-none cursor-pointer space-y-0.5">
                <div className="font-medium text-theme-primary flex items-center gap-1.5">
                  <span>首次接入时同步本机全部数据</span>
                  <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">推荐</span>
                </div>
                <div className="text-[11px] text-theme-muted leading-relaxed">
                  若云端空间尚无数据，将当前浏览器中的全部书签、分类、搜索引擎、私密导航、图案锁及偏好上传为初始数据。
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={disabled}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {disabled ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在校验空间能力并登录...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>连接并登录云端空间</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-theme-muted text-center pt-1">
              注意：空间内的资源账户拥有该空间的完整读写权限；建议在受信设备上使用。
            </p>
          </form>
        </div>
      )}
    </div>
  );
}