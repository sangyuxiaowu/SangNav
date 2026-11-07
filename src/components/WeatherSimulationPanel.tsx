import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react';
import { ALL_WEATHER_NAMES, WEATHER_CONFIGS, WeatherEffectName } from '../services/weatherEffects';
import { getWeatherIcon } from './WeatherWidget';

interface WeatherSimulationPanelProps {
  selected: WeatherEffectName | null;
  onSelect: (name: WeatherEffectName | null) => void;
  onClose: () => void;
}

export function WeatherSimulationPanel({ selected, onSelect, onClose }: WeatherSimulationPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [cycling, setCycling] = useState(false);
  const [category, setCategory] = useState('all');
  useEffect(() => {
    if (!cycling) return;
    const timer = window.setInterval(() => {
      const index = selected ? ALL_WEATHER_NAMES.indexOf(selected) : -1;
      onSelect(ALL_WEATHER_NAMES[(index + 1) % ALL_WEATHER_NAMES.length]);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [cycling, selected, onSelect]);

  return (
    <section aria-label="天气模拟面板" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(920px,calc(100%-24px))] max-h-[45vh] overflow-y-auto rounded-lg border border-theme-default bg-theme-elevated/95 backdrop-blur-xl shadow-theme-lg p-3 text-xs text-theme-primary">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <strong className="flex items-center gap-2">{getWeatherIcon(selected || '')}天气模拟 · {selected || '实时天气'}</strong>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={cycling} onChange={(event) => setCycling(event.target.checked)} />自动轮播</label>
          <button type="button" title="恢复实时天气" aria-label="恢复实时天气" onClick={() => { setCycling(false); onSelect(null); }} className="p-1.5 hover:bg-theme-tag rounded"><RotateCcw className="w-4 h-4" /></button>
          <button type="button" title={collapsed ? '展开' : '收起'} aria-label={collapsed ? '展开天气模拟面板' : '收起天气模拟面板'} onClick={() => setCollapsed(!collapsed)} className="p-1.5 hover:bg-theme-tag rounded">{collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
          <button type="button" title="关闭天气模拟" aria-label="关闭天气模拟" onClick={onClose} className="p-1.5 hover:bg-theme-tag rounded"><X className="w-4 h-4" /></button>
        </div>
      </div>
      {!collapsed && <>
        <div role="tablist" aria-label="天气分类" className="flex flex-wrap gap-1 border-y border-theme-default py-2 my-2">
          {Object.entries({ all: '全部', rain: '雨', snow: '雪', ice: '雨夹雪 / 冻雨', fog: '雾', haze: '霾与沙尘', tornado: '龙卷风' }).map(([value, label]) =>
            <button key={value} type="button" role="tab" aria-selected={category === value} onClick={() => setCategory(value)} className={`px-2 py-1 rounded ${category === value ? 'bg-blue-600 text-white' : 'hover:bg-theme-tag text-theme-secondary'}`}>{label}</button>)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_WEATHER_NAMES.filter((name) => category === 'all' || WEATHER_CONFIGS[name].category === category).map((name) =>
            <button key={name} type="button" aria-pressed={selected === name} onClick={() => onSelect(name)} className={`px-2.5 py-1.5 rounded border ${selected === name ? 'bg-blue-600 border-blue-500 text-white' : 'border-theme-default hover:bg-theme-tag'}`}>{name}</button>)}
        </div>
      </>}
    </section>
  );
}