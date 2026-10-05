import React from 'react';
import { NavCategory } from '../types/navigation';
import { 
  FolderPlus, 
  Settings2, 
  Layers, 
  Star, 
  Sparkles, 
  Code2, 
  Palette, 
  Briefcase, 
  Compass, 
  Edit3 
} from 'lucide-react';

interface CategoryNavProps {
  categories: NavCategory[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  categoryCounts: Record<string, number>;
  totalLinksCount: number;
  onOpenCategoryModal: () => void;
  isManageMode: boolean;
  onToggleManageMode: () => void;
}

export function getCategoryIcon(iconName?: string, className = 'w-3.5 h-3.5') {
  switch (iconName) {
    case 'Star':
      return <Star className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Code2':
      return <Code2 className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    default:
      return <Layers className={className} />;
  }
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  categoryCounts,
  totalLinksCount,
  onOpenCategoryModal,
  isManageMode,
  onToggleManageMode,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-theme-subtle pb-3">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
            activeCategoryId === 'all'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>全部网址</span>
          {totalLinksCount > 0 && (
            <span className="text-[11px] opacity-80 ml-0.5 font-mono tabular-nums">{totalLinksCount}</span>
          )}
        </button>

        {categories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          if (count === 0) return null;
          const isActive = activeCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface'
              }`}
            >
              {getCategoryIcon(cat.iconName)}
              <span>{cat.name}</span>
              <span className="text-[11px] opacity-80 ml-0.5 font-mono tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons: Category Management & Edit Mode */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button
          onClick={onOpenCategoryModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-theme-secondary hover:text-theme-primary bg-theme-surface hover:bg-theme-surface-hover border border-theme-default transition-colors cursor-pointer shadow-theme-sm"
          title="分类管理与排序"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>分类管理</span>
        </button>

        <button
          onClick={onToggleManageMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer shadow-theme-sm ${
            isManageMode
              ? 'bg-blue-600/15 border-blue-500 text-blue-500 font-semibold'
              : 'text-theme-secondary hover:text-theme-primary bg-theme-surface hover:bg-theme-surface-hover border-theme-default'
          }`}
          title="切换卡片管理模式 (快速编辑、置顶、删除)"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isManageMode ? '完成管理' : '批量整理'}</span>
        </button>
      </div>
    </div>
  );
};
