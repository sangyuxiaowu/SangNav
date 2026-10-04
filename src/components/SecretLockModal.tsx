import React from 'react';
import { PatternLock } from './PatternLock';
import { Shield, X, EyeOff, Sparkles, Lock } from 'lucide-react';

interface SecretLockModalProps {
  isOpen: boolean;
  mode: 'set' | 'unlock';
  storedPattern?: number[];
  onSuccess: (pattern: number[]) => void;
  onClose: () => void;
}

export const SecretLockModal: React.FC<SecretLockModalProps> = ({
  isOpen,
  mode,
  storedPattern,
  onSuccess,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm p-6 rounded-3xl bg-theme-surface border border-purple-500/30 shadow-2xl shadow-purple-950/40 text-theme-primary overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Decorative Gradient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-theme-muted hover:text-theme-primary rounded-xl hover:bg-theme-base transition-colors cursor-pointer"
          title="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            {mode === 'set' ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-theme-primary flex items-center gap-1.5">
              <span>{mode === 'set' ? '初始化私密手势锁' : '私密导航空间解锁'}</span>
            </h3>
            <p className="text-[10px] text-theme-muted">
              {mode === 'set'
                ? '首次进入私密空间，请自定义您的手势密码'
                : '三击 Shift / Ctrl+Shift+S / 三击时钟 快速呼出'}
            </p>
          </div>
        </div>

        {/* First-time tip */}
        {mode === 'set' && (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400 shrink-0" />
            <span>手势图案将加密保存在本地。设置完成后，随时连按 3 次 Shift、按 Ctrl+Shift+S 或三击主页时钟即可呼出。</span>
          </div>
        )}

        {/* Pattern Lock Component */}
        <div className="py-1">
          <PatternLock
            mode={mode}
            storedPattern={storedPattern}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};
