import { useEffect, useRef } from 'react';
import { createWeatherEffectsEngine } from '../services/weatherEffectsEngine.js';
import { resolveWeatherEffect, WEATHER_CONFIGS } from '../services/weatherEffects';

export function WeatherEffects({ condition }: { condition: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const name = resolveWeatherEffect(condition);

  useEffect(() => {
    const canvas = canvasRef.current;
    const capsule = document.querySelector<HTMLElement>('[data-weather-capsule]');
    const search = document.querySelector<HTMLElement>('[data-weather-search]');
    const alert = document.querySelector<HTMLElement>('[data-weather-alert]');
    if (!canvas || !capsule || !search || !name) return;
    const engine = createWeatherEffectsEngine(canvas, capsule, search, alert);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncVisibility = () => {
      engine.setPaused(document.hidden || motion.matches);
    };
    const category = WEATHER_CONFIGS[name].category;
    const surface = name === '冻雨' ? 'ice' : category === 'snow' || category === 'ice' ? 'frost' : category === 'rain' ? 'wet' : category === 'haze' ? 'sand' : '';
    for (const element of [capsule, search]) element.dataset.weatherSurface = surface;
    syncVisibility();
    engine.setWeather(name);
    document.addEventListener('visibilitychange', syncVisibility);
    motion.addEventListener('change', syncVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      motion.removeEventListener('change', syncVisibility);
      for (const element of [capsule, search]) delete element.dataset.weatherSurface;
      engine.destroy();
    };
  }, [name]);

  return <canvas ref={canvasRef} data-weather-canvas aria-hidden="true"
    className="fixed inset-0 w-screen h-screen pointer-events-none z-20" />;
}