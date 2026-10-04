import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  KeyRound, 
  Lock, 
  Trash2, 
  Download, 
  EyeOff, 
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { NavLinkItem, NavCategory } from '../types/navigation';

interface SecretSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetPattern: () => void;
  onClearPattern: () => void;
  hasPattern: boolean;
  secretLinks: NavLinkItem[];
  secretCategories: NavCategory[];
  onClearSecretData: () => void;
  autoLockOnBlur: boolean;
  onToggleAutoLockOnBlur: (val: boolean) => void;
  onExitSecretMode: () => void;
}

export const SecretSettingsModal: React.FC<SecretSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetPattern,
  onClearPattern,
  hasPattern,
  secretLinks,
  secretCategories,
  onClearSecretData,
  autoLockOnBlur,
  onToggleAutoLockOnBlur,
  onExitSecretMode,
}) => {
  const [confirmClearData, setConfirmClearData] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportSecretData = () => {
    const backup = {
      version: '1.0',
      type: 'novanav_secret_backup',
      exportedAt: new Date().toISOString(),
      categories: secretCategories,
      links: secretLinks,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `novanav_secret_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setSuccessMsg('私密数据已导出为 JSON 备份文件！');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md p-6 rounded-3xl bg-theme-surface border border-purple-500/30 shadow-2xl shadow-purple-950/40 text-theme-primary overflow-hidden flex flex-col max-h-[90vh] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-subtle pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-theme-primary">私密导航空间设置</h3>
              <p className="text-[11px] text-theme-muted">手势锁密码、防窥自动锁定与数据管理</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-xl hover:bg-theme-base transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="space-y-4 overflow-y-auto no-scrollbar pr-1 text-xs">
          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Pattern Gesture Management */}
          <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-theme-primary flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-500" />
                  <span>锁屏手势密码</span>
                </div>
                <div className="text-[10px] text-theme-muted">
                  {hasPattern ? '已设置九宫格锁屏手势保护' : '未设置手势（三击 Alt 直接进入）'}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                hasPattern 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {hasPattern ? '已加密' : '无密码'}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetPattern();
                }}
                className="flex-1 py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors cursor-pointer text-center shadow-xs"
              >
                {hasPattern ? '修改手势图案' : '设置手势图案'}
              </button>

              {hasPattern && (
                <button
                  type="button"
                  onClick={() => {
                    onClearPattern();
                    setSuccessMsg('手势密码已清除，现可直接进入私密空间');
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  className="py-1.5 px-3 bg-theme-surface hover:bg-theme-surface-hover text-theme-muted hover:text-red-500 border border-theme-default rounded-xl transition-colors cursor-pointer"
                >
                  清除密码
                </button>
              )}
            </div>
          </div>

          {/* 2. Privacy & Auto Lock Settings */}
          <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-2.5">
            <div className="font-semibold text-theme-primary flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5 text-blue-500" />
              <span>防窥与自动锁定策略</span>
            </div>

            {/* Esc Quick Camouflage */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-theme-surface border border-theme-subtle">
              <div>
                <div className="font-medium text-theme-primary">Esc 快捷伪装退出</div>
                <div className="text-[10px] text-theme-muted">随时按下键盘 Esc 立即切回常规公开导航</div>
              </div>
              <span className="font-mono px-2 py-0.5 rounded-md bg-theme-base border border-theme-default text-theme-muted text-[10px]">
                默认开启
              </span>
            </div>

            {/* Auto Lock on Window Blur */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-theme-surface border border-theme-subtle">
              <div>
                <div className="font-medium text-theme-primary">切换标签页/失焦自动退出</div>
                <div className="text-[10px] text-theme-muted">离开浏览器或切屏时立即自动锁屏</div>
              </div>
              <input
                type="checkbox"
                checked={autoLockOnBlur}
                onChange={(e) => onToggleAutoLockOnBlur(e.target.checked)}
                className="w-4 h-4 rounded-md accent-purple-600 cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Private Data Management */}
          <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-theme-primary flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>私密数据管理</span>
              </div>
              <span className="text-[10px] text-theme-muted">
                {secretCategories.length} 个分类 · {secretLinks.length} 个书签
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportSecretData}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>导出私密备份</span>
              </button>

              {!confirmClearData ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearData(true)}
                  className="py-1.5 px-3 bg-theme-surface hover:bg-red-500/10 hover:text-red-500 border border-theme-default text-theme-muted rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>清空私密网址</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClearSecretData();
                      setConfirmClearData(false);
                      setSuccessMsg('私密书签与分类已彻底清空！');
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }}
                    className="py-1.5 px-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                  >
                    确定清空
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearData(false)}
                    className="py-1.5 px-2 bg-theme-surface border border-theme-default rounded-xl text-[11px] text-theme-muted cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Tips & Shortcuts Notice */}
          <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/15 space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>操作小秘诀</span>
            </div>
            <ul className="text-[10px] text-theme-muted list-disc list-inside space-y-1">
              <li>
                呼出方式：三击 <strong className="text-theme-primary font-mono">Alt</strong>，或连续 3 击主页中央大时钟。
              </li>
              <li>按下键盘 <strong className="text-theme-primary font-mono">Esc</strong> 键或点击右下角红色锁定按钮可立即防窥锁定。</li>
              <li>私密空间内的书签、分类和搜索完全与外部常规空间物理隔离。</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-theme-subtle pt-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onExitSecretMode();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>立即退出并锁定</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
