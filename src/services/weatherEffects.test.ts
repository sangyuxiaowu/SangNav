import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_WEATHER_NAMES, createSimulatedWeather, resolveWeatherEffect, weatherWallpaperBackground } from './weatherEffects';

test('all 28 design presets remain available and resolve the most specific weather', () => {
  assert.equal(ALL_WEATHER_NAMES.length, 28);
  for (const name of ALL_WEATHER_NAMES) {
    assert.equal(resolveWeatherEffect(name), name);
    assert.equal(createSimulatedWeather(name).current.condition, name);
  }
  assert.equal(resolveWeatherEffect('今天有雷阵雨伴有冰雹，请注意'), '雷阵雨伴有冰雹');
  assert.equal(resolveWeatherEffect('持续特大暴雨'), '特大暴雨');
  assert.equal(resolveWeatherEffect('强浓雾预警'), '强浓雾');
  assert.equal(resolveWeatherEffect('晴'), null);
  assert.equal(resolveWeatherEffect(''), null);
});

test('weather tint changes only the pure glow wallpaper', () => {
  assert.ok(weatherWallpaperBackground('default', '冻雨'));
  for (const preset of ['bing', 'custom', 'aurora', 'cyberpunk']) {
    assert.equal(weatherWallpaperBackground(preset, '冻雨'), undefined);
  }
  assert.equal(weatherWallpaperBackground('default', '晴'), undefined);
  assert.notEqual(weatherWallpaperBackground('default', '小雪'), weatherWallpaperBackground('default', '沙尘暴'));
});