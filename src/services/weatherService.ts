import { WeatherData } from '../types/navigation';

const WEATHER_CACHE_KEY = 'novanav_weather_cache';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes cache

export async function fetchWeather(ip?: string, forceRefresh = false): Promise<WeatherData> {
  // Check local cache if not forcing refresh and no custom IP query
  if (!forceRefresh && !ip) {
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const parsed: WeatherData = JSON.parse(cached);
        if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
          return parsed;
        }
      }
    } catch {
      // ignore cache parsing error
    }
  }

  const endpoint = ip 
    ? `https://api.ruseo.cn/api/weather_ip?ip=${encodeURIComponent(ip.trim())}`
    : `https://api.ruseo.cn/api/weather_ip`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Weather API returned status: ${res.status}`);
    }

    const json = await res.json();
    const payload = json?.data?.data || json?.data;

    if (!payload || !payload.location || !payload.current) {
      throw new Error(json?.msg || 'Invalid weather data response structure');
    }

    const weatherData: WeatherData = {
      location: {
        city: payload.location.city || payload.location.province || '未知城市',
        province: payload.location.province || '',
        country: payload.location.country || '中国',
        name: payload.location.name || payload.location.city || '',
      },
      current: {
        temperature: Number(payload.current.temperature ?? 20),
        feelsLike: Number(payload.current.feelsLike ?? payload.current.temperature ?? 20),
        humidity: Number(payload.current.humidity ?? 50),
        pressure: Number(payload.current.pressure ?? 1013),
        precipitation: Number(payload.current.precipitation ?? 0),
        windDirection: payload.current.windDirection || '微风',
        windSpeed: Number(payload.current.windSpeed ?? 2.0),
        windScale: payload.current.windScale || '微风',
        updateTime: payload.current.updateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      forecast: Array.isArray(payload.forecast)
        ? payload.forecast.map((f: any) => ({
            date: f.date || '',
            dayWeather: f.dayWeather || '晴',
            nightWeather: f.nightWeather || '晴',
            dayTemp: String(f.dayTemp ?? '22'),
            nightTemp: String(f.nightTemp ?? '12'),
            dayWindDirection: f.dayWindDirection || '微风',
            dayWindLevel: f.dayWindLevel || '微风',
            dayWeatherIcon: f.dayWeatherIcon,
            nightWeatherIcon: f.nightWeatherIcon,
          }))
        : [],
      alarms: Array.isArray(payload.alarms)
        ? payload.alarms.map((a: any) => ({
            id: a.id || String(Math.random()),
            title: a.title || '天气预警',
            signalType: a.signalType || '气象预警',
            signalLevel: a.signalLevel || '提示',
            effective: a.effective || '',
          }))
        : [],
      cachedAt: Date.now(),
      queryIp: ip || undefined,
    };

    if (!ip) {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData));
    }

    return weatherData;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('Weather fetch fallback triggered:', err.message);

    // Try returning cached data even if expired
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // continue to fallback
      }
    }

    // Default fallback if totally offline or API unavailable
    const fallback: WeatherData = {
      location: {
        city: '北京',
        province: '北京',
        country: '中国',
        name: '海淀',
      },
      current: {
        temperature: 21,
        feelsLike: 20,
        humidity: 35,
        pressure: 1016,
        precipitation: 0,
        windDirection: '西北风',
        windSpeed: 2.8,
        windScale: '微风',
        updateTime: '15:00',
      },
      forecast: [
        {
          date: new Date().toISOString().split('T')[0],
          dayWeather: '晴',
          nightWeather: '多云',
          dayTemp: '22',
          nightTemp: '10',
          dayWindDirection: '北风',
          dayWindLevel: '3~4级',
        }
      ],
      alarms: [],
      cachedAt: Date.now(),
    };
    return fallback;
  }
}
