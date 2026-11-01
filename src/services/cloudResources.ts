export type CloudValues = Record<string, unknown>;
export type Documents = Map<string, unknown>;
export const RESOURCE_FORMAT = 'sangnav.resource';

const collections: Record<string, string> = {
  sangnav_links: 'links', sangnav_categories: 'categories',
  sangnav_secret_links: 'secret/links', sangnav_secret_categories: 'secret/categories',
};
const singles: Record<string, string> = {
  sangnav_engines: 'search/engines.json', sangnav_active_engine: 'search/active.json',
  sangnav_secret_pattern: 'secret/pattern.json',
  sangnav_secret_autolock: 'secret/autolock.json',
};
const wallpaperFields = ['customWallpaperUrl', 'wallpaperPreset', 'wallpaperBlur', 'wallpaperMaskOpacity'];

export function semanticJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}

function logicalId(id: string) {
  if (!id || id.length > 200 || /[\\/%\x00-\x1f\x7f]/.test(id) || ['.', '..', 'order'].includes(id)) throw new Error('导航数据 ID 不符合逻辑路径约束。');
  return id;
}

export function splitDocuments(values: CloudValues): Documents {
  const documents: Documents = new Map([['app.json', { schemaVersion: 1 }]]);
  for (const [field, prefix] of Object.entries(collections)) {
    if (!(field in values)) continue;
    const items = values[field] as { id: string }[];
    if (!Array.isArray(items) || new Set(items.map(item => item.id)).size !== items.length) throw new Error('导航列表包含无效或重复 ID。');
    documents.set(`${prefix}/order.json`, items.map(item => logicalId(item.id)));
    for (const item of items) documents.set(`${prefix}/${logicalId(item.id)}.json`, item);
  }
  for (const [field, key] of Object.entries(singles)) {
    if (field in values) documents.set(key, values[field]);
  }
  if (values.sangnav_settings) {
    const settings = { ...values.sangnav_settings as Record<string, unknown> };
    const wallpaper: Record<string, unknown> = {};
    for (const field of wallpaperFields) {
      if (field in settings) { wallpaper[field] = settings[field]; delete settings[field]; }
    }
    documents.set('settings.json', settings);
    documents.set('wallpaper.json', wallpaper);
  }
  return documents;
}

export function isManagedKey(key: string) {
  if (['app.json', 'settings.json', 'wallpaper.json', ...Object.values(singles)].includes(key)) return true;
  return Object.values(collections).some(prefix => key.startsWith(`${prefix}/`) && !key.slice(prefix.length + 1).includes('/') && key.endsWith('.json'));
}

export function joinDocuments(documents: Documents, defaults: CloudValues): CloudValues {
  const values = { ...defaults };
  for (const [field, prefix] of Object.entries(collections)) {
    const order = documents.get(`${prefix}/order.json`);
    const items = [...documents].filter(([key]) => key.startsWith(`${prefix}/`) && key !== `${prefix}/order.json`);
    if (order === undefined && items.length === 0) continue;
    if (!Array.isArray(order) || order.some(id => typeof id !== 'string') || new Set(order).size !== order.length) throw new Error(`云端 ${prefix} 顺序清单无效。`);
    const byId = new Map(items.map(([key, item]) => [key.slice(prefix.length + 1, -5), item]));
    if (order.some(id => !byId.has(id)) || byId.size !== order.length) throw new Error(`云端 ${prefix} 列表发生变化，请重新读取。`);
    values[field] = order.map(id => {
      const item = byId.get(id) as { id?: string };
      if (!item || item.id !== id) throw new Error(`云端 ${prefix} ID 不匹配。`);
      return item;
    });
  }
  for (const [field, key] of Object.entries(singles)) {
    if (documents.has(key)) values[field] = documents.get(key);
  }
  if (documents.has('settings.json') || documents.has('wallpaper.json')) {
    for (const key of ['settings.json', 'wallpaper.json']) {
      const value = documents.get(key);
      if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('云端设置格式无效。');
    }
    values.sangnav_settings = { ...defaults.sangnav_settings as object, ...documents.get('settings.json') as object, ...documents.get('wallpaper.json') as object };
  }
  for (const [linksKey, categoriesKey] of [['sangnav_links', 'sangnav_categories'], ['sangnav_secret_links', 'sangnav_secret_categories']]) {
    const links = values[linksKey] as { categoryId?: string }[] | undefined;
    const categories = values[categoriesKey] as { id?: string }[] | undefined;
    if (!Array.isArray(links) || !Array.isArray(categories)) continue;
    const knownCategories = new Set(categories.map(category => category.id));
    if (links.some(link => !knownCategories.has(link?.categoryId))) throw new Error('书签与分类引用不完整；保留当前本地视图，需重新完整加载。');
  }
  return values;
}

export function transactionGroup(key: string) {
  if (/^(links|categories)\//.test(key)) return 'navigation';
  if (/^secret\/(links|categories)\//.test(key)) return 'secret-navigation';
  if (key === 'settings.json' || key === 'wallpaper.json' || key.startsWith('search/')) return 'preferences';
  return key;
}