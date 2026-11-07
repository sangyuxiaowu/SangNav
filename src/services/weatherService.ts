import { WeatherData } from '../types/navigation';

const WEATHER_CACHE_KEY = 'sangnav_weather_cache_cma_v3';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

interface CMAWeatherCityResponse {
  code: string | number;
  message?: string;
  data?: {
    cname?: string;
    stationID?: string;
    lat?: number | string;
    lon?: number | string;
  };
}

interface CMALiveInnerData {
  sfc?: {
    rainLastTime?: number;
    rain?: number;
    sfCondition?: number;
    banner?: string;
    notice?: string;
  };
  condition?: {
    vis?: string;
    temp?: string;
    realFeel?: string;
    condition?: string;
    conditionId?: string;
    humidity?: string;
    pressure?: string;
    precipitation?: string;
    rainfall_intensity?: string;
    windDir?: string;
    windLevel?: string;
    windSpeed?: string;
    tips?: string;
    sunRise?: string;
    sunSet?: string;
    uvi?: string;
    updatetime?: string;
  };
  city?: {
    counname?: string;
    pname?: string;
    secondaryname?: string;
    name?: string;
    cityId?: number;
  };
  aqiForecast?: Array<{
    date?: string;
    publishTime?: string;
    value?: number | string;
  }>;
  forecast?: Array<{
    predictDate?: string;
    conditionDay?: string;
    conditionNight?: string;
    tempDay?: string | number;
    tempNight?: string | number;
    windDirDay?: string;
    windLevelDay?: string | number;
    windDirNight?: string;
    windLevelNight?: string | number;
    humidity?: string | number;
    uvi?: string | number;
    pop?: string | number;
  }>;
  hourly?: Array<{
    date?: string;
    hour?: string | number;
    temp?: string | number;
    condition?: string;
    realFeel?: string | number;
    pop?: string | number;
    humidity?: string | number;
    windDir?: string;
    windlevel?: string | number;
  }>;
  liveIndex?: Record<
    string,
    Array<{
      name?: string;
      status?: string;
      desc?: string;
    }>
  >;
}

interface CMAWeatherLiveResponse {
  code: string | number;
  message?: string;
  data?: {
    code?: number;
    msg?: string;
    data?: CMALiveInnerData;
  };
}

function getAqiDescription(val: number): { text: string; level: string } {
  if (val <= 50) return { text: '优', level: '一级' };
  if (val <= 100) return { text: '良', level: '二级' };
  if (val <= 150) return { text: '轻度污染', level: '三级' };
  if (val <= 200) return { text: '中度污染', level: '四级' };
  if (val <= 300) return { text: '重度污染', level: '五级' };
  return { text: '严重污染', level: '六级' };
}

/**
 * Fetch helper with timeout and fallback endpoints
 */
async function fetchJsonWithFallback<T>(directUrl: string, proxyUrl: string, timeoutMs = 7000): Promise<T> {
  // Try direct URL first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(directUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (directErr) {
    // If direct fetch fails (e.g. CORS on some environments), attempt local proxy fallback if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(proxyUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Ignore proxy error and throw original direct error
    }
    throw directErr;
  }
  throw new Error(`Failed to fetch from ${directUrl}`);
}

export async function fetchWeather(
  options?: { lat?: number; lon?: number; forceRefresh?: boolean }
): Promise<WeatherData> {
  const forceRefresh = !!options?.forceRefresh;
  const customLat = options?.lat;
  const customLon = options?.lon;

  // Clear stale legacy caches
  try {
    localStorage.removeItem('sangnav_weather_cache_cma_v1');
    localStorage.removeItem('sangnav_weather_cache_cma_v2');
  } catch {
    // ignore
  }

  // 1. Check local cache if not forcing refresh (require full >= 15 forecast days)
  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const parsed: WeatherData = JSON.parse(cached);
        if (
          Date.now() - parsed.cachedAt < CACHE_TTL_MS &&
          Array.isArray(parsed.forecast) &&
          parsed.forecast.length >= 15
        ) {
          return { ...parsed, fetchStatus: 'cached' };
        }
      }
    } catch {
      // ignore cache parsing error
    }
  }

  try {
    let lat = customLat;
    let lon = customLon;
    let cityName = '';

    // 2. If lat & lon not provided, try browser geolocation first, then CMA getCurrentCity
    if (lat === undefined || lon === undefined) {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const coords = await new Promise<{ lat: number; lon: number }>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('timeout')), 2500);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeout);
                resolve({
                  lat: Number(pos.coords.latitude.toFixed(2)),
                  lon: Number(pos.coords.longitude.toFixed(2)),
                });
              },
              (err) => {
                clearTimeout(timeout);
                reject(err);
              },
              { timeout: 2500, maximumAge: 60000 }
            );
          });
          lat = coords.lat;
          lon = coords.lon;
        } catch {
          // Geolocation rejected or timed out, continue to CMA getCurrentCity
        }
      }

      if (lat === undefined || lon === undefined) {
        const cityData = await fetchJsonWithFallback<CMAWeatherCityResponse>(
          `https://data.cma.cn/api/weatherForecast/getCurrentCity?_t=${Date.now()}`,
          `/api/cma/weatherForecast/getCurrentCity?_t=${Date.now()}`,
          6000
        );

        if (cityData?.data?.lat !== undefined && cityData?.data?.lon !== undefined) {
          lat = Number(cityData.data.lat);
          lon = Number(cityData.data.lon);
          cityName = cityData.data.cname || '';
        }
      }
    }

    // Default coordinates (Changsha/Beijing center fallback if coordinates still missing)
    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      lat = 28.22;
      lon = 112.92;
      cityName = cityName || '长沙';
    }

    // 3. Request CMA live weather data with cache buster
    const liveDirectUrl = `https://data.cma.cn/api/weatherForecast/live?lat=${lat}&lon=${lon}&type=1&_t=${Date.now()}`;
    const liveProxyUrl = `/api/cma/weatherForecast/live?lat=${lat}&lon=${lon}&type=1&_t=${Date.now()}`;

    const liveRes = await fetchJsonWithFallback<CMAWeatherLiveResponse>(
      liveDirectUrl,
      liveProxyUrl,
      7000
    );

    const liveData: CMALiveInnerData | undefined = liveRes?.data?.data;
    if (!liveData || !liveData.condition) {
      throw new Error(liveRes?.message || 'Invalid CMA weather payload');
    }

    const cond = liveData.condition;
    const city = liveData.city || {};
    const sfc = liveData.sfc;
    const forecastList = Array.isArray(liveData.forecast) ? liveData.forecast : [];
    const hourlyList = Array.isArray(liveData.hourly) ? liveData.hourly : [];
    const aqiList = Array.isArray(liveData.aqiForecast) ? liveData.aqiForecast : [];
    const liveIndexMap = liveData.liveIndex || {};

    // Calculate AQI
    let currentAqi: number | undefined;
    let currentAqiText: string | undefined;
    if (aqiList.length > 0) {
      // Find today's entry or latest
      const todayStr = new Date().toISOString().split('T')[0];
      const matched = aqiList.find((a: { date?: string; value?: number | string }) => a.date === todayStr) || aqiList[0];
      if (matched && matched.value !== undefined) {
        currentAqi = Number(matched.value);
        currentAqiText = getAqiDescription(currentAqi).text;
      }
    }

    // Format update time
    let formattedUpdateTime = '刚刚';
    if (cond.updatetime) {
      // Format "2026-11-07 10:00:08" -> "10:00"
      formattedUpdateTime = cond.updatetime.length >= 16 
        ? cond.updatetime.slice(11, 16) 
        : cond.updatetime;
    }

    // Short-term rain notice from radar
    const rainNotice = sfc?.notice || sfc?.banner;

    // Alarms / radar alert
    const alarms: WeatherData['alarms'] = [];
    if (rainNotice && (rainNotice.includes('雨') || rainNotice.includes('雪') || sfc?.rain === 1)) {
      alarms.push({
        id: 'cma-radar-rain',
        title: '短临降水提醒',
        signalType: '短临雷达',
        signalLevel: '降水预报',
        effective: rainNotice,
      });
    }

    // Extract life indices for today (or first date key in map)
    const availableDates = Object.keys(liveIndexMap);
    const todayDateStr = new Date().toISOString().split('T')[0];
    const targetDateKey = availableDates.find((d) => d === todayDateStr) || availableDates[0];
    const rawIndices = targetDateKey ? liveIndexMap[targetDateKey] : [];
    const lifeIndices = Array.isArray(rawIndices)
      ? rawIndices.map((idx) => ({
          name: idx.name || '',
          status: idx.status || '',
          desc: idx.desc || '',
        }))
      : [];

    const weatherData: WeatherData = {
      location: {
        city: city.secondaryname || cityName || city.name || '当前位置',
        province: city.pname || '',
        country: city.counname || '中国',
        name: city.name || cityName || '',
        lat,
        lon,
      },
      fetchStatus: 'fresh',
      current: {
        temperature: Number(cond.temp ?? 20),
        feelsLike: Number(cond.realFeel ?? cond.temp ?? 20),
        humidity: Number(cond.humidity ?? 50),
        pressure: Number(cond.pressure ?? 1013),
        precipitation: Number(cond.precipitation ?? cond.rainfall_intensity ?? 0),
        windDirection: cond.windDir || '微风',
        windSpeed: Number(cond.windSpeed ?? 2.0),
        windScale: cond.windLevel ? `${cond.windLevel}级` : '微风',
        updateTime: formattedUpdateTime,
        condition: cond.condition || '晴',
        tips: cond.tips || undefined,
        uvi: cond.uvi || undefined,
        sunrise: cond.sunRise ? cond.sunRise.slice(11, 16) : undefined,
        sunset: cond.sunSet ? cond.sunSet.slice(11, 16) : undefined,
        rainNotice: rainNotice || undefined,
        aqi: currentAqi,
        aqiText: currentAqiText,
      },
      forecast: forecastList.map((f: NonNullable<CMALiveInnerData['forecast']>[number]) => {
        const matchedAqi = aqiList.find((a: { date?: string; value?: number | string }) => a.date === f.predictDate);
        let itemAqi: number | undefined;
        let itemAqiText: string | undefined;
        if (matchedAqi && matchedAqi.value !== undefined) {
          itemAqi = Number(matchedAqi.value);
          itemAqiText = getAqiDescription(itemAqi).text;
        }
        return {
          date: f.predictDate || '',
          dayWeather: f.conditionDay || '晴',
          nightWeather: f.conditionNight || '晴',
          dayTemp: String(f.tempDay ?? '20'),
          nightTemp: String(f.tempNight ?? '15'),
          dayWindDirection: f.windDirDay || '微风',
          dayWindLevel: f.windLevelDay ? `${f.windLevelDay}级` : '微风',
          aqi: itemAqi,
          aqiText: itemAqiText,
        };
      }),
      hourly: hourlyList.slice(0, 24).map((h: NonNullable<CMALiveInnerData['hourly']>[number]) => ({
        hour: h.hour !== undefined ? `${h.hour}:00` : '',
        temp: String(h.temp ?? ''),
        condition: h.condition || '',
        pop: h.pop !== undefined ? `${h.pop}%` : undefined,
        humidity: h.humidity !== undefined ? `${h.humidity}%` : undefined,
        windDir: h.windDir || undefined,
      })),
      lifeIndices,
      alarms,
      cachedAt: Date.now(),
    };

    // Cache to localStorage
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData));
    } catch {
      // ignore localStorage quota error
    }

    return weatherData;
  } catch (err: any) {
    console.warn('CMA Weather fetch fallback triggered:', err?.message || err);

    // Try returning cached data even if expired
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        return { ...JSON.parse(cached), fetchStatus: 'stale' };
      }
    } catch {
      // continue to fallback
    }

    // Default fallback if offline or API unavailable
    const fallback: WeatherData = {
      fetchStatus: 'fallback',
      location: {
        city: '长沙',
        province: '湖南省',
        country: '中国',
        name: '岳麓区',
        lat: 28.22,
        lon: 112.92,
      },
      current: {
        temperature: 18,
        feelsLike: 18,
        humidity: 70,
        pressure: 1018,
        precipitation: 0,
        windDirection: '北风',
        windSpeed: 2.1,
        windScale: '1级',
        updateTime: '刚刚',
        condition: '多云',
        tips: '天气舒适，适合户外活动',
        aqi: 28,
        aqiText: '优',
      },
      forecast: [
        {
          date: new Date().toISOString().split('T')[0],
          dayWeather: '多云',
          nightWeather: '阴',
          dayTemp: '20',
          nightTemp: '14',
          dayWindDirection: '北风',
          dayWindLevel: '1级',
        },
      ],
      alarms: [],
      cachedAt: Date.now(),
    };
    return fallback;
  }
}
