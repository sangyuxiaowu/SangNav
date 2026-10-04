import React, { useState, useEffect, useRef } from 'react';
import { WeatherData } from '../types/navigation';
import { WeatherWidget } from './WeatherWidget';

interface HeroSectionProps {
  weather: WeatherData | null;
  weatherLoading: boolean;
  onRefreshWeather: () => Promise<void>;
  showWeatherInHero: boolean;
  onTriggerSecretMode?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  weather,
  weatherLoading,
  onRefreshWeather,
  showWeatherInHero,
  onTriggerSecretMode,
}) => {
  const [time, setTime] = useState(new Date());
  const clockClicksRef = useRef<number[]>([]);

  const handleClockClick = () => {
    if (!onTriggerSecretMode) return;
    const now = Date.now();
    const recent = clockClicksRef.current.filter((t) => now - t <= 800);
    recent.push(now);
    clockClicksRef.current = recent;
    if (recent.length >= 3) {
      clockClicksRef.current = [];
      onTriggerSecretMode();
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const getGreeting = () => {
    if (hours >= 5 && hours < 12) return '早上好，愿今天充满灵感与效率';
    if (hours >= 12 && hours < 14) return '中午好，适度小憩，保持充沛活力';
    if (hours >= 14 && hours < 19) return '下午好，保持专注，稳步推进任务';
    if (hours >= 19 && hours < 24) return '晚上好，享受属于自己的松弛时光';
    return '夜深了，夜色静谧，早点休息';
  };

  const formattedTime = time.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const formattedSeconds = time.toLocaleTimeString('zh-CN', {
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="text-center space-y-3 pt-4 sm:pt-8 pb-2">
      {/* Big Crisp Clock (Triple click to trigger secret mode) */}
      <div 
        onClick={handleClockClick}
        title="连续三击时钟可呼出/切换私密空间"
        className="inline-flex items-baseline justify-center font-mono tracking-tight select-none cursor-pointer transition-transform active:scale-98"
      >
        <span className="text-5xl sm:text-6xl md:text-7xl font-light text-theme-primary drop-shadow-xs">
          {formattedTime}
        </span>
        <span className="text-sm sm:text-base font-normal text-theme-muted ml-1.5 tabular-nums">
          :{formattedSeconds}
        </span>
      </div>

      {/* Date & Dynamic Greeting */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-theme-secondary font-normal">
        <span className="text-theme-primary font-medium">{formattedDate}</span>
        <span className="text-theme-muted opacity-60">·</span>
        <span>{getGreeting()}</span>
      </div>

      {/* Weather capsule if enabled in settings */}
      {showWeatherInHero && (
        <div className="pt-1">
          <WeatherWidget
            weather={weather}
            loading={weatherLoading}
            onRefresh={onRefreshWeather}
            variant="hero"
          />
        </div>
      )}
    </div>
  );
};
