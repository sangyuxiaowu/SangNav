import { WeatherData } from '../types/navigation';
import { WEATHER_CONFIGS } from './weatherEffectsEngine.js';

export { WEATHER_CONFIGS };
export type WeatherEffectName = keyof typeof WEATHER_CONFIGS;
export const ALL_WEATHER_NAMES = Object.keys(WEATHER_CONFIGS) as WeatherEffectName[];

export function resolveWeatherEffect(condition: string = ''): WeatherEffectName | null {
  const text = condition.trim();
  if (!text) return null;
  const exact = ALL_WEATHER_NAMES.find((name) => name === text);
  if (exact) return exact;
  const contained = [...ALL_WEATHER_NAMES].sort((left, right) => right.length - left.length)
    .find((name) => text.includes(name));
  if (contained) return contained;
  if (text.includes('冰雹')) return '雷阵雨伴有冰雹';
  if (text.includes('霾')) return '中度霾';
  if (text.includes('雾')) return '浓雾';
  if (text.includes('雪')) return '小雪';
  if (text.includes('雨')) return '小雨';
  return null;
}

export function weatherWallpaperBackground(preset: string, condition: string): string | undefined {
  const name = resolveWeatherEffect(condition);
  return preset === 'default' && name ? WEATHER_CONFIGS[name].ambientBg : undefined;
}

export function createSimulatedWeather(name: WeatherEffectName): WeatherData {
  const config = WEATHER_CONFIGS[name];
  return {
    location: { city: '天气模拟', province: '', country: '', name: '天气模拟' },
    current: {
      condition: name,
      temperature: parseFloat(config.temp),
      feelsLike: parseFloat(config.feelsLike),
      humidity: parseFloat(config.humidity),
      pressure: 0, precipitation: 0, windSpeed: 0,
      windDirection: config.wind, windScale: '', updateTime: '',
      rainNotice: config.alertText,
      aqi: parseFloat(config.aqi.text.replace(/\D/g, '')),
      aqiText: config.aqi.text.split(' ')[0],
    },
    forecast: [],
    cachedAt: Date.now(),
  };
}