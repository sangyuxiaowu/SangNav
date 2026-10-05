import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  Clock, 
  Search, 
  Globe, 
  RotateCcw, 
  Trash2, 
  ExternalLink,
  Flame,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Compass
} from 'lucide-react';
import { 
  getAnalyticsDashboardData, 
  clearAllAnalytics, 
  LinkClickStat, 
  HourlyStat, 
  SearchQueryStat, 
  EngineStat 
} from '../services/analyticsDb';
import { getFaviconUrl, getInitialColor, formatUrl } from '../utils/urlUtils';
import { CachedFavicon } from './CachedFavicon';
import type { FaviconProvider, NavLinkItem } from '../types/navigation';

interface AnalyticsViewProps {
  onOpenLink?: (url: string) => void;
  faviconProvider?: FaviconProvider;
  links?: NavLinkItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenLink, faviconProvider, links = [] }) => {
  const [timeRange, setTimeRange] = useState<'all' | '7days' | 'today'>('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalVisits: number;
    totalSearches: number;
    topLinks: LinkClickStat[];
    hourlyStats: HourlyStat[];
    peakHour: { hour: number; count: number; label: string };
    topQueries: SearchQueryStat[];
    engineStats: EngineStat[];
    recentSearches: any[];
  } | null>(null);

  const [activeHoverHour, setActiveHoverHour] = useState<HourlyStat | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalyticsDashboardData(timeRange);
      setData(res);
    } catch (e) {
      console.warn('Load analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExecuteClear = async () => {
    setLoading(true);
    try {
      await clearAllAnalytics();
      setData({
        totalVisits: 0,
        totalSearches: 0,
        topLinks: [],
        hourlyStats: new Array(24).fill(0).map((_, h) => ({
          hour: h,
          label: `${h.toString().padStart(2, '0')}:00`,
          count: 0,
          percentage: 0,
        })),
        peakHour: { hour: 0, count: 0, label: '--' },
        topQueries: [],
        engineStats: [],
        recentSearches: [],
      });
      setShowConfirmClear(false);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (e) {
      console.error('Clear failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const getPeakPeriodDescription = (hour: number) => {
    if (hour >= 5 && hour < 9) return '清晨时段 (05:00-09:00)';
    if (hour >= 9 && hour < 12) return '上午高效期 (09:00-12:00)';
    if (hour >= 12 && hour < 14) return '午间休息 (12:00-14:00)';
    if (hour >= 14 && hour < 18) return '下午活跃期 (14:00-18:00)';
    if (hour >= 18 && hour < 22) return '晚间黄金期 (18:00-22:00)';
    return '深夜潜水期 (22:00-05:00)';
  };

  return (
    <div className="space-y-6 text-theme-primary">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-theme-subtle">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-theme-primary">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span>本地使用与访问偏好统计</span>
            </h4>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>IndexedDB 本地加密存储</span>
            </span>
          </div>
          <p className="text-[11px] text-theme-muted">
            数据仅保存在您的浏览器本地，不收集个人隐私，提供常用网站频次与使用规律分析
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center bg-theme-base border border-theme-default p-0.5 rounded-xl">
            {(
              [
                { id: 'all', label: '全部历史' },
                { id: '7days', label: '近 7 天' },
                { id: 'today', label: '今日' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeRange(tab.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={loadData}
            title="刷新数据"
            className="p-1.5 text-theme-muted hover:text-theme-primary bg-theme-base hover:bg-theme-surface border border-theme-default rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmClear(true)}
            title="清空统计数据"
            className="p-1.5 text-theme-muted hover:text-red-500 bg-theme-base hover:bg-red-500/10 border border-theme-default hover:border-red-500/30 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Confirmation Banner for Clear Action (In-UI, no window.confirm) */}
      {showConfirmClear && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
          <div className="text-xs text-red-500 font-medium flex items-center gap-1.5">
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>确定要清空本地 IndexedDB 中的所有访问与搜索统计吗？此操作无法撤销。</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExecuteClear}
              disabled={loading}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {loading ? '正在清空...' : '确定清空'}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmClear(false)}
              className="px-3 py-1 bg-theme-surface hover:bg-theme-surface-hover border border-theme-default text-theme-primary rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Clear Success Message */}
      {clearSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>本地统计数据已彻底清空，已恢复为初始零计数状态！</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-1">
          <div className="text-[11px] text-theme-muted flex items-center justify-between">
            <span>总访问站点</span>
            <Globe className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono text-theme-primary">
            {data?.totalVisits ?? 0}
            <span className="text-xs font-normal text-theme-muted ml-1">次</span>
          </div>
          <div className="text-[10px] text-theme-muted truncate">
            {data?.topLinks.length ? `已记录 ${data.topLinks.length} 个独立站点` : '等待访问记录'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-1">
          <div className="text-[11px] text-theme-muted flex items-center justify-between">
            <span>最爱站点</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-theme-primary truncate">
            {data?.topLinks[0]?.title || '暂无'}
          </div>
          <div className="text-[10px] text-theme-muted truncate">
            {data?.topLinks[0] ? `访问 ${data.topLinks[0].count} 次 (${data.topLinks[0].percentage}%)` : '点击书签开始统计'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-1">
          <div className="text-[11px] text-theme-muted flex items-center justify-between">
            <span>全网搜索</span>
            <Search className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono text-theme-primary">
            {data?.totalSearches ?? 0}
            <span className="text-xs font-normal text-theme-muted ml-1">次</span>
          </div>
          <div className="text-[10px] text-theme-muted truncate">
            {data?.topQueries.length ? `累计 ${data.topQueries.length} 个不同词汇` : '在主页键入搜索'}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-theme-base border border-theme-default space-y-1">
          <div className="text-[11px] text-theme-muted flex items-center justify-between">
            <span>活跃时段</span>
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-theme-primary truncate">
            {data?.peakHour?.label ? `${data.peakHour.hour}:00` : '--'}
          </div>
          <div className="text-[10px] text-theme-muted truncate">
            {data?.peakHour ? getPeakPeriodDescription(data.peakHour.hour) : '等待时段记录'}
          </div>
        </div>
      </div>

      {/* SECTION 1: 各网址点击次数柱状统计 (Bar Chart of Website Clicks) */}
      <div className="p-4.5 rounded-2xl bg-theme-base border border-theme-default space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h5 className="font-semibold text-xs text-theme-primary flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
              <span>常用站点与点击频次柱状统计</span>
            </h5>
            <p className="text-[10px] text-theme-muted">
              按打开频次降序排列，清晰洞察各高频网址的使用权重与点击占比
            </p>
          </div>
          <span className="text-[11px] font-mono text-theme-muted">
            TOP {data?.topLinks.length || 0}
          </span>
        </div>

        {/* Bar Chart Rows */}
        {(!data || data.topLinks.length === 0) ? (
          <div className="py-8 text-center text-xs text-theme-muted space-y-2">
            <Compass className="w-8 h-8 mx-auto text-theme-muted opacity-40 animate-pulse" />
            <p>暂无网址访问数据，在主页点击任意书签或导航卡片即可在此生成统计柱状图</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.topLinks.map((item, index) => {
              const link = links.find((link) => link.id === item.linkId);
              const favicon = getFaviconUrl(link?.url || item.url, link?.icon, faviconProvider);
              const initial = item.title.charAt(0).toUpperCase();
              const initialColor = getInitialColor(item.title);
              // Max percentage for relative bar scaling
              const maxCount = data.topLinks[0]?.count || 1;
              const relativeBarWidth = Math.max(Math.round((item.count / maxCount) * 100), 4);

              return (
                <div 
                  key={item.linkId || index}
                  className="group flex flex-col p-2 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-subtle transition-all duration-150"
                >
                  <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                    {/* Rank & Site Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                        index === 0
                          ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                          : index === 1
                          ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          : index === 2
                          ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30'
                          : 'bg-theme-base text-theme-muted'
                      }`}>
                        {index + 1}
                      </span>

                      {/* Icon */}
                      <div className="w-5 h-5 rounded-md overflow-hidden bg-theme-base flex items-center justify-center shrink-0">
                        <CachedFavicon
                          src={favicon}
                          className="w-3.5 h-3.5 object-contain"
                          fallback={<span className={`${initialColor.text} ${initialColor.bg} w-full h-full text-[9px] font-bold flex items-center justify-center`}>{initial}</span>}
                        />
                      </div>

                      {/* Title & Domain */}
                      <div className="truncate flex items-baseline gap-1.5">
                        <span className="font-semibold text-theme-primary truncate">{item.title}</span>
                        <span className="text-[10px] text-theme-muted font-mono truncate hidden sm:inline">{item.domain}</span>
                      </div>
                    </div>

                    {/* Count & Percentage */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold text-theme-primary">
                        {item.count} <span className="text-[10px] font-normal text-theme-muted">次</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-medium min-w-[38px] text-right">
                        {item.percentage}%
                      </span>
                      {onOpenLink && (
                        <a
                          href={formatUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-blue-500 transition-opacity p-0.5"
                          title="访问此网址"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar Graphic */}
                  <div className="w-full h-2 rounded-full bg-theme-base overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? 'bg-gradient-to-r from-amber-500 to-blue-600'
                          : index < 3
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                          : 'bg-blue-600/70'
                      }`}
                      style={{ width: `${relativeBarWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: 访问时间偏好 (24-Hour Hourly Histogram Bar Chart) */}
      <div className="p-4.5 rounded-2xl bg-theme-base border border-theme-default space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="space-y-0.5">
            <h5 className="font-semibold text-xs text-theme-primary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>24小时访问时间段偏好分布 (柱状图)</span>
            </h5>
            <p className="text-[10px] text-theme-muted">
              统计您在一整天中各时段的活跃频次，精准描绘上网时间习惯
            </p>
          </div>
          {data?.peakHour && data.peakHour.count > 0 && (
            <div className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-medium flex items-center gap-1 self-start sm:self-auto">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>峰值：{data.peakHour.label} ({data.peakHour.count}次)</span>
            </div>
          )}
        </div>

        {/* 24-Hour Vertical Bar Chart Graphic */}
        <div className="pt-4 pb-1">
          <div className="h-32 flex items-end justify-between gap-1 sm:gap-1.5 px-1 border-b border-theme-subtle">
            {data?.hourlyStats.map((hStat) => {
              const isPeak = data.peakHour.count > 0 && hStat.hour === data.peakHour.hour;
              const barHeight = Math.max(hStat.percentage, hStat.count > 0 ? 8 : 2);

              return (
                <div
                  key={hStat.hour}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setActiveHoverHour(hStat)}
                  onMouseLeave={() => setActiveHoverHour(null)}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 px-1.5 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md z-20">
                    {hStat.label}: {hStat.count}次
                  </div>

                  {/* Vertical Bar */}
                  <div
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      isPeak
                        ? 'bg-blue-600 ring-2 ring-blue-500/30'
                        : hStat.count > 0
                        ? 'bg-blue-500/50 hover:bg-blue-500'
                        : 'bg-theme-subtle/50'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Hour labels (showing every 3-4 hours) */}
          <div className="flex justify-between text-[10px] text-theme-muted font-mono pt-1.5 px-1">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Hover details feedback or analysis note */}
        <div className="p-3 rounded-xl bg-theme-surface border border-theme-subtle text-[11px] flex items-center justify-between">
          <span className="text-theme-muted">
            {activeHoverHour ? (
              <span>
                时段 <strong className="text-theme-primary">{activeHoverHour.label}</strong>：访问共计{' '}
                <strong className="text-blue-500 font-mono">{activeHoverHour.count}</strong> 次
              </span>
            ) : data?.peakHour && data.peakHour.count > 0 ? (
              <span>
                习惯偏好洞察：您在 <strong className="text-theme-primary">{getPeakPeriodDescription(data.peakHour.hour)}</strong> 的活动最为密集。
              </span>
            ) : (
              <span>收集日常点击后，将在此自动勾勒您的上下班及休息上网作息画像。</span>
            )}
          </span>
          <span className="text-[10px] text-theme-muted font-mono hidden sm:inline">24H 周期统计</span>
        </div>
      </div>

      {/* SECTION 3: 搜索内容与引擎偏好统计 (Search Keywords & Engine Usage) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Keywords */}
        <div className="p-4.5 rounded-2xl bg-theme-base border border-theme-default space-y-3.5">
          <div className="space-y-0.5">
            <h5 className="font-semibold text-xs text-theme-primary flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-purple-500" />
              <span>搜索内容关键词统计 (Top 词频)</span>
            </h5>
            <p className="text-[10px] text-theme-muted">
              记录您经常搜索的主题与查询词汇
            </p>
          </div>

          {(!data || data.topQueries.length === 0) ? (
            <div className="py-6 text-center text-xs text-theme-muted">
              暂无搜索记录，在主页搜索框键入回车后即可自动记录
            </div>
          ) : (
            <div className="space-y-2">
              {data.topQueries.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-theme-surface border border-theme-subtle text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded-md bg-purple-500/10 text-purple-500 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-theme-primary truncate">{q.query}</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-theme-muted shrink-0 ml-2">
                    {q.count} <span className="text-[10px] font-normal">次</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engine Usage Breakdown */}
        <div className="p-4.5 rounded-2xl bg-theme-base border border-theme-default space-y-3.5">
          <div className="space-y-0.5">
            <h5 className="font-semibold text-xs text-theme-primary flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>搜索引擎使用偏好占比</span>
            </h5>
            <p className="text-[10px] text-theme-muted">
              分析必应、百度、Google、GitHub 等引擎的使用频次
            </p>
          </div>

          {(!data || data.engineStats.length === 0) ? (
            <div className="py-6 text-center text-xs text-theme-muted">
              暂无引擎偏好数据
            </div>
          ) : (
            <div className="space-y-3">
              {data.engineStats.map((eng, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-theme-primary">{eng.engineName}</span>
                    <span className="font-mono text-[11px] text-theme-muted">
                      {eng.count}次 ({eng.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-theme-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${eng.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Search Stream */}
          {data && data.recentSearches && data.recentSearches.length > 0 && (
            <div className="pt-2 border-t border-theme-subtle space-y-1.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                最近搜索流
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.recentSearches.slice(0, 6).map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme-surface border border-theme-subtle text-[10px] text-theme-primary"
                  >
                    <span className="text-theme-muted">[{item.engineName}]</span>
                    <span className="truncate max-w-[120px]">{item.query}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
