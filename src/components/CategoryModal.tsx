import React, { useState } from 'react';
import { NavCategory } from '../types/navigation';
import { 
  X, 
  FolderPlus, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Edit2, 
  Check, 
  Star, 
  Sparkles, 
  Code2, 
  Palette, 
  Briefcase, 
  Compass, 
  Layers 
} from 'lucide-react';
import { getCategoryIcon } from './CategoryNav';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: NavCategory[];
  onAddCategory: (name: string, iconName?: string) => void;
  onRenameCategory: (id: string, newName: string) => void;
  onDeleteCategory: (id: string) => void;
  onMoveCategory: (id: string, direction: 'up' | 'down') => void;
}

const AVAILABLE_ICONS = [
  { name: 'Star', label: '星标' },
  { name: 'Sparkles', label: '智能' },
  { name: 'Code2', label: '代码' },
  { name: 'Palette', label: '设计' },
  { name: 'Briefcase', label: '工作' },
  { name: 'Compass', label: '探索' },
  { name: 'Layers', label: '通用' },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Layers');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatIcon);
    setNewCatName('');
  };

  const startEdit = (cat: NavCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) {
      onRenameCategory(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-theme-surface border border-theme-default rounded-3xl p-6 shadow-theme-lg space-y-5 animate-in fade-in zoom-in-95 duration-150 text-theme-primary max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-subtle pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary">分类与编排管理</h3>
              <p className="text-xs text-theme-muted">增删分类、重命名及调整展示顺序</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-base transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAdd} className="space-y-3 p-3.5 rounded-2xl bg-theme-base border border-theme-default shrink-0">
          <div className="text-xs font-semibold text-theme-primary">新建分类</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="输入分类名称，如：影音娱乐、学习考研..."
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-theme-surface border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary placeholder-theme-muted shadow-xs"
            />
            {/* Icon picker */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {AVAILABLE_ICONS.map((ic) => (
                <button
                  key={ic.name}
                  type="button"
                  onClick={() => setNewCatIcon(ic.name)}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                    newCatIcon === ic.name
                      ? 'bg-blue-600/15 border-blue-500 text-blue-500 font-bold'
                      : 'border-theme-default hover:bg-theme-surface text-theme-muted'
                  }`}
                  title={ic.label}
                >
                  {getCategoryIcon(ic.name, 'w-3.5 h-3.5')}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              添加分类
            </button>
          </div>
        </form>

        {/* Existing Categories List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
          <div className="text-xs font-medium text-theme-muted mb-1">
            当前分类列表 ({categories.length})
          </div>

          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-theme-base border border-theme-default hover:border-theme-hover transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 rounded-xl bg-theme-surface text-theme-primary border border-theme-subtle shrink-0">
                  {getCategoryIcon(cat.iconName, 'w-4 h-4')}
                </div>

                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-theme-surface border border-blue-500 text-theme-primary focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(cat.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => saveEdit(cat.id)}
                      className="p-1 text-emerald-500 hover:text-emerald-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-theme-primary truncate">
                      {cat.name}
                    </div>
                    <div className="text-[10px] text-theme-muted font-mono">
                      排序序号: {idx + 1}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions: Move Up, Move Down, Edit, Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => onMoveCategory(cat.id, 'up')}
                  className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary disabled:opacity-30 hover:bg-theme-surface transition-colors cursor-pointer"
                  title="上移"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === categories.length - 1}
                  onClick={() => onMoveCategory(cat.id, 'down')}
                  className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary disabled:opacity-30 hover:bg-theme-surface transition-colors cursor-pointer"
                  title="下移"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="p-1.5 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-surface transition-colors cursor-pointer"
                  title="重命名"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={categories.length <= 1}
                  onClick={() => {
                    if (window.confirm(`确定要删除分类「${cat.name}」吗？分类下的网址将被移至默认分类。`)) {
                      onDeleteCategory(cat.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-theme-muted hover:text-red-500 disabled:opacity-30 hover:bg-theme-surface transition-colors cursor-pointer"
                  title="删除分类"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-theme-subtle shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-theme-base hover:bg-theme-surface border border-theme-default text-theme-primary rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
