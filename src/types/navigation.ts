export interface NavLinkItem {
  id: string;
  title: string;
  url: string;
  categoryId: string;
  description?: string;
  icon?: string;
  pinned?: boolean;
  clicks?: number;
  createdAt: number;
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
}

export interface WeatherData {
  location: {
    city: string;
    province: string;
    country: string;
    name: string;
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
  }>;
  alarms?: Array<{
    id: string;
    title: string;
    signalType: string;
    signalLevel: string;
    effective: string;
  }>;
  cachedAt: number;
  queryIp?: string;
}

export type ThemeMode = 'dark' | 'midnight' | 'light' | 'emerald' | 'amber' | 'cyber';
export type FaviconProvider = 'google' | 'icon-horse' | 'origin' | 'default';

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
