import React, { useState } from 'react';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Droplets, 
  Gauge, 
  RotateCw, 
  AlertTriangle, 
  MapPin, 
  X,
  Thermometer
} from 'lucide-react';
import { WeatherData } from '../types/navigation';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  variant?: 'hero' | 'header';
}

export function getWeatherIcon(weatherDesc: string = '', className = 'w-5 h-5') {
  const desc = weatherDesc.toLowerCase();
  if (desc.includes('雨')) {
    return <CloudRain className={`${className} text-blue-400`} />;
  }
  if (desc.includes('雪')) {
    return <CloudSnow className={`${className} text-cyan-200`} />;
  }
  if (desc.includes('雷')) {
    return <CloudLightning className={`${className} text-amber-400`} />;
  }
  if (desc.includes('阴') || desc.includes('多云')) {
    return <Cloud className={`${className} text-neutral-400`} />;
  }
  if (desc.includes('风')) {
    return <Wind className={`${className} text-teal-400`} />;
  }
  return <Sun className={`${className} text-amber-400`} />;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  loading,
  onRefresh,
  variant = 'hero',
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const locationLabel = weather 
    ? `${weather.location.city || weather.location.province || '当前位置'}`
    : '正在定位天气...';

  const currentWeatherDesc = weather?.forecast?.[0]?.dayWeather || '晴';
  const tempDisplay = weather ? `${Math.round(weather.current.temperature)}°` : '--°';

  return (
    <>
      {/* Trigger Button */}
      {variant === 'header' ? (
        <button
          onClick={() => setModalOpen(true)}
          title="点击查看详细天气及预警"
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-600 transition-all text-neutral-200 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-neutral-500 cursor-pointer"
        >
          {loading ? (
            <RotateCw className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
          ) : (
            getWeatherIcon(currentWeatherDesc, 'w-3.5 h-3.5')
          )}
          <span className="font-medium text-neutral-300">{locationLabel}</span>
          <span className="font-mono tabular-nums text-neutral-100 font-semibold">{tempDisplay}</span>
          {weather?.alarms && weather.alarms.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-full font-medium">
              <AlertTriangle className="w-2.5 h-2.5" />
              预警
            </span>
          )}
        </button>
      ) : (
        /* Hero Variant */
        <div 
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-default shadow-theme-sm cursor-pointer backdrop-blur-md transition-all text-theme-secondary text-xs group"
        >
          <div className="p-1.5 rounded-xl bg-theme-tag group-hover:scale-105 transition-transform">
            {loading ? (
              <RotateCw className="w-4 h-4 text-theme-muted animate-spin" />
            ) : (
              getWeatherIcon(currentWeatherDesc, 'w-4 h-4')
            )}
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-theme-primary">{locationLabel}</span>
              <span className="font-mono text-theme-primary font-bold">{tempDisplay}</span>
              <span className="text-theme-secondary font-normal">{currentWeatherDesc}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-theme-muted">
              <span>体感 {weather ? Math.round(weather.current.feelsLike) : '--'}°</span>
              <span>·</span>
              <span>{weather?.current.windDirection || '微风'} {weather?.current.windScale || ''}</span>
              <span>·</span>
              <span>湿度 {weather?.current.humidity ?? '--'}%</span>
            </div>
          </div>
          {weather?.alarms && weather.alarms.length > 0 && (
            <span className="ml-1 flex items-center gap-1 text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium border border-amber-500/20">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              {weather.alarms[0].signalType}预警
            </span>
          )}
        </div>
      )}

      {/* Weather Detail Modal */}
      {modalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-theme-surface border border-theme-default rounded-3xl p-6 shadow-theme-lg space-y-5 animate-in fade-in zoom-in-95 duration-150 text-theme-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-theme-subtle pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-theme-primary flex items-center gap-2">
                    {weather?.location.province ? `${weather.location.province} · ` : ''}
                    {weather?.location.city || '天气详情'}
                    {weather?.location.name && weather.location.name !== weather.location.city && (
                      <span className="text-xs text-theme-muted font-normal">({weather.location.name})</span>
                    )}
                  </h3>
                  <p className="text-xs text-theme-muted">
                    更新于 {weather?.current.updateTime || '刚刚'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="p-2 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-surface-hover transition-colors cursor-pointer"
                  title="刷新当前天气"
                >
                  <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-theme-muted hover:text-theme-primary rounded-lg hover:bg-theme-surface-hover transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weather Alarms Warning (if present) */}
            {weather?.alarms && weather.alarms.length > 0 && (
              <div className="space-y-2">
                {weather.alarms.map((alarm) => (
                  <div 
                    key={alarm.id}
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-200 text-xs"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-amber-600 dark:text-amber-300">
                        {alarm.title || `${alarm.signalType} ${alarm.signalLevel}预警`}
                      </div>
                      {alarm.effective && (
                        <div className="text-[11px] opacity-80 mt-0.5">
                          发布时间: {alarm.effective}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Primary Current Weather Display */}
            {weather && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-theme-base border border-theme-default">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-theme-surface border border-theme-default shadow-xs">
                    {weather.forecast?.[0]?.dayWeatherIcon ? (
                      <img 
                        src={weather.forecast[0].dayWeatherIcon} 
                        alt={currentWeatherDesc} 
                        className="w-10 h-10 object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      getWeatherIcon(currentWeatherDesc, 'w-10 h-10')
                    )}
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tracking-tight text-theme-primary">
                      {Math.round(weather.current.temperature)}°C
                    </div>
                    <div className="text-xs text-theme-secondary mt-0.5 flex items-center gap-1.5">
                      <span>{currentWeatherDesc}</span>
                      <span>·</span>
                      <span>体感 {Math.round(weather.current.feelsLike)}°C</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-theme-surface border border-theme-subtle">
                    <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-theme-muted">湿度</div>
                      <div className="font-mono text-theme-primary font-semibold">{weather.current.humidity}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-theme-surface border border-theme-subtle">
                    <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                    <div className="truncate">
                      <div className="text-[10px] text-theme-muted">风向风级</div>
                      <div className="font-medium text-theme-primary truncate text-[11px]">
                        {weather.current.windDirection} {weather.current.windScale}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-theme-surface border border-theme-subtle">
                    <Gauge className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-theme-muted">气压</div>
                      <div className="font-mono text-theme-primary font-semibold">{weather.current.pressure} hPa</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-theme-surface border border-theme-subtle">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-[10px] text-theme-muted">降水</div>
                      <div className="font-mono text-theme-primary font-semibold">{weather.current.precipitation} mm</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Forecast Row */}
            {weather?.forecast && weather.forecast.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-theme-muted mb-2">预报趋势</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {weather.forecast.map((fc, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-2xl bg-theme-base border border-theme-subtle flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {getWeatherIcon(fc.dayWeather, 'w-4 h-4')}
                        <div>
                          <span className="font-medium text-theme-primary">{fc.date || '今日'}</span>
                          <span className="text-theme-secondary ml-1.5">{fc.dayWeather}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-theme-primary font-bold">{fc.dayTemp}°</span>
                        <span className="text-theme-muted mx-1">/</span>
                        <span className="font-mono text-theme-muted">{fc.nightTemp}°</span>
                      </div>
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
