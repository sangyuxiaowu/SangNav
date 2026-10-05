import React from 'react';
import { NavLinkItem } from '../types/navigation';
import { getFaviconUrl, getInitialColor } from '../utils/urlUtils';
import { Star, Plus } from 'lucide-react';
import { CachedFavicon } from './CachedFavicon';

interface QuickDockProps {
  pinnedLinks: NavLinkItem[];
  onOpenLink: (link: NavLinkItem) => void;
  onAddLink: () => void;
  isManageMode?: boolean;
  onUnpin?: (link: NavLinkItem) => void;
}

export const QuickDock: React.FC<QuickDockProps> = ({
  pinnedLinks,
  onOpenLink,
  onAddLink,
  isManageMode = false,
  onUnpin,
}) => {
  if (pinnedLinks.length === 0 && !isManageMode) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-2">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
        <span className="text-xs font-semibold text-theme-primary">常用直达</span>
        <span className="text-[11px] text-theme-muted">· {pinnedLinks.length} 个置顶</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pinnedLinks.map((link) => {
          const favicon = getFaviconUrl(link.url, link.icon);
          const initialColor = getInitialColor(link.title);
          const initial = link.title.charAt(0).toUpperCase();

          return (
            <div
              key={link.id}
              onClick={() => onOpenLink(link)}
              className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default hover:border-theme-hover text-theme-primary text-xs font-medium cursor-pointer transition-all duration-150 backdrop-blur-xs shadow-theme-sm"
            >
              <div className="w-5 h-5 rounded-md flex items-center justify-center overflow-hidden shrink-0 bg-theme-base border border-theme-subtle">
                <CachedFavicon
                  src={favicon}
                  className="w-4 h-4 object-contain"
                  fallback={<span className={`${initialColor.text} ${initialColor.bg} w-full h-full flex items-center justify-center text-[10px] font-bold`}>{initial}</span>}
                />
              </div>
              <span className="truncate max-w-[120px] group-hover:text-blue-500 transition-colors">
                {link.title}
              </span>

              {isManageMode && onUnpin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(link);
                  }}
                  className="ml-1 text-amber-500 hover:text-theme-muted transition-colors p-0.5"
                  title="取消常用置顶"
                >
                  <Star className="w-3 h-3 fill-amber-500" />
                </button>
              )}
            </div>
          );
        })}

        {/* Quick Add Button */}
        <button
          onClick={onAddLink}
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-theme-default hover:border-blue-500 text-theme-muted hover:text-theme-primary text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加常用</span>
        </button>
      </div>
    </div>
  );
};
