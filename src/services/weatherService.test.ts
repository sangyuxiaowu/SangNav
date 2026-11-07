import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchWeather, getSameDayCachedWeather } from './weatherService';

const CACHE_KEY = 'sangnav_weather_cache_cma_v3';

test('weather refresh distinguishes fresh responses from stale and fallback data', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  try {
    globalThis.fetch = async () => new Response(JSON.stringify({
      data: {
        data: {
          condition: { temp: '16', condition: '阴' },
          forecast: Array.from({ length: 15 }, (_, index) => ({
            predictDate: `2026-11-${String(index + 1).padStart(2, '0')}`,
          })),
          hourly: [
            { hour: '9', windDir: 'NNE', windlevel: '2' },
            { hour: '10', windDir: 'N', windlevel: 0 },
          ],
        },
      },
    }), { headers: { 'Content-Type': 'application/json' } });

    const fresh = await fetchWeather({ lat: 28.22, lon: 112.92, forceRefresh: true });
    assert.equal(fresh.fetchStatus, 'fresh');
    assert.equal(fresh.hourly?.[0].windDir, '北偏东风 2级');
    assert.equal(fresh.hourly?.[1].windDir, '北风 0级');

    values.set(CACHE_KEY, JSON.stringify({
      ...fresh,
      fetchStatus: 'fresh',
      cachedAt: Date.now(),
      current: { ...fresh.current, temperature: 12 },
    }));
    assert.equal(getSameDayCachedWeather()?.current.temperature, 12);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    values.set(CACHE_KEY, JSON.stringify({ ...fresh, cachedAt: yesterday.getTime() }));
    assert.equal(getSameDayCachedWeather(), null);

    values.set(CACHE_KEY, JSON.stringify({
      ...fresh,
      fetchStatus: 'fresh',
      cachedAt: Date.now(),
      current: { ...fresh.current, temperature: 12 },
    }));
    globalThis.fetch = async () => { throw new Error('offline'); };

    const stale = await fetchWeather({ lat: 28.22, lon: 112.92, forceRefresh: true });
    assert.equal(stale.fetchStatus, 'stale');
    assert.equal(stale.current.temperature, 12);

    values.delete(CACHE_KEY);
    const fallback = await fetchWeather({ lat: 28.22, lon: 112.92, forceRefresh: true });
    assert.equal(fallback.fetchStatus, 'fallback');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  }
});