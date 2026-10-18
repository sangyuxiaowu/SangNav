import React, { useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const PWAUpdateModal: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Check for updates periodically
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('SW registration error', error);
    },
  });

  const [dismissed, setDismissed] = useState(false);

  // If user dismissed or no update needed, do not render
  if (!needRefresh || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setNeedRefresh(false);
  };

  return (
    <aside
      aria-label="PWA版本更新提示"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-4 sm:mx-0 p-4 rounded-2xl bg-theme-surface/95 border border-blue-500/40 shadow-2xl backdrop-blur-md text-theme-primary animate-in fade-in slide-in-from-bottom-4 duration-300 ring-1 ring-blue-500/20"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-500 shadow-xs">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-theme-primary flex items-center gap-1.5">
              <span>发现应用新版本</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-mono font-medium">PWA</span>
            </h4>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-theme-muted hover:text-theme-primary p-1 rounded-lg hover:bg-theme-base transition-colors cursor-pointer"
              title="稍后提醒"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-theme-muted leading-relaxed">
            新版本离线缓存与功能已更新就绪。立即刷新即可加载最新优化。
          </p>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              type="button"
              onClick={handleUpdate}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>立即更新</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-theme-base hover:bg-theme-surface border border-theme-default text-theme-secondary hover:text-theme-primary rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              稍后
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
