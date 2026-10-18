import React, { useState } from 'react';
import { FaviconProvider, NavCategory, NavLinkItem } from '../types/navigation';
import { getFaviconUrl, getInitialColor, getDomain } from '../utils/urlUtils';
import { 
  Star, 
  MoreVertical, 
  Edit, 
  Trash2, 
  GripVertical,
  Plus, 
  Layers 
} from 'lucide-react';
import { getCategoryIcon } from './CategoryNav';
import { CachedFavicon } from './CachedFavicon';

interface LinkGridProps {
  categories: NavCategory[];
  links: NavLinkItem[];
  activeCategoryId: string;
  columnsCount: 3 | 4 | 5 | 6;
  isManageMode: boolean;
  onOpenLink: (link: NavLinkItem) => void;
  onEditLink: (link: NavLinkItem) => void;
  onDeleteLink: (id: string) => void;
  onTogglePin: (link: NavLinkItem) => void;
  onReorderLinks: (linkIds: string[]) => void;
  onAddNewLink: (categoryId?: string) => void;
  searchFilterQuery?: string;
  faviconProvider?: FaviconProvider;
}

export const LinkGrid: React.FC<LinkGridProps> = ({
  categories,
  links,
  activeCategoryId,
  columnsCount,
  isManageMode,
  onOpenLink,
  onEditLink,
  onDeleteLink,
  onTogglePin,
  onReorderLinks,
  onAddNewLink,
  searchFilterQuery = '',
  faviconProvider,
}) => {
  const [draggedLinkId, setDraggedLinkId] = useState<string | null>(null);

  const getGridColsClass = () => {
    switch (columnsCount) {
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case 6:
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
      case 4:
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
  };

  // Determine what sections to display
  const isAllView = activeCategoryId === 'all' && !searchFilterQuery;

  // Filter links
  const filteredLinks = links.filter((link) => {
    const matchesCategory = activeCategoryId === 'all' || link.categoryId === activeCategoryId;
    if (!matchesCategory) return false;
    if (!searchFilterQuery.trim()) return true;

    const q = searchFilterQuery.toLowerCase();
    return (
      link.title.toLowerCase().includes(q) ||
      link.url.toLowerCase().includes(q) ||
      (link.description && link.description.toLowerCase().includes(q))
    );
  });

  if (filteredLinks.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-theme-surface border border-theme-default flex items-center justify-center text-theme-muted">
          <Layers className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-theme-primary">
            {searchFilterQuery ? '未找到匹配的书签' : '当前分类暂无网址'}
          </h4>
          <p className="text-xs text-theme-muted">
            {searchFilterQuery ? '请尝试不同的搜索词或清除过滤' : '点击下方按钮快速添加第一个网址'}
          </p>
        </div>
        <button
          onClick={() => onAddNewLink(activeCategoryId === 'all' ? undefined : activeCategoryId)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>添加新网址</span>
        </button>
      </div>
    );
  }

  // Render a single card
  const renderCard = (link: NavLinkItem, sortableLinks: NavLinkItem[]) => {
    const favicon = getFaviconUrl(link.url, link.icon, faviconProvider);
    const domain = getDomain(link.url);
    const initialColor = getInitialColor(link.title);
    const initial = link.title.charAt(0).toUpperCase();
    const isDropTarget = draggedLinkId !== null && draggedLinkId !== link.id;

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const sourceId = event.dataTransfer.getData('text/plain') || draggedLinkId;
      const sourceIndex = sortableLinks.findIndex((item) => item.id === sourceId);
      const targetIndex = sortableLinks.findIndex((item) => item.id === link.id);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

      const reorderedLinks = [...sortableLinks];
      const [movedLink] = reorderedLinks.splice(sourceIndex, 1);
      reorderedLinks.splice(targetIndex, 0, movedLink);
      onReorderLinks(reorderedLinks.map((item) => item.id));
    };

    return (
      <div
        key={link.id}
        onClick={() => onOpenLink(link)}
        draggable={isManageMode}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', link.id);
          setDraggedLinkId(link.id);
        }}
        onDragOver={(event) => {
          if (isManageMode && draggedLinkId && draggedLinkId !== link.id && sortableLinks.some((item) => item.id === draggedLinkId)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={handleDrop}
        onDragEnd={() => setDraggedLinkId(null)}
        className={`group relative flex flex-col justify-between p-3.5 rounded-2xl bg-theme-surface hover:bg-theme-surface-hover border transition-all duration-200 cursor-pointer shadow-theme-sm hover:shadow-theme-md ${
          isManageMode
            ? `border-blue-500/60 ring-1 ring-blue-500/30 ${draggedLinkId === link.id ? 'opacity-40' : ''} ${isDropTarget ? 'hover:ring-2 hover:ring-blue-400' : ''}`
            : 'border-theme-default hover:border-theme-hover'
        }`}
      >
        <div className="space-y-2">
          {/* Card Top: Favicon, Title, Domain, Actions */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-theme-base border border-theme-subtle flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform shadow-xs">
                <CachedFavicon
                  src={favicon}
                  className="w-5 h-5 object-contain"
                  fallback={<span className={`${initialColor.text} ${initialColor.bg} w-full h-full flex items-center justify-center text-xs font-bold`}>{initial}</span>}
                />
              </div>

              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-theme-primary truncate group-hover:text-blue-500 transition-colors">
                  {link.title}
                </h4>
                <span className="text-[11px] text-theme-muted font-mono truncate block">
                  {domain}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {isManageMode && (
                <span className="p-1.5 text-blue-500 cursor-grab active:cursor-grabbing" title="拖拽排序">
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(link);
                }}
                className={`p-1.5 rounded-lg hover:bg-theme-base transition-colors ${
                  link.pinned ? 'text-amber-500 opacity-100' : 'text-theme-muted'
                }`}
                title={link.pinned ? '取消置顶' : '置顶到常用'}
              >
                <Star className={`w-3.5 h-3.5 ${link.pinned ? 'fill-amber-500' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLink(link);
                }}
                className="p-1.5 rounded-lg hover:bg-theme-base text-theme-muted hover:text-theme-primary transition-colors"
                title="编辑书签"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>

              {isManageMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLink(link.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-theme-muted hover:text-red-500 transition-colors"
                  title="删除书签"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* If pinned and not hovering, keep star subtle */}
            {link.pinned && (
              <div className="absolute top-2.5 right-2.5 group-hover:hidden">
                <Star className="w-3 h-3 text-amber-500/80 fill-amber-500/40" />
              </div>
            )}
          </div>

          {/* Description */}
          {link.description && (
            <p className="text-xs text-theme-secondary line-clamp-2 leading-relaxed">
              {link.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  // If "All" view with no search query, display grouped by category with headers
  if (isAllView) {
    return (
      <div className="space-y-8">
        {categories.map((category) => {
          const categoryLinks = links.filter((l) => l.categoryId === category.id);
          if (categoryLinks.length === 0) return null;

          return (
            <section key={category.id} className="space-y-3">
              {/* Category Section Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="text-theme-primary">
                    {getCategoryIcon(category.iconName, 'w-4 h-4')}
                  </div>
                  <h3 className="text-sm font-semibold text-theme-primary">
                    {category.name}
                  </h3>
                  <span className="text-xs text-theme-muted font-mono tabular-nums">
                    ({categoryLinks.length})
                  </span>
                </div>

                <button
                  onClick={() => onAddNewLink(category.id)}
                  className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme-primary transition-colors px-2 py-1 rounded-lg hover:bg-theme-surface cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加</span>
                </button>
              </div>

              {/* Grid for this category */}
              <div className={`grid gap-3 ${getGridColsClass()}`}>
                {categoryLinks.map((link) => renderCard(link, categoryLinks))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // Single category or filtered view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-theme-muted">
          共找到 <span className="font-mono text-theme-primary font-semibold">{filteredLinks.length}</span> 个网址
        </span>
        <button
          onClick={() => onAddNewLink(activeCategoryId === 'all' ? undefined : activeCategoryId)}
          className="flex items-center gap-1 text-xs text-theme-secondary hover:text-theme-primary transition-colors px-2.5 py-1 rounded-lg hover:bg-theme-surface cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加新网址</span>
        </button>
      </div>

      <div className={`grid gap-3 ${getGridColsClass()}`}>
        {filteredLinks.map((link) =>
          renderCard(
            link,
            filteredLinks.filter((candidate) => candidate.categoryId === link.categoryId)
          )
        )}
      </div>
    </div>
  );
};
