function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function strings(value: Record<string, unknown>, keys: string[]) { return keys.every(key => typeof value[key] === 'string'); }
function number(value: unknown) { return typeof value === 'number' && Number.isFinite(value); }
function optional(value: Record<string, unknown>, key: string, type: string) { return value[key] === undefined || typeof value[key] === type; }
function list(value: unknown, check: (item: Record<string, unknown>) => boolean) { return Array.isArray(value) && value.every(item => object(item) && check(item)); }

export function validateCloudValues(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    let valid = true;
    if (key === 'sangnav_links' || key === 'sangnav_secret_links') {
      valid = list(value, item => strings(item, ['id', 'title', 'url', 'categoryId']) && number(item.createdAt)
        && ['description', 'icon'].every(field => optional(item, field, 'string')) && optional(item, 'pinned', 'boolean')
        && (item.clicks === undefined || number(item.clicks))
        && (item.subLinks === undefined || list(item.subLinks, sub => strings(sub, ['id', 'title', 'url']))));
    } else if (key === 'sangnav_categories' || key === 'sangnav_secret_categories') {
      valid = list(value, item => strings(item, ['id', 'name']) && number(item.order) && optional(item, 'iconName', 'string'));
    } else if (key === 'sangnav_engines') {
      valid = Array.isArray(value) && value.length > 0 && list(value, item => strings(item, ['id', 'name', 'url', 'iconName', 'placeholder', 'shortcut']) && optional(item, 'color', 'string') && optional(item, 'enabled', 'boolean'));
    } else if (key === 'sangnav_settings') {
      valid = object(value) && strings(value, ['theme', 'defaultEngineId', 'wallpaperPreset'])
        && ['dark', 'midnight', 'light', 'emerald', 'amber', 'cyber'].includes(value.theme as string)
        && [3, 4, 5, 6].includes(value.columnsCount as number)
        && ['openInNewTab', 'showPinnedDock', 'showWeatherInHero', 'showClock'].every(field => typeof value[field] === 'boolean')
        && optional(value, 'customWallpaperUrl', 'string')
        && (value.faviconProvider === undefined || ['google', 'icon-horse', 'syxw', 'origin', 'default'].includes(value.faviconProvider as string))
        && ['wallpaperBlur', 'wallpaperMaskOpacity'].every(field => value[field] === undefined || number(value[field]));
    } else if (key === 'sangnav_secret_pattern') {
      valid = value === null || (Array.isArray(value) && value.every(dot => Number.isInteger(dot) && dot >= 0 && dot <= 8) && new Set(value).size === value.length);
    } else if (key === 'sangnav_search_history') {
      valid = Array.isArray(value) && value.every(item => typeof item === 'string');
    } else if (key === 'sangnav_analytics_visits' || key === 'sangnav_analytics_searches') {
      const fields = key === 'sangnav_analytics_visits' ? ['linkId', 'title', 'url', 'domain', 'categoryId', 'dateStr'] : ['query', 'engineId', 'engineName', 'dateStr'];
      valid = list(value, item => strings(item, fields) && ['timestamp', 'hour', 'dayOfWeek'].every(field => number(item[field])));
    } else if (key === 'sangnav_active_engine') valid = typeof value === 'string';
    else if (key === 'sangnav_secret_autolock') valid = typeof value === 'boolean';
    if (!valid) throw new Error(`云端字段 ${key} 无效，已保留当前数据。`);
  }
}