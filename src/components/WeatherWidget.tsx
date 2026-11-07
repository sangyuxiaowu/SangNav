import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  Sun, 
  CloudDrizzle,
  CloudRain, 
  CloudRainWind,
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Gauge, 
  RotateCw, 
  AlertTriangle, 
  MapPin, 
  X,
  Thermometer,
  CloudSun,
  CloudFog,
  Sunrise,
  Sunset,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar
} from 'lucide-react';
import { WeatherData } from '../types/navigation';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
  onRefresh: (force?: boolean) => Promise<boolean>;
  variant?: 'hero' | 'header';
}

export function getWeatherIcon(weatherDesc: string = '', className = 'w-5 h-5') {
  const desc = weatherDesc.toLowerCase();
  if (desc.includes('雷')) {
    return <CloudLightning className={`${className} text-amber-400`} />;
  }
  if (desc.includes('雪')) {
    return <CloudSnow className={`${className} text-cyan-200`} />;
  }
  if (desc.includes('暴雨') || desc.includes('大雨')) {
    return <CloudRainWind className={`${className} text-indigo-600 dark:text-indigo-300`} />;
  }
  if (desc.includes('中雨')) {
    return <CloudRain className={`${className} text-blue-500 dark:text-blue-400`} />;
  }
  if (desc.includes('小雨') || desc.includes('毛毛雨')) {
    return <CloudDrizzle className={`${className} text-sky-400 dark:text-sky-300`} />;
  }
  if (desc.includes('雨')) {
    return <CloudRain className={`${className} text-blue-500 dark:text-blue-400`} />;
  }
  if (desc.includes('雾') || desc.includes('霾') || desc.includes('沙') || desc.includes('尘')) {
    return <CloudFog className={`${className} text-slate-400`} />;
  }
  if (desc.includes('多云')) {
    return <CloudSun className={`${className} text-amber-500 dark:text-amber-300`} />;
  }
  if (desc.includes('阴')) {
    return <Cloud className={`${className} text-neutral-500 dark:text-neutral-400`} />;
  }
  if (desc.includes('风')) {
    return <Wind className={`${className} text-teal-500 dark:text-teal-400`} />;
  }
  return <Sun className={`${className} text-amber-500 dark:text-amber-400`} />;
}

function getAqiBadgeStyle(aqi?: number) {
  if (aqi === undefined) return 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-500/20';
  if (aqi <= 50) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (aqi <= 100) return 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30';
  if (aqi <= 150) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  if (aqi <= 200) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30';
  if (aqi <= 300) return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
  return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
}

function getAqiPill(text?: string, aqi?: number) {
  if (!text && aqi === undefined) return null;
  const label = text || (aqi !== undefined ? (aqi <= 50 ? '优' : aqi <= 100 ? '良' : '轻度') : '');
  if (!label) return null;
  let color = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (label.includes('良')) color = 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30';
  if (label.includes('轻') || label.includes('中度')) color = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
  if (label.includes('重') || label.includes('严重')) color = 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30';

  return (
    <span className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${color}`}>
      {label}
    </span>
  );
}

function getDayInfo(dateStr: string, idx: number, todayStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = Math.round((itemDateOnly.getTime() - todayDateOnly.getTime()) / (1000 * 60 * 60 * 24));

  let dayLabel = '';
  let isYesterday = false;
  let isCurrentDay = false;

  if (diffDays === -1 || (idx === 0 && (diffDays < 0 || dateStr < todayStr))) {
    dayLabel = '昨天';
    isYesterday = true;
  } else if (diffDays === 0 || dateStr === todayStr) {
    dayLabel = '今天';
    isCurrentDay = true;
  } else {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    dayLabel = weekdays[d.getDay()] || '周' + (d.getDay() || 7);
  }

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const monthDay = `${month}/${day}`;

  return { dayLabel, monthDay, isYesterday, isCurrentDay };
}

/**
 * Generate smooth cubic Bezier curve for SVG
 */
function createSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x + (p1.x - p3.x) / 6;
    const cp2y = p2.y + (p1.y - p3.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  onRefresh,
  variant = 'hero',
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentNoticeIdx, setCurrentNoticeIdx] = useState(0);
  const [forecastTab, setForecastTab] = useState<'hourly' | 'daily'>('hourly');

  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const handleManualRefresh = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (refreshing) return;
    setRefreshing(true);
    setRefreshSuccess(false);
    setRefreshFailed(false);
    const start = Date.now();
    try {
      const refreshed = await onRefresh(true);
      const elapsed = Date.now() - start;
      if (elapsed < 450) {
        await new Promise((resolve) => setTimeout(resolve, 450 - elapsed));
      }
      setRefreshSuccess(refreshed);
      setRefreshFailed(!refreshed);
      setTimeout(() => {
        setRefreshSuccess(false);
        setRefreshFailed(false);
      }, 2500);
    } catch (err) {
      console.error('Refresh weather failed:', err);
      setRefreshFailed(true);
      setTimeout(() => setRefreshFailed(false), 2500);
    } finally {
      setRefreshing(false);
    }
  };

  // Compile rotating notices for single-line ticker
  const notices: Array<{
    id: string;
    badge: string;
    badgeClass: string;
    icon: React.ReactNode;
    text: string;
    bgClass: string;
  }> = [];

  if (weather?.current.rainNotice) {
    notices.push({
      id: 'rain',
      badge: '短临雷达',
      badgeClass: 'bg-blue-600 text-white',
      icon: <CloudRain className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />,
      text: weather.current.rainNotice,
      bgClass: 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100',
    });
  }

  if (weather?.current.tips) {
    notices.push({
      id: 'tips',
      badge: '温馨提醒',
      badgeClass: 'bg-amber-600 dark:bg-amber-500 text-white',
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
      text: weather.current.tips,
      bgClass: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-950 dark:text-amber-100',
    });
  }

  // Auto-rotate notices every 4 seconds when multiple exist
  useEffect(() => {
    if (notices.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentNoticeIdx((prev) => (prev + 1) % notices.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [notices.length]);

  const locationLabel = weather 
    ? `${weather.location.city || weather.location.name || weather.location.province || '当前城市'}`
    : '正在获取天气...';

  const currentWeatherDesc = weather?.current.condition || weather?.forecast?.[0]?.dayWeather || '多云';
  const tempDisplay = weather ? `${Math.round(weather.current.temperature)}°` : '--°';

  // 1. 24-Hour Hourly Trend Curve Data
  const hourlyList = weather?.hourly || [];
  const hourlyColWidth = 66;
  const hourlyChartHeight = 84;
  const hourlyTemps = hourlyList.map((h) => Number(h.temp) || 0);
  const maxHourly = hourlyTemps.length > 0 ? Math.max(...hourlyTemps) : 25;
  const minHourly = hourlyTemps.length > 0 ? Math.min(...hourlyTemps) : 15;
  const hourlyRange = Math.max(maxHourly - minHourly, 4);

  const hourlyPoints = hourlyList.map((_, i) => {
    const x = i * hourlyColWidth + hourlyColWidth / 2;
    const y = 22 + ((maxHourly - hourlyTemps[i]) / hourlyRange) * 38;
    return { x, y };
  });
  const hourlyPath = createSmoothPath(hourlyPoints);

  // 2. 15-Day Daily Dual-Temperature Curve Data (comfortably spacious with 84px height)
  const forecastList = weather?.forecast || [];
  const dailyColWidth = 66;
  const dailyChartHeight = 84;
  const todayStr = new Date().toISOString().split('T')[0];

  const highTemps = forecastList.map((f) => Number(f.dayTemp) || 0);
  const lowTemps = forecastList.map((f) => Number(f.nightTemp) || 0);

  const maxHigh = highTemps.length > 0 ? Math.max(...highTemps) : 25;
  const minHigh = highTemps.length > 0 ? Math.min(...highTemps) : 15;
  const highRange = Math.max(maxHigh - minHigh, 4);

  const maxLow = lowTemps.length > 0 ? Math.max(...lowTemps) : 15;
  const minLow = lowTemps.length > 0 ? Math.min(...lowTemps) : 5;
  const lowRange = Math.max(maxLow - minLow, 4);

  const highPoints = forecastList.map((_, i) => {
    const x = i * dailyColWidth + dailyColWidth / 2;
    const y = 18 + ((maxHigh - highTemps[i]) / highRange) * 22;
    return { x, y };
  });

  const lowPoints = forecastList.map((_, i) => {
    const x = i * dailyColWidth + dailyColWidth / 2;
    const y = 52 + ((maxLow - lowTemps[i]) / lowRange) * 22;
    return { x, y };
  });

  const highPath = createSmoothPath(highPoints);
  const lowPath = createSmoothPath(lowPoints);

  return (
    <>
      {/* Trigger Button */}
      {variant === 'header' ? (
        <button
          onClick={() => setModalOpen(true)}
          title="点击查看中国气象局15日天气预报、逐小时预报及生活指数"
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-600 transition-all text-neutral-200 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-neutral-500 cursor-pointer"
        >
          {loading ? (
            <RotateCw className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
          ) : (
            getWeatherIcon(currentWeatherDesc, 'w-3.5 h-3.5')
          )}
          <span className="font-medium text-neutral-300">{locationLabel}</span>
          <span className="font-mono tabular-nums text-neutral-100 font-semibold">{tempDisplay}</span>
          {weather?.current.aqi !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium border ${getAqiBadgeStyle(weather.current.aqi)}`}>
              {weather.current.aqiText || '优'} {weather.current.aqi}
            </span>
          )}
          {weather?.alarms && weather.alarms.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" />
              降水
            </span>
          )}
        </button>
      ) : (
        /* Hero Variant */
        <div className="inline-flex flex-col items-center gap-2 max-w-full">
          {/* Main Weather Capsule (Compact, symmetrical, unbloated) */}
          <div 
            data-weather-capsule
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default shadow-theme-sm cursor-pointer backdrop-blur-md transition-all text-theme-secondary text-xs group"
            title="中国气象局官方天气 · 点击查看详情"
          >
            <div className="p-2 rounded-xl bg-theme-tag group-hover:scale-105 transition-transform shrink-0 relative">
              {loading ? (
                <RotateCw className="w-4 h-4 text-theme-muted animate-spin" />
              ) : (
                getWeatherIcon(currentWeatherDesc, 'w-4 h-4')
              )}
              {weather?.current.rainNotice && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-theme-primary">{locationLabel}</span>
                <span className="font-mono text-theme-primary font-bold">{tempDisplay}</span>
                <span className="text-theme-secondary font-medium">{currentWeatherDesc}</span>
                {weather?.current.aqi !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium border ${getAqiBadgeStyle(weather.current.aqi)}`}>
                    {weather.current.aqiText || '优'} {weather.current.aqi}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-theme-muted mt-0.5">
                <span>体感 {weather ? Math.round(weather.current.feelsLike) : '--'}°</span>
                <span>·</span>
                <span>{weather?.current.windDirection || '微风'} {weather?.current.windScale || ''}</span>
                <span>·</span>
                <span>湿度 {weather?.current.humidity ?? '--'}%</span>
              </div>
            </div>
          </div>

          {/* Dedicated Subordinate Radar Rain Notice Chip (shown only when rain is forecast) */}
          {weather?.current.rainNotice && (
            <div 
              data-weather-alert
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-[11px] font-medium transition-all cursor-pointer shadow-2xs group animate-in fade-in slide-in-from-top-1 duration-200"
              title="中国气象局短临雷达预报 · 点击查看详情"
            >
              <CloudRain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{weather.current.rainNotice}</span>
              <ChevronRight className="w-3 h-3 text-blue-400 opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      )}

      {/* Weather Detail Modal */}
      {modalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto sleek-scrollbar bg-theme-surface border border-theme-default rounded-3xl p-4 sm:p-5 shadow-theme-lg space-y-3.5 animate-in fade-in zoom-in-95 duration-150 text-theme-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-theme-subtle pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-theme-primary flex items-center gap-1.5">
                    {weather?.location.province ? `${weather.location.province} · ` : ''}
                    {weather?.location.city || '天气实况'}
                    {weather?.location.name && weather.location.name !== weather.location.city && (
                      <span className="text-xs text-theme-muted font-normal">({weather.location.name})</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-theme-muted">
                    <span className="text-blue-500 dark:text-blue-400 font-medium">中国气象局 CMA</span>
                    <span>·</span>
                    <span>更新于 {weather?.current.updateTime || '刚刚'}</span>
                    {refreshSuccess && (
                      <span className="text-emerald-500 font-semibold text-[10px] ml-0.5 animate-pulse">
                        (已更新)
                      </span>
                    )}
                    {refreshFailed && (
                      <span className="text-rose-500 font-semibold text-[10px] ml-0.5">
                        (刷新失败，显示已有数据)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                    refreshSuccess
                      ? 'text-emerald-500 bg-emerald-500/15'
                      : refreshFailed
                        ? 'text-rose-500 bg-rose-500/15'
                      : 'text-theme-muted hover:text-theme-primary hover:bg-theme-surface-hover'
                  }`}
                  title={refreshSuccess ? '气象数据已刷新' : refreshFailed ? '刷新失败，当前显示已有数据' : '刷新气象数据'}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-surface-hover transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rotating Single-Line Notice Ticker */}
            {notices.length > 0 && (
              <div 
                onClick={() => notices.length > 1 && setCurrentNoticeIdx((prev) => (prev + 1) % notices.length)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs transition-all duration-300 cursor-pointer shadow-2xs select-none ${
                  notices[currentNoticeIdx % notices.length].bgClass
                }`}
                title={notices.length > 1 ? '点击立即切换下一条气象提示' : undefined}
              >
                {notices[currentNoticeIdx % notices.length].icon}
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${notices[currentNoticeIdx % notices.length].badgeClass}`}>
                  {notices[currentNoticeIdx % notices.length].badge}
                </span>
                <span className="text-xs font-semibold flex-1 truncate">
                  {notices[currentNoticeIdx % notices.length].text}
                </span>
                {notices.length > 1 && (
                  <span className="text-[10px] opacity-60 font-mono font-medium shrink-0 ml-1">
                    {(currentNoticeIdx % notices.length) + 1}/{notices.length}
                  </span>
                )}
              </div>
            )}

            {/* Current Weather Dashboard (Dividing line removed as requested) */}
            {weather && (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-theme-base border border-theme-default">
                {/* Left Column: Big Temperature & Status */}
                <div className="sm:col-span-5 flex sm:flex-col justify-between sm:justify-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-theme-surface border border-theme-default shadow-xs shrink-0">
                      {getWeatherIcon(currentWeatherDesc, 'w-8 h-8')}
                    </div>
                    <div>
                      <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-theme-primary leading-none">
                        {Math.round(weather.current.temperature)}°C
                      </div>
                      <div className="text-xs text-theme-secondary mt-1 flex items-center gap-1.5">
                        <span className="font-medium text-theme-primary">{currentWeatherDesc}</span>
                        <span>·</span>
                        <span>体感 {Math.round(weather.current.feelsLike)}°C</span>
                      </div>
                    </div>
                  </div>

                  {weather.current.aqi !== undefined && (
                    <div className="self-center sm:self-start">
                      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium border ${getAqiBadgeStyle(weather.current.aqi)}`}>
                        空气质量: {weather.current.aqiText} ({weather.current.aqi})
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Column: 6-Item Metrics Grid */}
                <div className="sm:col-span-7 grid grid-cols-3 gap-1.5 text-xs">
                  <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-theme-muted">
                      <Droplets className="w-3 h-3 text-blue-500" />
                      <span>湿度</span>
                    </div>
                    <div className="font-mono text-theme-primary font-semibold text-xs mt-0.5">
                      {weather.current.humidity}%
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-theme-muted">
                      <Wind className="w-3 h-3 text-teal-500" />
                      <span>风况</span>
                    </div>
                    <div className="font-medium text-theme-primary truncate text-[11px] mt-0.5" title={`${weather.current.windDirection} ${weather.current.windScale}`}>
                      {weather.current.windDirection} {weather.current.windScale}
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-theme-muted">
                      <Gauge className="w-3 h-3 text-purple-500" />
                      <span>气压</span>
                    </div>
                    <div className="font-mono text-theme-primary font-semibold text-[11px] mt-0.5">
                      {weather.current.pressure} <span className="text-[9px] font-normal text-theme-muted">hPa</span>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-theme-muted">
                      <Thermometer className="w-3 h-3 text-rose-500" />
                      <span>降水量</span>
                    </div>
                    <div className="font-mono text-theme-primary font-semibold text-xs mt-0.5">
                      {weather.current.precipitation} <span className="text-[9px] font-normal text-theme-muted">mm</span>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-theme-muted">
                      <Sunrise className="w-3 h-3 text-amber-500" />
                      <span>日出</span>
                    </div>
                    <div className="font-mono text-theme-primary font-medium text-xs mt-0.5">
                      {weather.current.sunrise || '--:--'}
                    </div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-theme-surface border border-theme-subtle text-center">
                    <div className="flex items-center justify-center gap-1 text-[10px] text-theme-muted">
                      <Sunset className="w-3 h-3 text-indigo-500" />
                      <span>日落</span>
                    </div>
                    <div className="font-mono text-theme-primary font-medium text-xs mt-0.5">
                      {weather.current.sunset || '--:--'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Forecast Tabs Switcher: 24-Hour Hourly Trend vs 15-Day Weather Forecast */}
            {(hourlyList.length > 0 || forecastList.length > 0) && (
              <div className="space-y-2">
                {/* Switcher Header */}
                <div className="flex items-center justify-between">
                  {/* Segmented Control Pill */}
                  <div className="inline-flex items-center p-1 rounded-xl bg-theme-base border border-theme-subtle gap-1">
                    <button
                      type="button"
                      onClick={() => setForecastTab('hourly')}
                      className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        forecastTab === 'hourly'
                          ? 'bg-theme-surface text-theme-primary font-semibold shadow-xs'
                          : 'text-theme-muted hover:text-theme-primary font-medium'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>24小时逐时</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForecastTab('daily')}
                      className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                        forecastTab === 'daily'
                          ? 'bg-theme-surface text-theme-primary font-semibold shadow-xs'
                          : 'text-theme-muted hover:text-theme-primary font-medium'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>15日天气预报</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-theme-muted/70 font-mono hidden sm:inline">
                    {forecastTab === 'hourly'
                      ? '左右滑动浏览24小时气温走势'
                      : '含昨日对比 · 左右滑动查看趋势'}
                  </span>
                </div>

                {/* Tab 1: 24-Hour Hourly Trend Curve with Horizontal Sleek Scrollbar */}
                {forecastTab === 'hourly' && hourlyList.length > 0 && (
                  <div className="overflow-x-auto sleek-scrollbar px-2.5 pt-2.5 pb-2 rounded-2xl bg-theme-base border border-theme-default select-none animate-in fade-in duration-150">
                    <div 
                      className="flex flex-col relative select-none"
                      style={{ width: `${hourlyList.length * hourlyColWidth}px` }}
                    >
                      {/* Top: Hour, Icon & Condition */}
                      <div className="flex items-center">
                        {hourlyList.map((h, i) => (
                          <div 
                            key={i} 
                            style={{ width: `${hourlyColWidth}px` }} 
                            className="flex flex-col items-center text-center shrink-0"
                          >
                            <span className="text-[11px] font-mono font-medium text-theme-primary leading-tight">
                              {h.hour}
                            </span>
                            <div className="my-1.5 flex items-center justify-center">
                              {getWeatherIcon(h.condition, 'w-4 h-4')}
                            </div>
                            <span className="text-[10px] font-medium text-theme-secondary truncate w-full px-1 leading-tight">
                              {h.condition}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Middle: Connected Temperature Curve SVG */}
                      <div className="relative my-1" style={{ height: `${hourlyChartHeight}px` }}>
                        <svg 
                          width={hourlyList.length * hourlyColWidth} 
                          height={hourlyChartHeight}
                          className="overflow-visible"
                        >
                          {/* Smooth connecting curve */}
                          <path 
                            d={hourlyPath} 
                            fill="none" 
                            stroke="#38bdf8" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Data points and temperature labels */}
                          {hourlyList.map((_, i) => {
                            const hp = hourlyPoints[i];
                            return (
                              <g key={i}>
                                <circle 
                                  cx={hp.x} 
                                  cy={hp.y} 
                                  r="2.5" 
                                  fill="#38bdf8" 
                                  stroke="var(--bg-base, #171717)" 
                                  strokeWidth="1.5" 
                                />
                                <text 
                                  x={hp.x} 
                                  y={hp.y - 6} 
                                  textAnchor="middle" 
                                  fontSize="10.5" 
                                  fontWeight="700" 
                                  fill="currentColor"
                                  className="fill-theme-primary font-mono select-none"
                                >
                                  {hourlyTemps[i]}°
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Bottom: Precipitation POP & Wind */}
                      <div className="flex items-center">
                        {hourlyList.map((h, i) => (
                          <div 
                            key={i} 
                            style={{ width: `${hourlyColWidth}px` }} 
                            className="flex flex-col items-center text-center shrink-0 space-y-0.5"
                          >
                            <div className="h-4 flex items-center justify-center">
                              {h.pop && h.pop !== '0%' ? (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-medium">
                                  🌧{h.pop}
                                </span>
                              ) : (
                                <span className="text-[9px] text-theme-muted/40">--</span>
                              )}
                            </div>
                            <span 
                              className="text-[9px] text-theme-muted w-full px-1 leading-tight min-h-[2.4em] whitespace-pre-line break-words flex items-center justify-center"
                              title={h.windDir || '微风'}
                            >
                              {(h.windDir || '微风').replace(/\s*(\d+(?:-\d+)?级)$/, '\n$1')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: 15-Day Weather Forecast with Dual-Temperature Curve & Sleek Scrollbar */}
                {forecastTab === 'daily' && forecastList.length > 0 && (
                  <div className="overflow-x-auto sleek-scrollbar px-2.5 pt-2.5 pb-2 rounded-2xl bg-theme-base border border-theme-default select-none animate-in fade-in duration-150">
                    <div 
                      className="flex flex-col relative select-none"
                      style={{ width: `${forecastList.length * dailyColWidth}px` }}
                    >
                      {/* Top Section: Day label, Date, Daytime Icon & Condition */}
                      <div className="flex items-center">
                        {forecastList.map((fc, i) => {
                          const { dayLabel, monthDay, isYesterday, isCurrentDay } = getDayInfo(fc.date, i, todayStr);
                          return (
                            <div 
                              key={i} 
                              style={{ width: `${dailyColWidth}px` }} 
                              className={`flex flex-col items-center text-center shrink-0 ${
                                isYesterday ? 'opacity-40 grayscale-[50%]' : ''
                              }`}
                            >
                              <span className={`text-[11px] leading-tight ${
                                isCurrentDay 
                                  ? 'font-bold text-blue-600 dark:text-blue-400' 
                                  : 'font-medium text-theme-primary'
                              }`}>
                                {dayLabel}
                              </span>
                              <span className="text-[10px] text-theme-muted font-mono leading-tight mt-0.5">
                                {monthDay}
                              </span>
                              <div className="my-1.5 flex items-center justify-center">
                                {getWeatherIcon(fc.dayWeather, 'w-4 h-4')}
                              </div>
                              <span className="text-[10px] font-medium text-theme-primary truncate w-full px-1 leading-tight">
                                {fc.dayWeather}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Middle Section: Connected Dual Temperature Curves SVG */}
                      <div className="relative my-1" style={{ height: `${dailyChartHeight}px` }}>
                        <svg 
                          width={forecastList.length * dailyColWidth} 
                          height={dailyChartHeight}
                          className="overflow-visible"
                        >
                          {/* High temperature connecting curve */}
                          <path 
                            d={highPath} 
                            fill="none" 
                            stroke="#f59e0b" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Low temperature connecting curve */}
                          <path 
                            d={lowPath} 
                            fill="none" 
                            stroke="#38bdf8" 
                            strokeWidth="2.5" 
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Point dots and temperature labels */}
                          {forecastList.map((_, i) => {
                            const hp = highPoints[i];
                            const lp = lowPoints[i];
                            const isYesterday = i === 0 && forecastList[i].date < todayStr;
                            return (
                              <g key={i} className={isYesterday ? 'opacity-40' : ''}>
                                {/* High point */}
                                <circle 
                                  cx={hp.x} 
                                  cy={hp.y} 
                                  r="2.5" 
                                  fill="#f59e0b" 
                                  stroke="var(--bg-base, #171717)" 
                                  strokeWidth="1.5" 
                                />
                                <text 
                                  x={hp.x} 
                                  y={hp.y - 5} 
                                  textAnchor="middle" 
                                  fontSize="10" 
                                  fontWeight="700" 
                                  fill="currentColor"
                                  className="fill-theme-primary font-mono select-none"
                                >
                                  {highTemps[i]}°
                                </text>

                                {/* Low point */}
                                <circle 
                                  cx={lp.x} 
                                  cy={lp.y} 
                                  r="2.5" 
                                  fill="#38bdf8" 
                                  stroke="var(--bg-base, #171717)" 
                                  strokeWidth="1.5" 
                                />
                                <text 
                                  x={lp.x} 
                                  y={lp.y + 13} 
                                  textAnchor="middle" 
                                  fontSize="10" 
                                  fontWeight="700" 
                                  fill="currentColor"
                                  className="fill-theme-primary font-mono select-none"
                                >
                                  {lowTemps[i]}°
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Bottom Section: Nighttime Icon, Condition, Wind & AQI */}
                      <div className="flex items-center">
                        {forecastList.map((fc, i) => {
                          const isYesterday = i === 0 && fc.date < todayStr;
                          return (
                            <div 
                              key={i} 
                              style={{ width: `${dailyColWidth}px` }} 
                              className={`flex flex-col items-center text-center shrink-0 ${
                                isYesterday ? 'opacity-40 grayscale-[50%]' : ''
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                {getWeatherIcon(fc.nightWeather, 'w-3.5 h-3.5')}
                              </div>
                              <span className="text-[10px] text-theme-secondary truncate w-full px-1 mt-0.5 leading-tight">
                                {fc.nightWeather}
                              </span>
                              <span 
                                className="text-[9px] text-theme-muted truncate w-full px-1 leading-tight mt-0.5"
                                title={`${fc.dayWindDirection} ${fc.dayWindLevel}`}
                              >
                                {fc.dayWindDirection} {fc.dayWindLevel}
                              </span>
                              <div className="h-4 flex items-center justify-center mt-0.5">
                                {getAqiPill(fc.aqiText, fc.aqi)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Complete Life Weather Indices (Display all returned indices) */}
            {weather?.lifeIndices && weather.lifeIndices.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-theme-muted flex items-center gap-1.5">
                    <span>生活气象指数</span>
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {weather.lifeIndices.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded-xl bg-theme-base border border-theme-subtle text-xs hover:border-theme-default transition-colors flex flex-col justify-between"
                      title={item.desc}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] text-theme-muted font-medium truncate">{item.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-theme-tag text-theme-primary font-bold shrink-0">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-theme-secondary line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
