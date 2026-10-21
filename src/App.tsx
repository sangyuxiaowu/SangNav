import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  NavLinkItem, 
  NavSubLink,
  NavCategory, 
  SearchEngine, 
  UserSettings, 
  WeatherData 
} from './types/navigation';
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_LINKS, 
  DEFAULT_SEARCH_ENGINES, 
  DEFAULT_SETTINGS,
  DEFAULT_SECRET_CATEGORIES,
  DEFAULT_SECRET_LINKS 
} from './data/defaultData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchWeather } from './services/weatherService';
import { FloatingActions } from './components/FloatingActions';
import { HeroSection } from './components/HeroSection';
import { SearchBar } from './components/SearchBar';
import { QuickDock } from './components/QuickDock';
import { CategoryNav } from './components/CategoryNav';
import { LinkGrid } from './components/LinkGrid';
import { LinkModal } from './components/LinkModal';
import { CategoryModal } from './components/CategoryModal';
import { SettingsModal } from './components/SettingsModal';
import { SecretLockModal } from './components/SecretLockModal';
import { SecretSettingsModal } from './components/SecretSettingsModal';
import { PWAUpdateModal } from './components/PWAUpdateModal';
import { formatUrl, getFaviconUrl, isBrowserInternalUrl, resolveSubLinkUrl } from './utils/urlUtils';
import { recordVisit, seedInitialAnalyticsIfEmpty } from './services/analyticsDb';
import { deleteCachedFavicon } from './services/faviconDb';
import { Sparkles, Layers, ShieldCheck, Compass, CheckCircle2, Lock, EyeOff, Copy, X } from 'lucide-react';

export default function App() {
  // Persistent State
  const [links, setLinks] = useLocalStorage<NavLinkItem[]>('sangnav_links', DEFAULT_LINKS);
  const [categories, setCategories] = useLocalStorage<NavCategory[]>('sangnav_categories', DEFAULT_CATEGORIES);
  const [engines, setEngines] = useLocalStorage<SearchEngine[]>('sangnav_engines', DEFAULT_SEARCH_ENGINES);
  const [settings, setSettings] = useLocalStorage<UserSettings>('sangnav_settings', DEFAULT_SETTINGS);
  const [activeEngineId, setActiveEngineId] = useLocalStorage<string>(
    'sangnav_active_engine',
    settings.defaultEngineId || 'bing'
  );

  // Runtime View State
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [searchFilterQuery, setSearchFilterQuery] = useState<string>('');
  const [isManageMode, setIsManageMode] = useState<boolean>(false);

  // Modals State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<NavLinkItem | null>(null);
  const [defaultCategoryForNewLink, setDefaultCategoryForNewLink] = useState<string | undefined>();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'wallpaper' | 'analytics' | 'search' | 'data'>('appearance');
  const [browserUrlNotice, setBrowserUrlNotice] = useState<{
    url: string;
    status: 'copying' | 'copied' | 'failed';
  } | null>(null);

  // Secret Navigation State
  const [isSecretMode, setIsSecretMode] = useState<boolean>(false);
  const [secretLinks, setSecretLinks] = useLocalStorage<NavLinkItem[]>('sangnav_secret_links', DEFAULT_SECRET_LINKS);
  const [secretCategories, setSecretCategories] = useLocalStorage<NavCategory[]>('sangnav_secret_categories', DEFAULT_SECRET_CATEGORIES);
  const [secretPattern, setSecretPattern] = useLocalStorage<number[] | null>('sangnav_secret_pattern', null);
  const [autoLockOnBlur, setAutoLockOnBlur] = useLocalStorage<boolean>('sangnav_secret_autolock', false);

  const faviconSources = JSON.stringify([...new Set(
    [...links, ...secretLinks].flatMap((link) =>
      (['google', 'icon-horse', 'syxw', 'origin'] as const)
        .map((provider) => getFaviconUrl(link.url, link.icon, provider))
        .filter(Boolean)
    )
  )]);
  const previousFaviconSources = useRef(new Set<string>());

  useEffect(() => {
    const currentSources = new Set<string>(JSON.parse(faviconSources));
    for (const source of previousFaviconSources.current) {
      if (!currentSources.has(source)) void deleteCachedFavicon(source);
    }
    previousFaviconSources.current = currentSources;
  }, [faviconSources]);

  const [isSecretLockModalOpen, setIsSecretLockModalOpen] = useState(false);
  const [secretLockMode, setSecretLockMode] = useState<'set' | 'unlock'>('unlock');
  const [isSecretSettingsModalOpen, setIsSecretSettingsModalOpen] = useState(false);

  // Weather State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Load weather on mount
  const loadWeather = useCallback(async (customIp?: string) => {
    setWeatherLoading(true);
    try {
      const data = await fetchWeather(customIp, !!customIp);
      setWeather(data);
    } catch (e) {
      console.warn('Weather fetch error:', e);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
    seedInitialAnalyticsIfEmpty(links);
  }, [loadWeather]);

  // Migrate outdated wallpaper URLs if stored in user's localStorage
  useEffect(() => {
    let changed = false;
    const newSettings = { ...settings };

    if (
      settings.wallpaperPreset === 'bing' ||
      settings.customWallpaperUrl === 'https://bing.img.run/1920x1080.php' ||
      (settings.customWallpaperUrl && settings.customWallpaperUrl.includes('bing.img.run'))
    ) {
      newSettings.customWallpaperUrl = 'https://uapis.cn/api/v1/image/bing-daily';
      newSettings.wallpaperPreset = 'bing';
      changed = true;
    }

    if (
      settings.wallpaperPreset === 'cyberpunk' &&
      settings.customWallpaperUrl?.includes('photo-1509198397868-475647b2a1e5')
    ) {
      newSettings.customWallpaperUrl = 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2560&q=80';
      changed = true;
    }

    if (!localStorage.getItem('sangnav_default_target_initialized')) {
      newSettings.openInNewTab = false;
      changed = true;
      localStorage.setItem('sangnav_default_target_initialized', 'true');
    }

    if (changed) {
      setSettings(newSettings);
    }
  }, []);

  // Backfill default subLinks once for existing users if not yet initialized
  useEffect(() => {
    if (localStorage.getItem('sangnav_sublinks_seeded_v2')) return;
    localStorage.setItem('sangnav_sublinks_seeded_v2', 'true');

    const defaultSubLinksMap = new Map(
      DEFAULT_LINKS.filter((l) => l.subLinks && l.subLinks.length > 0).map((l) => [l.id, l.subLinks])
    );
    let updatedAny = false;
    const nextLinks = links.map((link) => {
      if (defaultSubLinksMap.has(link.id)) {
        const hasNoSubLinks = !link.subLinks || link.subLinks.length === 0;
        const hasOldGhSub =
          link.id === 'link-1' &&
          link.subLinks?.some((s) => s.id === 'sub-gh-2' && s.title === 'Pull Requests');
        if (hasNoSubLinks || hasOldGhSub) {
          updatedAny = true;
          return { ...link, subLinks: defaultSubLinksMap.get(link.id) };
        }
      }
      return link;
    });
    if (updatedAny) {
      setLinks(nextLinks);
    }
  }, []);

  // Backfill search engine properties (enabled, placeholder, color) if missing from older data
  useEffect(() => {
    let changed = false;
    const defaultEnginesMap = new Map(DEFAULT_SEARCH_ENGINES.map(e => [e.id, e]));
    const updated = engines.map((eng) => {
      let itemChanged = false;
      const fallback = defaultEnginesMap.get(eng.id);
      const newItem = { ...eng };
      if (newItem.enabled === undefined) {
        newItem.enabled = fallback?.enabled !== undefined ? fallback.enabled : true;
        itemChanged = true;
      }
      if (!newItem.placeholder) {
        newItem.placeholder = fallback?.placeholder || `在 ${newItem.name} 中搜索...`;
        itemChanged = true;
      }
      if (!newItem.color) {
        newItem.color = fallback?.color || '#2563EB';
        itemChanged = true;
      }
      if (itemChanged) changed = true;
      return newItem;
    });

    if (changed) {
      setEngines(updated);
    }
  }, []);

  // Secret Mode Trigger (3-times Alt)
  const altTapsRef = useRef<number[]>([]);

  const handleTriggerSecretMode = useCallback(() => {
    if (isSecretMode) {
      // Toggle off / exit
      setIsSecretMode(false);
      setActiveCategoryId('all');
    } else {
      // Enter secret mode flow
      if (!secretPattern || secretPattern.length === 0) {
        // First time: prompt to set pattern
        setSecretLockMode('set');
        setIsSecretLockModalOpen(true);
      } else {
        // Pattern exists: prompt to unlock
        setSecretLockMode('unlock');
        setIsSecretLockModalOpen(true);
      }
    }
  }, [isSecretMode, secretPattern]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      // Alt key 3-taps (with preventDefault to avoid Windows menu focus)
      if (e.key === 'Alt') {
        e.preventDefault();
        const now = Date.now();
        const recent = altTapsRef.current.filter((t: number) => now - t <= 850);
        recent.push(now);
        altTapsRef.current = recent;

        if (recent.length >= 3) {
          altTapsRef.current = [];
          handleTriggerSecretMode();
        }
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [handleTriggerSecretMode]);

  // Auto-lock when window loses focus (if enabled)
  useEffect(() => {
    if (!autoLockOnBlur || !isSecretMode) return;

    const handleBlur = () => {
      setIsSecretMode(false);
      setActiveCategoryId('all');
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [autoLockOnBlur, isSecretMode]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent solo Alt key from triggering the browser menu bar in Windows/Linux Chrome & Edge
      if (e.key === 'Alt' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        // Prevent default browser menu focus
        e.preventDefault();
      }

      // Alt + N: Quick add link
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingLink(null);
        setIsLinkModalOpen(true);
      }

      // Esc: Close manage mode or panic escape from secret mode
      if (e.key === 'Escape') {
        if (isManageMode) {
          setIsManageMode(false);
        } else if (
          isSecretMode &&
          !isSecretLockModalOpen &&
          !isSecretSettingsModalOpen &&
          !isLinkModalOpen &&
          !isCategoryModalOpen &&
          !isSettingsModalOpen
        ) {
          setIsSecretMode(false);
          setActiveCategoryId('all');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isManageMode,
    isSecretMode,
    isSecretLockModalOpen,
    isSecretSettingsModalOpen,
    isLinkModalOpen,
    isCategoryModalOpen,
    isSettingsModalOpen,
    handleTriggerSecretMode,
  ]);

  // Link Handlers
  const copyBrowserInternalUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setBrowserUrlNotice((current) =>
        current?.url === url ? { ...current, status: 'copied' } : current
      );
    } catch {
      setBrowserUrlNotice((current) =>
        current?.url === url ? { ...current, status: 'failed' } : current
      );
    }
  };

  const handleOpenLink = (link: NavLinkItem, subLink?: NavSubLink) => {
    const targetUrl = subLink
      ? resolveSubLinkUrl(link.url, subLink.url)
      : formatUrl(link.url);
    if (isBrowserInternalUrl(targetUrl)) {
      setBrowserUrlNotice({ url: targetUrl, status: 'copying' });
      void copyBrowserInternalUrl(targetUrl);
      return;
    }

    // Increment click counter on active list
    if (isSecretMode) {
      setSecretLinks((prev) =>
        prev.map((item) =>
          item.id === link.id ? { ...item, clicks: (item.clicks || 0) + 1 } : item
        )
      );
    } else {
      setLinks((prev) =>
        prev.map((item) =>
          item.id === link.id ? { ...item, clicks: (item.clicks || 0) + 1 } : item
        )
      );
      // Record visit in IndexedDB for telemetry & analytics (public mode only for stealth)
      recordVisit({
        id: link.id,
        title: subLink ? `${link.title} · ${subLink.title}` : link.title,
        url: targetUrl,
        categoryId: link.categoryId,
      });
    }

    if (settings.openInNewTab) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = targetUrl;
    }
  };

  const handleSaveLink = (
    data: Omit<NavLinkItem, 'id' | 'createdAt' | 'clicks'>,
    id?: string
  ) => {
    const setter = isSecretMode ? setSecretLinks : setLinks;
    const categorySetter = isSecretMode ? setSecretCategories : setCategories;
    const categoryList = isSecretMode ? secretCategories : categories;
    const category = categoryList.find((item) => item.id === data.categoryId)
      ?? categoryList[0]
      ?? { id: 'default', name: '未分类', iconName: 'Layers', order: 1 };
    if (categoryList.length === 0) categorySetter([category]);
    const savedData = { ...data, categoryId: category.id };

    if (id) {
      // Edit existing
      setter((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...savedData, subLinks: savedData.subLinks }
            : item
        )
      );
    } else {
      // Add new
      const newLink: NavLinkItem = {
        ...savedData,
        id: `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clicks: 0,
        createdAt: Date.now(),
      };
      setter((prev) => [newLink, ...prev]);
    }
  };

  const handleDeleteLink = (id: string) => {
    const setter = isSecretMode ? setSecretLinks : setLinks;
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const handleTogglePin = (link: NavLinkItem) => {
    const setter = isSecretMode ? setSecretLinks : setLinks;
    setter((prev) =>
      prev.map((item) =>
        item.id === link.id ? { ...item, pinned: !item.pinned } : item
      )
    );
  };

  const handleReorderLinks = (linkIds: string[]) => {
    const setter = isSecretMode ? setSecretLinks : setLinks;
    setter((prev) => {
      const linksById = new Map(prev.map((link) => [link.id, link]));
      const orderedLinks = linkIds
        .map((id) => linksById.get(id))
        .filter((link): link is NavLinkItem => link !== undefined);
      const reorderedIds = new Set(linkIds);
      let orderedIndex = 0;
      return prev.map((link) =>
        reorderedIds.has(link.id) ? orderedLinks[orderedIndex++] : link
      );
    });
  };

  // Category Handlers
  const handleAddCategory = (name: string, iconName?: string) => {
    const setter = isSecretMode ? setSecretCategories : setCategories;
    const catList = isSecretMode ? secretCategories : categories;
    const newCategory: NavCategory = {
      id: `cat-${Date.now()}`,
      name,
      iconName: iconName || 'Layers',
      order: catList.length + 1,
    };
    setter((prev) => [...prev, newCategory]);
  };

  const handleRenameCategory = (id: string, newName: string) => {
    const setter = isSecretMode ? setSecretCategories : setCategories;
    setter((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const handleDeleteCategory = (id: string) => {
    const catList = isSecretMode ? secretCategories : categories;
    const setCat = isSecretMode ? setSecretCategories : setCategories;
    const setLnk = isSecretMode ? setSecretLinks : setLinks;

    if (catList.length <= 1) return;
    const remainingCategories = catList.filter((c) => c.id !== id);
    const fallbackId = remainingCategories[0]?.id || 'default';

    // Move associated links to fallback category
    setLnk((prev) =>
      prev.map((l) => (l.categoryId === id ? { ...l, categoryId: fallbackId } : l))
    );
    setCat(remainingCategories);

    if (activeCategoryId === id) {
      setActiveCategoryId('all');
    }
  };

  const handleMoveCategory = (id: string, direction: 'up' | 'down') => {
    const catList = isSecretMode ? secretCategories : categories;
    const setCat = isSecretMode ? setSecretCategories : setCategories;

    const index = catList.findIndex((c) => c.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === catList.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...catList];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);

    // Reassign order
    const ordered = updated.map((c, i) => ({ ...c, order: i + 1 }));
    setCat(ordered);
  };

  // Import / Reset Handlers
  const handleImportAllData = (data: {
    categories: NavCategory[];
    links: NavLinkItem[];
    engines: SearchEngine[];
    settings: UserSettings;
  }) => {
    setCategories(data.categories);
    setLinks(data.links);
    setEngines(data.engines);
    setSettings(data.settings);
  };

  const handleResetToDefaults = () => {
    setCategories(DEFAULT_CATEGORIES);
    setLinks(DEFAULT_LINKS);
    setEngines(DEFAULT_SEARCH_ENGINES);
    setSettings(DEFAULT_SETTINGS);
    setActiveEngineId('bing');
    setActiveCategoryId('all');
  };

  // Active data source based on current mode
  const currentLinks = isSecretMode ? secretLinks : links;
  const currentCategories = isSecretMode ? secretCategories : categories;

  useEffect(() => {
    if (activeCategoryId !== 'all' && !currentLinks.some((link) => link.categoryId === activeCategoryId)) {
      setActiveCategoryId('all');
    }

    const categoryIds = new Set(currentCategories.map((category) => category.id));
    if (!currentLinks.some((link) => !categoryIds.has(link.categoryId))) return;

    const fallback = currentCategories[0]
      ?? { id: 'default', name: '未分类', iconName: 'Layers', order: 1 };
    const categorySetter = isSecretMode ? setSecretCategories : setCategories;
    const linkSetter = isSecretMode ? setSecretLinks : setLinks;
    if (currentCategories.length === 0) categorySetter([fallback]);
    linkSetter((previous) => previous.map((link) =>
      categoryIds.has(link.categoryId) ? link : { ...link, categoryId: fallback.id }
    ));
  }, [currentLinks, currentCategories, activeCategoryId, isSecretMode]);

  // Computed data
  const pinnedLinks = useMemo(() => currentLinks.filter((l) => l.pinned), [currentLinks]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentLinks.forEach((l) => {
      counts[l.categoryId] = (counts[l.categoryId] || 0) + 1;
    });
    return counts;
  }, [currentLinks]);

  // Theme styling configuration
  const themeContainerClass = useMemo(() => {
    switch (settings.theme) {
      case 'midnight':
        return 'bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200';
      case 'light':
        return 'bg-stone-100 text-stone-900 selection:bg-blue-500/20 selection:text-blue-800';
      case 'emerald':
        return 'bg-[#09110d] text-emerald-100 selection:bg-emerald-500/30 selection:text-emerald-200';
      case 'amber':
        return 'bg-[#120e0b] text-amber-100 selection:bg-amber-500/30 selection:text-amber-200';
      case 'dark':
      default:
        return 'bg-neutral-900 text-neutral-100 selection:bg-blue-500/30 selection:text-blue-200';
    }
  }, [settings.theme]);

  const hasWallpaper = Boolean(settings.customWallpaperUrl && settings.customWallpaperUrl.trim());

  return (
    <div 
      data-theme={settings.theme}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 bg-theme-base text-theme-primary selection:bg-blue-500/20 selection:text-blue-600 relative overflow-x-hidden`}
    >
      {/* Background Layer: Wallpaper Image or Subtle Ambient Glow */}
      {hasWallpaper ? (
        <div 
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        >
          {/* Wallpaper Image */}
          <div 
            className="absolute -inset-6 bg-cover bg-center transition-all duration-500 ease-out"
            style={{
              backgroundImage: `url("${settings.customWallpaperUrl}")`,
              filter: `blur(${settings.wallpaperBlur ?? 0}px)`,
              transform: 'scale(1.04)',
            }}
          />
          {/* Contrast & Readability Overlay Mask */}
          <div 
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              backgroundColor: settings.theme === 'light' ? '#f8fafc' : '#0a0a0a',
              opacity: (settings.wallpaperMaskOpacity ?? 35) / 100,
            }}
          />
        </div>
      ) : (
        /* Native ambient subtle light (when no wallpaper) */
        <div 
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none opacity-40 overflow-hidden z-0"
        >
          <div 
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] blur-3xl rounded-full"
            style={{
              background: 'radial-gradient(circle, var(--bg-ambient-from) 0%, var(--bg-ambient-to) 70%)'
            }}
          />
        </div>
      )}

      {/* Secret Navigation Top Floating Badge */}
      {isSecretMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-purple-950/90 border border-purple-500/50 text-purple-200 text-xs shadow-xl shadow-purple-950/60 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-white">私密导航空间</span>
            <span className="text-purple-400/60">|</span>
            <span className="text-[11px] text-purple-300 hidden sm:inline">三击 Alt 呼出 / 按 Esc 快速伪装退出</span>
            <button
              type="button"
              onClick={() => {
                setIsSecretMode(false);
                setActiveCategoryId('all');
              }}
              className="px-2 py-0.5 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 transition-colors cursor-pointer text-[10px] font-medium"
            >
              退出锁定
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7 relative z-10 transition-all duration-300 ${
        settings.columnsCount === 6 ? 'max-w-[1440px]' : settings.columnsCount === 5 ? 'max-w-7xl' : 'max-w-6xl'
      }`}>
        {/* Hero Section: Live Clock & Weather Greeting */}
        <HeroSection
          weather={weather}
          weatherLoading={weatherLoading}
          onRefreshWeather={loadWeather}
          showWeatherInHero={settings.showWeatherInHero}
          onTriggerSecretMode={handleTriggerSecretMode}
        />

        {/* Multi-Engine Search Bar */}
        <SearchBar
          engines={engines}
          activeEngineId={activeEngineId}
          onSelectEngine={setActiveEngineId}
          openInNewTab={settings.openInNewTab}
          links={currentLinks}
          onSelectLink={handleOpenLink}
          onFilterLinks={setSearchFilterQuery}
          onOpenSearchSettings={() => {
            setSettingsInitialTab('search');
            setIsSettingsModalOpen(true);
          }}
        />

        {/* Pinned Bookmarks Dock (if enabled) */}
        {settings.showPinnedDock && (
          <QuickDock
            faviconProvider={settings.faviconProvider}
            pinnedLinks={pinnedLinks}
            onOpenLink={handleOpenLink}
            onAddLink={() => {
              setEditingLink(null);
              setIsLinkModalOpen(true);
            }}
            isManageMode={isManageMode}
            onUnpin={handleTogglePin}
          />
        )}

        {/* Categories Navigation Bar */}
        <CategoryNav
          categories={currentCategories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          categoryCounts={categoryCounts}
          totalLinksCount={currentLinks.length}
          onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
          isManageMode={isManageMode}
          onToggleManageMode={() => setIsManageMode(!isManageMode)}
        />

        {/* Manage Mode Status Bar (Visible when in manage mode) */}
        {isManageMode && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-xs text-blue-600 dark:text-blue-300 animate-in fade-in duration-150 shadow-theme-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="font-medium">
                正在卡片整理模式：可拖拽排序、编辑、取消置顶或删除网址
              </span>
            </div>
            <button
              onClick={() => setIsManageMode(false)}
              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors cursor-pointer shadow-xs"
            >
              完成整理
            </button>
          </div>
        )}

        {/* Link Cards Grid */}
        <LinkGrid
          faviconProvider={settings.faviconProvider}
          categories={currentCategories}
          links={currentLinks}
          activeCategoryId={activeCategoryId}
          columnsCount={settings.columnsCount}
          isManageMode={isManageMode}
          onOpenLink={handleOpenLink}
          onEditLink={(link) => {
            setEditingLink(link);
            setIsLinkModalOpen(true);
          }}
          onDeleteLink={handleDeleteLink}
          onTogglePin={handleTogglePin}
          onReorderLinks={handleReorderLinks}
          onAddNewLink={(catId) => {
            setEditingLink(null);
            setDefaultCategoryForNewLink(catId);
            setIsLinkModalOpen(true);
          }}
          searchFilterQuery={searchFilterQuery}
        />
      </main>

      {browserUrlNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,36rem)] -translate-x-1/2 rounded-xl border border-amber-500/30 bg-theme-surface p-4 text-theme-primary shadow-theme-lg"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-medium">
                浏览器安全限制：网页不能直接打开内部页面。请将地址粘贴到浏览器地址栏。
              </p>
              <code className="block break-all select-all rounded-md bg-theme-base px-2 py-1.5 text-[11px] text-theme-secondary">
                {browserUrlNotice.url}
              </code>
              <p className="text-[11px] text-theme-muted">
                {browserUrlNotice.status === 'copying' && '正在复制地址…'}
                {browserUrlNotice.status === 'copied' && '地址已复制，可粘贴到地址栏打开。'}
                {browserUrlNotice.status === 'failed' && '自动复制失败，请手动复制上方地址。'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copyBrowserInternalUrl(browserUrlNotice.url)}
              className="shrink-0 rounded-lg p-2 text-theme-muted transition-colors hover:bg-theme-base hover:text-theme-primary"
              title="重新复制地址"
              aria-label="重新复制地址"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setBrowserUrlNotice(null)}
              className="shrink-0 rounded-lg p-2 text-theme-muted transition-colors hover:bg-theme-base hover:text-theme-primary"
              title="关闭提示"
              aria-label="关闭提示"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Buttons (Add Link & Settings) */}
      <FloatingActions
        onOpenAddLink={() => {
          setEditingLink(null);
          setDefaultCategoryForNewLink(activeCategoryId === 'all' ? undefined : activeCategoryId);
          setIsLinkModalOpen(true);
        }}
        onOpenSettings={() => {
          setSettingsInitialTab('appearance');
          setIsSettingsModalOpen(true);
        }}
        isSecretMode={isSecretMode}
        onExitSecretMode={() => {
          setIsSecretMode(false);
          setActiveCategoryId('all');
        }}
        onOpenSecretSettings={() => setIsSecretSettingsModalOpen(true)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-theme-subtle py-6 text-center text-xs text-theme-muted space-y-1 relative z-10">
        <div className="flex items-center justify-center gap-3">
          <span>轻启 SangNav · 极简个人起始页</span>
          <span>·</span>
          <span>按 Alt+N 快捷新建网址</span>
          <span>·</span>
          <span>按 / 键激活全网搜索</span>
        </div>
        <p className="text-[11px] opacity-75">
          本地存储安全隐私
        </p>
      </footer>

      {/* Modals */}
      <LinkModal
        faviconProvider={settings.faviconProvider}
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setEditingLink(null);
        }}
        categories={currentCategories}
        initialData={editingLink}
        defaultCategoryId={defaultCategoryForNewLink}
        onSave={handleSaveLink}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={currentCategories}
        onAddCategory={handleAddCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        onMoveCategory={handleMoveCategory}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        engines={engines}
        onUpdateEngines={setEngines}
        categories={categories}
        links={links}
        onImportAllData={handleImportAllData}
        onResetToDefaults={handleResetToDefaults}
        initialTab={settingsInitialTab}
      />

      {/* Secret Pattern Lock Modal */}
      <SecretLockModal
        isOpen={isSecretLockModalOpen}
        mode={secretLockMode}
        storedPattern={secretPattern || undefined}
        onSuccess={(pattern) => {
          if (secretLockMode === 'set') {
            setSecretPattern(pattern);
          }
          setIsSecretLockModalOpen(false);
          setIsSecretMode(true);
          setActiveCategoryId('all');
        }}
        onClose={() => setIsSecretLockModalOpen(false)}
      />

      {/* Secret Settings Modal */}
      <SecretSettingsModal
        isOpen={isSecretSettingsModalOpen}
        onClose={() => setIsSecretSettingsModalOpen(false)}
        hasPattern={Boolean(secretPattern && secretPattern.length > 0)}
        onResetPattern={() => {
          setSecretLockMode('set');
          setIsSecretLockModalOpen(true);
        }}
        onClearPattern={() => setSecretPattern(null)}
        secretLinks={secretLinks}
        secretCategories={secretCategories}
        onClearSecretData={() => {
          setSecretLinks([]);
          setSecretCategories([]);
        }}
        autoLockOnBlur={autoLockOnBlur}
        onToggleAutoLockOnBlur={setAutoLockOnBlur}
        onExitSecretMode={() => {
          setIsSecretMode(false);
          setActiveCategoryId('all');
        }}
      />

      {/* PWA Version Update Bottom-Right Modal */}
      <PWAUpdateModal />
    </div>
  );
}
