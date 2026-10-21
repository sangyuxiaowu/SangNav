import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  ArrowUpRight, 
  Bookmark, 
  Globe, 
  History, 
  Trash2,
  ExternalLink,
  Settings 
} from 'lucide-react';
import { SearchEngine, NavLinkItem } from '../types/navigation';
import { recordSearch } from '../services/analyticsDb';

interface SearchBarProps {
  engines: SearchEngine[];
  activeEngineId: string;
  onSelectEngine: (id: string) => void;
  openInNewTab: boolean;
  links: NavLinkItem[];
  onSelectLink: (link: NavLinkItem) => void;
  onFilterLinks: (query: string) => void;
  onOpenSearchSettings?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  engines,
  activeEngineId,
  onSelectEngine,
  openInNewTab,
  links,
  onSelectLink,
  onFilterLinks,
  onOpenSearchSettings,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [searchMode, setSearchMode] = useState<'web' | 'local'>('web');
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sangnav_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // Filter only enabled search engines (defaults to all if enabled is true/undefined)
  const enabledEngines = useMemo(() => {
    const list = engines.filter((e) => e.enabled !== false);
    return list.length > 0 ? list : engines;
  }, [engines]);

  const activeEngine = enabledEngines.find(e => e.id === activeEngineId) || enabledEngines[0] || engines[0];

  // Auto-switch to first enabled engine if active engine gets disabled
  useEffect(() => {
    if (enabledEngines.length > 0 && !enabledEngines.some(e => e.id === activeEngineId)) {
      onSelectEngine(enabledEngines[0].id);
    }
  }, [enabledEngines, activeEngineId, onSelectEngine]);

  // Save history on change
  const saveHistoryItem = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...history.filter(h => h !== trimmed)].slice(0, 8);
    setHistory(next);
    localStorage.setItem('sangnav_search_history', JSON.stringify(next));
  };

  const removeHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = history.filter(h => h !== term);
    setHistory(next);
    localStorage.setItem('sangnav_search_history', JSON.stringify(next));
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    localStorage.removeItem('sangnav_search_history');
  };

  const handleExecuteSearch = (searchQuery: string) => {
    const targetQuery = searchQuery.trim();
    if (!targetQuery) return;

    if (searchMode === 'local') {
      // In local mode, find closest matching link or filter
      const matched = links.find(l => 
        l.title.toLowerCase().includes(targetQuery.toLowerCase()) ||
        l.url.toLowerCase().includes(targetQuery.toLowerCase()) ||
        (l.description && l.description.toLowerCase().includes(targetQuery.toLowerCase()))
      );
      if (matched) {
        onSelectLink(matched);
      }
      return;
    }

    saveHistoryItem(targetQuery);
    recordSearch(targetQuery, { id: activeEngine.id, name: activeEngine.name });
    const targetUrl = activeEngine.url.replace('%s', encodeURIComponent(targetQuery));
    
    if (openInNewTab) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = targetUrl;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch(query);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    onFilterLinks(val);
  };

  // Keyboard shortcut listener: / or Ctrl+K to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' && document.activeElement !== inputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered bookmark suggestions when typing
  const matchingBookmarks = query.trim() 
    ? links.filter(l => 
        l.title.toLowerCase().includes(query.toLowerCase()) ||
        (l.description && l.description.toLowerCase().includes(query.toLowerCase())) ||
        l.url.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : [];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {/* Search Engines Tabs */}
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
          {enabledEngines.map((engine) => {
            const isActive = engine.id === activeEngineId && searchMode === 'web';
            return (
              <button
                key={engine.id}
                type="button"
                onClick={() => {
                  setSearchMode('web');
                  onSelectEngine(engine.id);
                  inputRef.current?.focus();
                }}
                style={
                  isActive && engine.color
                    ? {
                        backgroundColor: engine.color,
                        color: '#ffffff',
                        boxShadow: `0 2px 10px ${engine.color}45`,
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? !engine.color ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'font-semibold text-white'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface'
                }`}
              >
                {engine.color && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? '#ffffff' : engine.color }}
                  />
                )}
                <span>{engine.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Local Bookmarks Quick Filter Switcher */}
          <button
            type="button"
            onClick={() => {
              setSearchMode(searchMode === 'web' ? 'local' : 'web');
              inputRef.current?.focus();
            }}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer shrink-0 ${
              searchMode === 'local'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-surface'
            }`}
            title="在已添加的书签中实时检索"
          >
            <Bookmark className="w-3 h-3" />
            <span>书签检索</span>
          </button>

          {/* Quick Search Engine Config Shortcut */}
          {onOpenSearchSettings && (
            <button
              type="button"
              onClick={onOpenSearchSettings}
              className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-full transition-colors cursor-pointer"
              title="管理搜索引擎顺序、启用开关与自定义设置"
              aria-label="管理搜索引擎"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Primary Input Container */}
      <div className="relative">
        <form
          onSubmit={handleSubmit}
          className={`flex items-center w-full px-4 py-3 rounded-2xl bg-theme-input border transition-all duration-200 backdrop-blur-md shadow-theme-md ${
            isFocused
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-theme-default hover:border-theme-hover'
          }`}
        >
          <div className="mr-3 text-theme-muted">
            {searchMode === 'local' ? (
              <Bookmark className="w-5 h-5 text-blue-500" />
            ) : (
              <Search className="w-5 h-5 text-theme-muted" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={
              searchMode === 'local'
                ? '直接在已收藏的个人书签中搜索...'
                : activeEngine.placeholder
            }
            className="w-full bg-transparent text-sm sm:text-base text-theme-primary placeholder-theme-muted focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-surface rounded-full transition-colors mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shrink-0 cursor-pointer ml-1 shadow-xs"
          >
            <span>搜索</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Floating Dropdown: History & Instant Bookmark Matches */}
        {isFocused && (matchingBookmarks.length > 0 || (!query.trim() && history.length > 0)) && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 rounded-2xl bg-theme-elevated border border-theme-default shadow-theme-lg backdrop-blur-xl z-40 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Matching Bookmarks */}
            {matchingBookmarks.length > 0 && (
              <div className="p-1">
                <div className="text-[11px] font-medium text-theme-muted px-2.5 py-1 flex items-center justify-between">
                  <span>快捷直达书签 ({matchingBookmarks.length})</span>
                  <span className="text-[10px] opacity-75">点击直接打开</span>
                </div>
                <div className="space-y-1">
                  {matchingBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      onMouseDown={() => onSelectLink(bm)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-theme-surface cursor-pointer transition-colors text-theme-primary group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {bm.icon ? (
                          <img 
                            src={bm.icon} 
                            alt="" 
                            className="w-4 h-4 rounded-xs shrink-0 object-contain" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                          />
                        ) : (
                          <Globe className="w-4 h-4 text-theme-muted shrink-0" />
                        )}
                        <span className="font-medium truncate group-hover:text-blue-500 transition-colors">{bm.title}</span>
                        {bm.description && (
                          <span className="text-theme-muted truncate text-[11px] hidden sm:inline">
                            {bm.description}
                          </span>
                        )}
                      </div>
                      <ExternalLink className="w-3 h-3 text-theme-muted group-hover:text-theme-primary shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!query.trim() && history.length > 0 && (
              <div className="p-1">
                <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-theme-muted">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    最近搜索记录
                  </span>
                  <button
                    onMouseDown={clearAllHistory}
                    className="text-theme-muted hover:text-red-500 flex items-center gap-0.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 p-1.5">
                  {history.map((item, idx) => (
                    <span
                      key={idx}
                      onMouseDown={() => {
                        setQuery(item);
                        handleExecuteSearch(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-tag hover:bg-theme-tag-hover text-theme-secondary hover:text-theme-primary text-xs cursor-pointer transition-colors group"
                    >
                      <span>{item}</span>
                      <button
                        onMouseDown={(e) => removeHistoryItem(item, e)}
                        className="text-theme-muted hover:text-theme-primary transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard Hint */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-theme-muted">
        <span>按 <kbd className="px-1.5 py-0.5 rounded-md bg-theme-surface text-theme-secondary font-mono text-[10px] border border-theme-default shadow-xs">/</kbd> 快速激活搜索</span>
        <span>·</span>
        <span>按 <kbd className="px-1.5 py-0.5 rounded-md bg-theme-surface text-theme-secondary font-mono text-[10px] border border-theme-default shadow-xs">Enter</kbd> 立即跳转</span>
      </div>
    </div>
  );
};
