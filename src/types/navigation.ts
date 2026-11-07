export interface NavSubLink {
  id: string;
  title: string;
  url: string;
}

export interface NavLinkItem {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  description?: string;
  icon?: string;
  pinned?: boolean;
  createdAt: number;
  subLinks?: NavSubLink[];
}

export interface NavCategory {
  id: string;
  name: string;
  iconName?: string;
  order: number;
}

export interface SearchEngine {
  id: string;
  name: string;
  url: string; // contains %s for query substitution
  iconName: string;
  placeholder: string;
  shortcut: string;
  color?: string;
  enabled?: boolean;
}

export interface WeatherData {
  fetchStatus?: 'fresh' | 'cached' | 'stale' | 'fallback';
  location: {
    city: string;
    province: string;
    country: string;
    name: string;
    lat?: number;
    lon?: number;
  };
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    precipitation: number;
    windDirection: string;
    windSpeed: number;
    windScale: string;
    updateTime: string;
    condition?: string;
    tips?: string;
    uvi?: string;
    sunrise?: string;
    sunset?: string;
    rainNotice?: string;
    aqi?: number;
    aqiText?: string;
  };
  forecast: Array<{
    date: string;
    dayWeather: string;
    nightWeather: string;
    dayTemp: string;
    nightTemp: string;
    dayWindDirection: string;
    dayWindLevel: string;
    dayWeatherIcon?: string;
    nightWeatherIcon?: string;
    aqi?: number;
    aqiText?: string;
  }>;
  hourly?: Array<{
    hour: string;
    temp: string;
    condition: string;
    pop?: string;
    humidity?: string;
    windDir?: string;
  }>;
  lifeIndices?: Array<{
    name: string;
    status: string;
    desc: string;
  }>;
  alarms?: Array<{
    id: string;
    title: string;
    signalType: string;
    signalLevel: string;
    effective: string;
  }>;
  cachedAt: number;
}

export type ThemeMode = 'dark' | 'midnight' | 'light' | 'emerald' | 'amber' | 'cyber';
export type FaviconProvider = 'google' | 'icon-horse' | 'syxw' | 'origin' | 'default';

export interface UserSettings {
  theme: ThemeMode;
  faviconProvider?: FaviconProvider;
  openInNewTab: boolean;
  defaultEngineId: string;
  columnsCount: 3 | 4 | 5 | 6;
  showPinnedDock: boolean;
  showWeatherInHero: boolean;
  showClock: boolean;
  customWallpaperUrl?: string;
  wallpaperPreset: string;
  wallpaperBlur?: number;
  wallpaperMaskOpacity?: number;
}
