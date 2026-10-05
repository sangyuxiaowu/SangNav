import React, { useState, useRef, useEffect } from 'react';
import { 
  UserSettings, 
  SearchEngine, 
  NavCategory, 
  NavLinkItem, 
  ThemeMode,
  FaviconProvider
} from '../types/navigation';
import { 
  X, 
  Settings, 
  Download, 
  Upload, 
  RotateCcw, 
  Monitor, 
  Palette, 
  Search, 
  Grid, 
  Trash2, 
  Plus, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { AnalyticsView } from './AnalyticsView';
import { clearAllAnalytics } from '../services/analyticsDb';
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_LINKS, 
  DEFAULT_SEARCH_ENGINES, 
  DEFAULT_SETTINGS,
  WALLPAPER_PRESETS 
} from '../data/defaultData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  engines: SearchEngine[];
  onUpdateEngines: (newEngines: SearchEngine[]) => void;
  categories: NavCategory[];
  links: NavLinkItem[];
  onImportAllData: (data: {
    categories: NavCategory[];
    links: NavLinkItem[];
    engines: SearchEngine[];
    settings: UserSettings;
  }) => void;
  onResetToDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  engines,
  onUpdateEngines,
  categories,
  links,
  onImportAllData,
  onResetToDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'wallpaper' | 'analytics' | 'search' | 'data'>('appearance');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmResetDefaults, setConfirmResetDefaults] = useState(false);
  const [confirmClearStats, setConfirmClearStats] = useState(false);
  const [statsClearMessage, setStatsClearMessage] = useState<string | null>(null);

  // New engine form state
  const [engineName, setEngineName] = useState('');
  const [engineUrl, setEngineUrl] = useState('');
  const [engineShortcut, setEngineShortcut] = useState('');
  const [engineError, setEngineError] = useState('');

  // Wallpaper state
  const [wallpaperUrlInput, setWallpaperUrlInput] = useState(settings.customWallpaperUrl || '');

  useEffect(() => {
    setWallpaperUrlInput(settings.customWallpaperUrl || '');
  }, [settings.customWallpaperUrl, isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperImageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image upload
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择有效的图片文件 (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdateSettings({
        ...settings,
        customWallpaperUrl: dataUrl,
        wallpaperPreset: 'custom',
      });
      setWallpaperUrlInput(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyWallpaperUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallpaperUrlInput.trim()) return;
    onUpdateSettings({
      ...settings,
      customWallpaperUrl: wallpaperUrlInput.trim(),
      wallpaperPreset: 'custom',
    });
  };

  const handleSelectPreset = (preset: typeof WALLPAPER_PRESETS[0]) => {
    if (preset.id === 'default') {
      onUpdateSettings({
        ...settings,
        wallpaperPreset: 'default',
        customWallpaperUrl: '',
      });
      setWallpaperUrlInput('');
    } else {
      onUpdateSettings({
        ...settings,
        wallpaperPreset: preset.id as any,
        customWallpaperUrl: preset.url,
      });
      setWallpaperUrlInput(preset.url);
    }
  };

  const handleClearWallpaper = () => {
    onUpdateSettings({
      ...settings,
      wallpaperPreset: 'default',
      customWallpaperUrl: '',
    });
    setWallpaperUrlInput('');
  };

  // Handle Export JSON
  const handleExportData = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      engines,
      categories,
      links,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `novanav-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.links)) {
          throw new Error('备份文件格式不符合规范，缺少必要数据');
        }

        onImportAllData({
          categories: parsed.categories,
          links: parsed.links,
          engines: Array.isArray(parsed.engines) && parsed.engines.length > 0 ? parsed.engines : engines,
          settings: parsed.settings ? { ...settings, ...parsed.settings } : settings,
        });

        setImportStatus('数据导入成功！已恢复所有书签与分类');
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        setImportStatus(`导入失败: ${err.message || '未知错误'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Add custom search engine
  const handleAddEngine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!engineName.trim() || !engineUrl.trim()) {
      setEngineError('请填写搜索引擎名称和查询 URL');
      return;
    }
    if (!engineUrl.includes('%s')) {
      setEngineError('搜索 URL 必须包含 %s 作为查询词占位符 (例如: https://example.com/s?q=%s)');
      return;
    }

    const newEngine: SearchEngine = {
      id: `engine-${Date.now()}`,
      name: engineName.trim(),
      url: engineUrl.trim(),
      iconName: 'custom',
      placeholder: `在 ${engineName.trim()} 中搜索...`,
      shortcut: engineShortcut.trim().toUpperCase() || engineName.trim().charAt(0).toUpperCase(),
    };

    onUpdateEngines([...engines, newEngine]);
    setEngineName('');
    setEngineUrl('');
    setEngineShortcut('');
    setEngineError('');
  };

  const handleDeleteEngine = (id: string) => {
    if (engines.length <= 1) return;
    const next = engines.filter((e) => e.id !== id);
    onUpdateEngines(next);
    if (settings.defaultEngineId === id) {
      onUpdateSettings({ ...settings, defaultEngineId: next[0].id });
    }
  };

  const themes: { id: ThemeMode; name: string; bgClass: string; borderClass: string }[] = [
    { id: 'dark', name: '深邃暗夜', bgClass: 'bg-neutral-900', borderClass: 'border-neutral-700' },
    { id: 'midnight', name: '星空蔚蓝', bgClass: 'bg-slate-950', borderClass: 'border-blue-900/60' },
    { id: 'light', name: '极简明亮', bgClass: 'bg-neutral-100', borderClass: 'border-neutral-300' },
    { id: 'emerald', name: '翡翠沉木', bgClass: 'bg-stone-950', borderClass: 'border-emerald-900/60' },
    { id: 'amber', name: '暖调流金', bgClass: 'bg-neutral-950', borderClass: 'border-amber-900/60' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl lg:max-w-3xl bg-theme-surface border border-theme-default rounded-3xl shadow-theme-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150 text-theme-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-subtle shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary">个性化设置与偏好</h3>
              <p className="text-xs text-theme-muted">外观壁纸、使用统计分析、搜索引擎配置与数据备份</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-base transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-2 border-b border-theme-subtle shrink-0 bg-theme-surface overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'appearance'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>外观与布局</span>
          </button>
          <button
            onClick={() => setActiveTab('wallpaper')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'wallpaper'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>壁纸与背景</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>使用偏好统计</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>搜索引擎</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-theme-muted hover:text-theme-primary'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>数据与备份</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs no-scrollbar">
          {/* TAB 1: Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Selection */}
              <div className="space-y-2.5">
                <label className="font-semibold text-theme-primary">主题色彩模式</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {themes.map((th) => (
                    <button
                      key={th.id}
                      onClick={() => onUpdateSettings({ ...settings, theme: th.id })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        settings.theme === th.id
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-theme-surface shadow-xs'
                          : 'border-theme-default hover:border-theme-hover bg-theme-base'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl ${th.bgClass} border ${th.borderClass} flex items-center justify-center shadow-xs`}>
                        {settings.theme === th.id && <Check className="w-4 h-4 text-blue-400" />}
                      </div>
                      <span className="text-[11px] text-theme-primary font-medium">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Columns */}
              <div className="space-y-2.5">
                <label className="font-semibold text-theme-primary">每行卡片列数</label>
                <div className="grid grid-cols-4 gap-2">
                  {([3, 4, 5, 6] as const).map((cols) => (
                    <button
                      key={cols}
                      onClick={() => onUpdateSettings({ ...settings, columnsCount: cols })}
                      className={`py-2 px-3 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                        settings.columnsCount === cols
                          ? 'bg-blue-600/15 border-blue-500 text-blue-500 font-semibold'
                          : 'bg-theme-base border-theme-default text-theme-muted hover:text-theme-primary'
                      }`}
                    >
                      {cols} 列布局
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label htmlFor="favicon-provider" className="font-semibold text-theme-primary">无自定义图标时</label>
                <select
                  id="favicon-provider"
                  value={settings.faviconProvider ?? 'icon-horse'}
                  onChange={(event) => onUpdateSettings({ ...settings, faviconProvider: event.target.value as FaviconProvider })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 focus:outline-none text-theme-primary text-xs"
                >
                  <option value="google">Google</option>
                  <option value="icon-horse">Icon Horse</option>
                  <option value="origin">源站 favicon.ico</option>
                  <option value="default">默认兜底图标</option>
                </select>
              </div>

              {/* Link Target */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-theme-base border border-theme-default">
                <div>
                  <div className="font-semibold text-theme-primary">在新标签页中打开网址</div>
                  <div className="text-[11px] text-theme-muted">点击书签链接时，保留当前导航页并在新窗口启动</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, openInNewTab: !settings.openInNewTab })}
                  className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.openInNewTab ? 'bg-blue-600 justify-end' : 'bg-theme-default justify-start'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Pinned Dock Visibility */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-theme-base border border-theme-default">
                <div>
                  <div className="font-semibold text-theme-primary">显示常用直达栏 (置顶坞)</div>
                  <div className="text-[11px] text-theme-muted">在搜索框下方展示标记为星标置顶的高频网址</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, showPinnedDock: !settings.showPinnedDock })}
                  className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.showPinnedDock ? 'bg-blue-600 justify-end' : 'bg-theme-default justify-start'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Hero Weather Display */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-theme-base border border-theme-default">
                <div>
                  <div className="font-semibold text-theme-primary">在问候区显示详细天气胶囊</div>
                  <div className="text-[11px] text-theme-muted">在大时钟下方直接展示当前实时温度与风向指标</div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, showWeatherInHero: !settings.showWeatherInHero })}
                  className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    settings.showWeatherInHero ? 'bg-blue-600 justify-end' : 'bg-theme-default justify-start'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Wallpaper Quick Entry in Appearance */}
              <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-theme-primary">背景图片与壁纸</div>
                    <div className="text-[11px] text-theme-muted">
                      {settings.customWallpaperUrl
                        ? `已启用壁纸 (${WALLPAPER_PRESETS.find(p => p.url === settings.customWallpaperUrl)?.name || '自定义'})`
                        : '当前为纯净微光，支持精选高清壁纸、每日必应与自定义图片'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('wallpaper')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  配置壁纸
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Wallpaper & Background Settings */}
          {activeTab === 'wallpaper' && (
            <div className="space-y-6">
              {/* Current Wallpaper Status Card */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-10 rounded-xl overflow-hidden border border-theme-default bg-theme-surface shrink-0 relative flex items-center justify-center">
                    {settings.customWallpaperUrl ? (
                      <img
                        src={settings.customWallpaperUrl}
                        alt="当前壁纸"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-[10px] text-theme-muted flex items-center justify-center">无壁纸</div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-theme-primary flex items-center gap-1.5">
                      <span>当前壁纸：</span>
                      <span className="text-blue-500">
                        {settings.customWallpaperUrl
                          ? (WALLPAPER_PRESETS.find(p => p.url === settings.customWallpaperUrl)?.name || '自定义壁纸')
                          : '纯净微光 (原生)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-theme-muted">
                      {settings.customWallpaperUrl ? '支持调节暗度遮罩与高斯模糊' : '未启用背景图片，显示系统纯净基底'}
                    </div>
                  </div>
                </div>

                {settings.customWallpaperUrl && (
                  <button
                    type="button"
                    onClick={handleClearWallpaper}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>恢复纯净默认</span>
                  </button>
                )}
              </div>

              {/* Wallpaper Presets Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-theme-primary">精选官方高清壁纸</label>
                  <span className="text-[11px] text-theme-muted">点击即刻切换实时预览</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {WALLPAPER_PRESETS.map((preset) => {
                    const isSelected = preset.id === 'default'
                      ? !settings.customWallpaperUrl
                      : settings.customWallpaperUrl === preset.url;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`group relative flex flex-col text-left rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                            : 'border-theme-default hover:border-theme-hover bg-theme-base'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-full h-24 bg-theme-surface relative overflow-hidden flex items-center justify-center">
                          {preset.thumbnail ? (
                            <img
                              src={preset.thumbnail}
                              alt={preset.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-theme-muted">
                              <Sparkles className="w-5 h-5 text-blue-500/70" />
                              <span className="text-[10px]">纯色微光</span>
                            </div>
                          )}

                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}

                          {preset.id === 'bing' && (
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-medium">
                              每日更新
                            </div>
                          )}
                        </div>

                        {/* Title & Desc */}
                        <div className="p-2.5 bg-theme-surface flex-1">
                          <div className="font-semibold text-theme-primary text-xs flex items-center justify-between">
                            <span>{preset.name}</span>
                          </div>
                          {preset.desc && (
                            <p className="text-[10px] text-theme-muted line-clamp-1 mt-0.5">
                              {preset.desc}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Image Upload & URL */}
              <div className="space-y-3">
                <label className="font-semibold text-theme-primary">自定义壁纸来源</label>
                
                {/* Method 1: Local Upload */}
                <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-theme-primary">上传本地图片</div>
                    <div className="text-[11px] text-theme-muted">支持选择相册或电脑图片 (JPG, PNG, WebP) 作为私享背景</div>
                  </div>
                  <input
                    type="file"
                    ref={wallpaperImageInputRef}
                    onChange={handleLocalImageUpload}
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => wallpaperImageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary rounded-xl font-medium transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>选择本地文件</span>
                  </button>
                </div>

                {/* Method 2: Custom URL */}
                <form
                  onSubmit={handleApplyWallpaperUrl}
                  className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-2.5"
                >
                  <div className="font-semibold text-theme-primary">网络图片链接 (URL)</div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={wallpaperUrlInput}
                      onChange={(e) => setWallpaperUrlInput(e.target.value)}
                      placeholder="粘贴高清图片直链 (例如: https://example.com/wallpaper.jpg)"
                      className="flex-1 px-3 py-2 rounded-xl bg-theme-surface border border-theme-default focus:border-blue-500 text-theme-primary placeholder-theme-muted text-xs focus:outline-none shadow-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors cursor-pointer shadow-xs shrink-0"
                    >
                      应用此直链
                    </button>
                  </div>
                </form>
              </div>

              {/* Visual Adjustments */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default space-y-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-theme-primary">视觉效果与对比度微调</span>
                </div>

                {/* Mask Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-theme-primary font-medium">背景遮罩暗度 (对比度保护)</label>
                    <span className="font-mono text-blue-500 font-semibold">{settings.wallpaperMaskOpacity ?? 35}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    step="5"
                    value={settings.wallpaperMaskOpacity ?? 35}
                    onChange={(e) => onUpdateSettings({ ...settings, wallpaperMaskOpacity: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="text-[11px] text-theme-muted">
                    适度提高遮罩暗度可使背景图变暗，确保搜索框、图标与各类字体清晰易读
                  </div>
                </div>

                {/* Blur Slider */}
                <div className="space-y-1.5 pt-2 border-t border-theme-subtle">
                  <div className="flex items-center justify-between">
                    <label className="text-theme-primary font-medium">背景毛玻璃虚化 (高斯模糊)</label>
                    <span className="font-mono text-blue-500 font-semibold">{settings.wallpaperBlur ?? 0} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={settings.wallpaperBlur ?? 0}
                    onChange={(e) => onUpdateSettings({ ...settings, wallpaperBlur: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="text-[11px] text-theme-muted">
                    产生如 macOS / iOS 般的毛玻璃景深感，突出前景网址导航卡片
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Analytics & Usage Statistics */}
          {activeTab === 'analytics' && (
            <AnalyticsView
              faviconProvider={settings.faviconProvider}
              links={links}
              onOpenLink={(url) => {
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            />
          )}

          {/* TAB 4: Search Engines */}
          {activeTab === 'search' && (
            <div className="space-y-5">
              {/* Default Engine */}
              <div className="space-y-2">
                <label className="font-semibold text-theme-primary">默认搜索引擎</label>
                <select
                  value={settings.defaultEngineId}
                  onChange={(e) => onUpdateSettings({ ...settings, defaultEngineId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-theme-base border border-theme-default focus:border-blue-500 text-theme-primary text-xs focus:outline-none shadow-xs"
                >
                  {engines.map((e) => (
                    <option key={e.id} value={e.id} className="bg-theme-surface text-theme-primary">
                      {e.name} ({e.url.substring(0, 35)}...)
                    </option>
                  ))}
                </select>
              </div>

              {/* Existing Engines */}
              <div className="space-y-2">
                <label className="font-semibold text-theme-primary">现有引擎列表 ({engines.length})</label>
                <div className="space-y-1.5">
                  {engines.map((eng) => (
                    <div
                      key={eng.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-theme-base border border-theme-default"
                    >
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-theme-primary">{eng.name}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-theme-surface border border-theme-subtle font-mono text-[10px] text-theme-muted">
                            {eng.shortcut}
                          </span>
                          {eng.id === settings.defaultEngineId && (
                            <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md font-medium">
                              默认
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-theme-muted font-mono truncate mt-0.5">
                          {eng.url}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={engines.length <= 1}
                        onClick={() => handleDeleteEngine(eng.id)}
                        className="p-1.5 text-theme-muted hover:text-red-500 disabled:opacity-20 transition-colors cursor-pointer"
                        title="删除该引擎"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Engine */}
              <form onSubmit={handleAddEngine} className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-3">
                <div className="font-semibold text-theme-primary">添加自定义引擎</div>
                {engineError && (
                  <div className="text-red-500 text-[11px] bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                    {engineError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={engineName}
                    onChange={(e) => setEngineName(e.target.value)}
                    placeholder="引擎名称 (如: 夸克搜索)"
                    className="px-3 py-2 rounded-xl bg-theme-surface border border-theme-default focus:border-blue-500 text-theme-primary placeholder-theme-muted text-xs focus:outline-none shadow-xs"
                  />
                  <input
                    type="text"
                    value={engineShortcut}
                    onChange={(e) => setEngineShortcut(e.target.value)}
                    placeholder="快捷键 (如: K)"
                    maxLength={2}
                    className="px-3 py-2 rounded-xl bg-theme-surface border border-theme-default focus:border-blue-500 text-theme-primary placeholder-theme-muted text-xs focus:outline-none font-mono shadow-xs"
                  />
                </div>
                <input
                  type="text"
                  value={engineUrl}
                  onChange={(e) => setEngineUrl(e.target.value)}
                  placeholder="搜索 URL (必须含 %s，如: https://quark.sm.cn/s?q=%s)"
                  className="w-full px-3 py-2 rounded-xl bg-theme-surface border border-theme-default focus:border-blue-500 text-theme-primary placeholder-theme-muted text-xs focus:outline-none font-mono shadow-xs"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors cursor-pointer shadow-xs"
                >
                  添加引擎
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: Data Management */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              {importStatus && (
                <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 text-xs">
                  {importStatus}
                </div>
              )}

              {/* Statistics Card */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-theme-base border border-theme-default text-center">
                <div>
                  <div className="text-[11px] text-theme-muted">分类总数</div>
                  <div className="text-lg font-bold font-mono text-theme-primary">{categories.length}</div>
                </div>
                <div>
                  <div className="text-[11px] text-theme-muted">书签网址</div>
                  <div className="text-lg font-bold font-mono text-theme-primary">{links.length}</div>
                </div>
                <div>
                  <div className="text-[11px] text-theme-muted">常用置顶</div>
                  <div className="text-lg font-bold font-mono text-amber-500">
                    {links.filter((l) => l.pinned).length}
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex items-center justify-between">
                <div>
                  <div className="font-semibold text-theme-primary">导出数据备份</div>
                  <div className="text-[11px] text-theme-muted">将全部自定义书签、分类和偏好设置保存为 JSON 文件</div>
                </div>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出备份</span>
                </button>
              </div>

              {/* Import Button */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex items-center justify-between">
                <div>
                  <div className="font-semibold text-theme-primary">导入数据备份</div>
                  <div className="text-[11px] text-theme-muted">从本地 JSON 文件中恢复先前的导航数据</div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary rounded-xl font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>选择文件导入</span>
                </button>
              </div>

              {/* Clear Analytics Database (IndexedDB) */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-theme-primary">清空访问与搜索统计</div>
                    <div className="text-[11px] text-theme-muted">彻底抹除浏览器本地 IndexedDB 存储的历史点击、时段偏好与搜索记录</div>
                  </div>
                  {!confirmClearStats ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClearStats(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-theme-surface hover:bg-red-500/10 hover:text-red-500 border border-theme-default hover:border-red-500/30 text-theme-primary rounded-xl font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清空统计记录</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          await clearAllAnalytics();
                          setConfirmClearStats(false);
                          setStatsClearMessage('统计数据已全部清空！');
                          setTimeout(() => setStatsClearMessage(null), 3000);
                        }}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        确认清空
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearStats(false)}
                        className="px-3 py-1.5 bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
                {statsClearMessage && (
                  <div className="text-[11px] text-emerald-500 font-medium bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                    {statsClearMessage}
                  </div>
                )}
              </div>

              {/* Reset to Defaults */}
              <div className="p-4 rounded-2xl bg-theme-base border border-theme-default flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-amber-600 dark:text-amber-300">恢复出厂预设网址</div>
                  <div className="text-[11px] text-theme-muted">重置为精选的常用开发、AI、设计及影音分类，当前自定义数据将被预设覆盖</div>
                </div>
                {!confirmResetDefaults ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetDefaults(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded-xl font-medium transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>恢复预设</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onResetToDefaults();
                        setConfirmResetDefaults(false);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      确认覆盖重置
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetDefaults(false)}
                      className="px-3 py-1.5 bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-theme-subtle shrink-0 flex justify-end bg-theme-surface">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            保存并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
