import React from 'react';
import { Plus, Settings, Lock, ShieldCheck, EyeOff } from 'lucide-react';

interface FloatingActionsProps {
  onOpenAddLink: () => void;
  onOpenSettings: () => void;
  isSecretMode?: boolean;
  onExitSecretMode?: () => void;
  onOpenSecretSettings?: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  onOpenAddLink,
  onOpenSettings,
  isSecretMode = false,
  onExitSecretMode,
  onOpenSecretSettings,
}) => {
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

      {/* 2. 设置按钮 (置于下方，纯图标，无文字) */}
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
