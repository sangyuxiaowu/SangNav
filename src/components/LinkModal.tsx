import React, { useState, useEffect } from 'react';
import { NavCategory, NavLinkItem } from '../types/navigation';
import { formatUrl, getFaviconUrl } from '../utils/urlUtils';
import { X, Globe, Star, Sparkles, Link as LinkIcon } from 'lucide-react';
import { CachedFavicon } from './CachedFavicon';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NavCategory[];
  initialData?: NavLinkItem | null;
  defaultCategoryId?: string;
  onSave: (data: Omit<NavLinkItem, 'id' | 'createdAt' | 'clicks'>, id?: string) => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  isOpen,
  onClose,
  categories,
  initialData,
  defaultCategoryId,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUrl(initialData.url);
      setCategoryId(initialData.categoryId);
      setDescription(initialData.description || '');
      setIcon(initialData.icon || '');
      setPinned(!!initialData.pinned);
    } else {
      setTitle('');
      setUrl('');
      setCategoryId(defaultCategoryId || (categories[0]?.id ?? ''));
      setDescription('');
      setIcon('');
      setPinned(false);
    }
    setError('');
  }, [initialData, defaultCategoryId, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请输入网址名称');
      return;
    }
    if (!url.trim()) {
      setError('请输入网址 URL');
      return;
    }

    const formattedUrl = formatUrl(url);

    onSave(
      {
        title: title.trim(),
        url: formattedUrl,
        categoryId: categoryId || categories[0]?.id || 'default',
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        pinned,
      },
      initialData?.id
    );

    onClose();
  };

  const previewFavicon = url ? getFaviconUrl(url, icon) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-theme-surface border border-theme-default rounded-3xl p-6 shadow-theme-lg space-y-5 animate-in fade-in zoom-in-95 duration-150 text-theme-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-subtle pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary">
                {initialData ? '编辑网址书签' : '添加自定义网址'}
              </h3>
              <p className="text-xs text-theme-muted">支持自定义标题、链接、分类与图标</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-base transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="font-medium text-theme-primary flex items-center justify-between">
              <span>网址 URL *</span>
              {previewFavicon && (
                <span className="flex items-center gap-1.5 text-theme-muted text-[11px]">
                  <span>图标预览:</span>
                  <CachedFavicon
                    src={previewFavicon}
                    className="w-3.5 h-3.5 rounded-xs object-contain"
                  />
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="例如: https://github.com、juejin.cn 或 edge://inspect/#devices"
                className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary placeholder-theme-muted font-mono text-xs shadow-xs"
                required
              />
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="font-medium text-theme-primary">网站名称 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: GitHub 或 掘金"
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary placeholder-theme-muted text-xs shadow-xs"
              required
            />
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label className="font-medium text-theme-primary">所属分类</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary text-xs shadow-xs"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-theme-surface text-theme-primary">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="font-medium text-theme-primary">简短说明 (可选)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如: 全球开源代码协作平台"
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary placeholder-theme-muted text-xs shadow-xs"
            />
          </div>

          {/* Custom Icon URL (Optional) */}
          <div className="space-y-1.5">
            <label className="font-medium text-theme-primary">自定义图标链接 (可选，留空将自动获取 Favicon)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/icon.png"
              className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary placeholder-theme-muted font-mono text-xs shadow-xs"
            />
          </div>

          {/* Pinned to Quick Access */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-theme-base border border-theme-default">
            <div className="flex items-center gap-2">
              <Star className={`w-4 h-4 ${pinned ? 'text-amber-500 fill-amber-500' : 'text-theme-muted'}`} />
              <div>
                <div className="text-xs font-semibold text-theme-primary">置顶到常用直达栏</div>
                <div className="text-[11px] text-theme-muted">在搜索框下方快速点击访问</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                pinned ? 'bg-amber-500 justify-end' : 'bg-theme-default justify-start'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-theme-base transition-colors cursor-pointer text-xs"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-xs cursor-pointer text-xs"
            >
              {initialData ? '保存修改' : '立即添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
