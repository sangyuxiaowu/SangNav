import React, { useSyncExternalStore } from 'react';
import { 
  Plus, 
  Settings, 
  Lock, 
  ShieldCheck, 
  CloudOff, 
  CloudCheck, 
  CloudUpload, 
  RefreshCw, 
  AlertTriangle, 
  KeyRound 
} from 'lucide-react';
import { getCloudState, subscribeStorage } from '../services/cloudStorage';

interface FloatingActionsProps {
  onOpenAddLink: () => void;
  onOpenSettings: () => void;
  onOpenCloud?: () => void;
  isSecretMode?: boolean;
  onExitSecretMode?: () => void;
  onOpenSecretSettings?: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onOpenAddLink,
  onOpenSettings,
  onOpenCloud,
  isSecretMode = false,
  onExitSecretMode,
  onOpenSecretSettings,
}) => {
  const cloudState = useSyncExternalStore(subscribeStorage, getCloudState);

  // Determine the appropriate icon, color, dot badge, and tooltip for each cloud state
  const getCloudButtonConfig = () => {
    switch (cloudState.status) {
      case 'saved':
        return {
          icon: CloudCheck,
          iconClass: 'text-emerald-400 group-hover:scale-110 transition-transform',
          btnClass: 'border-emerald-500/40 text-emerald-400 hover:border-emerald-400 shadow-emerald-500/10',
          dotClass: 'bg-emerald-500',
          title: cloudState.username ? `${cloudState.username} · 云端已同步最新数据` : '云端已同步最新数据',
          ariaLabel: '云端已同步',
        };
      case 'saving':
      case 'connecting':
        return {
          icon: RefreshCw,
          iconClass: 'text-blue-400 animate-spin',
          btnClass: 'border-blue-500/40 text-blue-400 hover:border-blue-400 shadow-blue-500/10',
          dotClass: 'bg-blue-500 animate-ping',
          title: cloudState.status === 'connecting' ? '正在连接云端空间...' : '正在同步数据至云端...',
          ariaLabel: '正在同步',
        };
      case 'pending':
        return {
          icon: CloudUpload,
          iconClass: 'text-amber-400 group-hover:scale-110 transition-transform',
          btnClass: 'border-amber-500/40 text-amber-400 hover:border-amber-400 shadow-amber-500/10',
          dotClass: 'bg-amber-500',
          title: cloudState.username ? `${cloudState.username} · 本地修改等待同步至云端` : '等待同步至云端',
          ariaLabel: '等待同步',
        };
      case 'conflict':
        return {
          icon: AlertTriangle,
          iconClass: 'text-amber-400 animate-pulse',
          btnClass: 'border-amber-500/60 text-amber-400 ring-2 ring-amber-500/20',
          dotClass: 'bg-amber-500 animate-ping',
          title: '检测到多端版本冲突 · 本地草稿已妥善保护 (点击处理)',
          ariaLabel: '版本冲突',
        };
      case 'expired':
        return {
          icon: KeyRound,
          iconClass: 'text-orange-400 group-hover:rotate-12 transition-transform',
          btnClass: 'border-orange-500/60 text-orange-400 ring-2 ring-orange-500/20',
          dotClass: 'bg-orange-500 animate-pulse',
          title: '云端会话已失效 · 点击重新登录',
          ariaLabel: '会话已过期',
        };
      case 'error':
        return {
          icon: CloudOff,
          iconClass: 'text-rose-400 animate-pulse',
          btnClass: 'border-rose-500/60 text-rose-400 ring-2 ring-rose-500/20',
          dotClass: 'bg-rose-500 animate-ping',
          title: cloudState.message ? `云端同步失败: ${cloudState.message}` : '云端同步异常 (点击查看)',
          ariaLabel: '同步失败',
        };
      case 'local':
      default:
        return {
          icon: CloudOff,
          iconClass: 'text-theme-muted group-hover:text-blue-400 transition-colors',
          btnClass: 'border-theme-default text-theme-secondary hover:text-theme-primary',
          dotClass: null,
          title: '云端未登录 · 点击配置多端同步',
          ariaLabel: '云端未登录',
        };
    }
  };

  const cloudConfig = getCloudButtonConfig();
  const CloudIcon = cloudConfig.icon;

  if (isSecretMode) {
    return (
      <aside aria-label="私密导航快捷悬浮操作" className="fixed bottom-7 right-7 z-40 flex flex-col items-center gap-3 animate-in fade-in duration-300">
        {/* 1. 添加私密网址按钮 */}
        <button
          type="button"
          onClick={onOpenAddLink}
          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
          title="添加私密网址 (Alt+N)"
          aria-label="添加私密网址"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        </button>

        {/* 2. 退出私密空间按钮 (置于中间/醒目位置) */}
        <button
          type="button"
          onClick={onExitSecretMode}
          className="w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group ring-2 ring-red-400/40"
          title="退出私密空间 (Esc 或 三击 Alt)"
          aria-label="退出私密空间"
        >
          <Lock className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
        </button>

        {/* 3. 私密导航设置按钮 */}
        <button
          type="button"
          onClick={onOpenSecretSettings}
          className="w-12 h-12 rounded-full bg-theme-surface hover:bg-theme-surface-hover text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-950/20 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
          title="私密导航安全与手势设置"
          aria-label="私密导航设置"
        >
          <ShieldCheck className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-transform group-hover:rotate-12 duration-200" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="快捷悬浮操作" className="fixed bottom-7 right-7 z-40 flex flex-col items-center gap-3">
      {/* 1. 添加网址按钮 (置于上方，纯图标，无文字) */}
      <button
        type="button"
        onClick={onOpenAddLink}
        className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
        title="添加网址 (Alt+N)"
        aria-label="添加网址"
      >
        <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
      </button>

      {/* 2. 云端同步独立按钮 (在设置和添加中间) */}
      <button
        type="button"
        onClick={onOpenCloud}
        className={`w-12 h-12 rounded-full bg-theme-surface hover:bg-theme-surface-hover shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group relative border ${cloudConfig.btnClass}`}
        title={cloudConfig.title}
        aria-label={cloudConfig.ariaLabel}
      >
        <CloudIcon className={`w-5 h-5 ${cloudConfig.iconClass}`} />
        {cloudConfig.dotClass && (
          <span 
            className={`absolute top-2 right-2 w-2 h-2 rounded-full ring-2 ring-theme-surface ${cloudConfig.dotClass}`} 
            aria-hidden="true"
          />
        )}
      </button>

      {/* 3. 设置按钮 (置于下方，纯图标，无文字) */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="w-12 h-12 rounded-full bg-theme-surface hover:bg-theme-surface-hover text-theme-primary border border-theme-default shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
        title="个性化设置与偏好"
        aria-label="设置"
      >
        <Settings className="w-5 h-5 text-theme-secondary group-hover:text-theme-primary transition-transform group-hover:rotate-45 duration-300" />
      </button>
    </aside>
  );
};
