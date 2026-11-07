import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchWeather } from './weatherService';

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
        },
      },
    }), { headers: { 'Content-Type': 'application/json' } });

    const fresh = await fetchWeather({ lat: 28.22, lon: 112.92, forceRefresh: true });
    assert.equal(fresh.fetchStatus, 'fresh');

    values.set(CACHE_KEY, JSON.stringify({
      ...fresh,
      fetchStatus: 'fresh',
      cachedAt: 1,
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