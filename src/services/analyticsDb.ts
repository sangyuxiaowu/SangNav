/**
 * IndexedDB Analytics Service for sangnav
 * Stores local visit and search telemetry completely on-device.
 */

export interface VisitRecord {
  id?: number;
  linkId: string;
  title: string;
  url: string;
  domain: string;
  categoryId: string;
  timestamp: number;
  hour: number; // 0 - 23
  dayOfWeek: number; // 0 - 6
  dateStr: string; // YYYY-MM-DD
}

export interface SearchRecord {
  id?: number;
  query: string;
  engineId: string;
  engineName: string;
  timestamp: number;
  hour: number; // 0 - 23
  dayOfWeek: number; // 0 - 6
  dateStr: string; // YYYY-MM-DD
}

export interface LinkClickStat {
  linkId: string;
  title: string;
  url: string;
  domain: string;
  count: number;
  percentage: number;
}

export interface HourlyStat {
  hour: number;
  label: string;
  count: number;
  percentage: number;
}

export interface SearchQueryStat {
  query: string;
  count: number;
}

export interface EngineStat {
  engineId: string;
  engineName: string;
  count: number;
  percentage: number;
}

const DB_NAME = 'sangnav_analytics_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // Store: visits
      if (!db.objectStoreNames.contains('visits')) {
        const visitStore = db.createObjectStore('visits', {
          keyPath: 'id',
          autoIncrement: true,
        });
        visitStore.createIndex('by_linkId', 'linkId', { unique: false });
        visitStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        visitStore.createIndex('by_hour', 'hour', { unique: false });
        visitStore.createIndex('by_dateStr', 'dateStr', { unique: false });
      }

      // Store: searches
      if (!db.objectStoreNames.contains('searches')) {
        const searchStore = db.createObjectStore('searches', {
          keyPath: 'id',
          autoIncrement: true,
        });
        searchStore.createIndex('by_engineId', 'engineId', { unique: false });
        searchStore.createIndex('by_timestamp', 'timestamp', { unique: false });
        searchStore.createIndex('by_query', 'query', { unique: false });
        searchStore.createIndex('by_hour', 'hour', { unique: false });
        searchStore.createIndex('by_dateStr', 'dateStr', { unique: false });
      }
    };

    request.onsuccess = (e) => {
      resolve((e.target as IDBOpenDBRequest).result);
    };

    request.onerror = (e) => {
      reject((e.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Record a link visit event in IndexedDB
 */
export async function recordVisit(link: {
  id: string;
  title: string;
  url: string;
  categoryId: string;
}): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date();
    const record: VisitRecord = {
      linkId: link.id,
      title: link.title,
      url: link.url,
      domain: extractDomain(link.url),
      categoryId: link.categoryId,
      timestamp: now.getTime(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      dateStr: now.toISOString().split('T')[0],
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('visits', 'readwrite');
      const store = tx.objectStore('visits');
      const req = store.add(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to record visit in IndexedDB:', err);
  }
}

/**
 * Record a search event in IndexedDB
 */
export async function recordSearch(
  query: string,
  engine: { id: string; name: string }
): Promise<void> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  try {
    const db = await getDb();
    const now = new Date();
    const record: SearchRecord = {
      query: cleanQuery,
      engineId: engine.id,
      engineName: engine.name,
      timestamp: now.getTime(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      dateStr: now.toISOString().split('T')[0],
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('searches', 'readwrite');
      const store = tx.objectStore('searches');
      const req = store.add(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to record search in IndexedDB:', err);
  }
}

/**
 * Fetch all visit records within a time range
 */
export async function getVisits(timeRange: 'all' | '7days' | 'today' = 'all'): Promise<VisitRecord[]> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction('visits', 'readonly');
      const store = tx.objectStore('visits');
      const req = store.getAll();

      req.onsuccess = () => {
        let results: VisitRecord[] = req.result || [];
        const now = Date.now();

        if (timeRange === '7days') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          results = results.filter((r) => r.timestamp >= sevenDaysAgo);
        } else if (timeRange === 'today') {
          const todayStr = new Date().toISOString().split('T')[0];
          results = results.filter((r) => r.dateStr === todayStr);
        }

        resolve(results);
      };

      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Fetch all search records within a time range
 */
export async function getSearches(timeRange: 'all' | '7days' | 'today' = 'all'): Promise<SearchRecord[]> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction('searches', 'readonly');
      const store = tx.objectStore('searches');
      const req = store.getAll();

      req.onsuccess = () => {
        let results: SearchRecord[] = req.result || [];
        const now = Date.now();

        if (timeRange === '7days') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          results = results.filter((r) => r.timestamp >= sevenDaysAgo);
        } else if (timeRange === 'today') {
          const todayStr = new Date().toISOString().split('T')[0];
          results = results.filter((r) => r.dateStr === todayStr);
        }

        resolve(results);
      };

      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Compute comprehensive analytics data for the dashboard
 */
export async function getAnalyticsDashboardData(timeRange: 'all' | '7days' | 'today' = 'all') {
  const [visits, searches] = await Promise.all([getVisits(timeRange), getSearches(timeRange)]);

  // 1. Link Clicks Bar Chart
  const linkMap: Record<string, { title: string; url: string; domain: string; count: number }> = {};
  for (const v of visits) {
    if (!linkMap[v.linkId]) {
      linkMap[v.linkId] = {
        title: v.title,
        url: v.url,
        domain: v.domain || extractDomain(v.url),
        count: 0,
      };
    }
    linkMap[v.linkId].count += 1;
  }

  const totalVisits = visits.length;
  const sortedLinks: LinkClickStat[] = Object.entries(linkMap)
    .map(([linkId, data]) => ({
      linkId,
      title: data.title,
      url: data.url,
      domain: data.domain,
      count: data.count,
      percentage: totalVisits > 0 ? Math.round((data.count / totalVisits) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 2. 24-Hour Time Preference Distribution
  const hourCounts = new Array(24).fill(0);
  for (const v of visits) {
    const h = v.hour >= 0 && v.hour < 24 ? v.hour : 0;
    hourCounts[h] += 1;
  }

  const maxHourCount = Math.max(...hourCounts, 1);
  const hourlyStats: HourlyStat[] = hourCounts.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    count,
    percentage: Math.round((count / maxHourCount) * 100),
  }));

  // Identify peak activity period
  let peakHour = 0;
  let peakCount = 0;
  hourlyStats.forEach((stat) => {
    if (stat.count > peakCount) {
      peakCount = stat.count;
      peakHour = stat.hour;
    }
  });

  // 3. Search Queries & Engine Distribution
  const queryMap: Record<string, number> = {};
  const engineMap: Record<string, { name: string; count: number }> = {};

  for (const s of searches) {
    queryMap[s.query] = (queryMap[s.query] || 0) + 1;
    if (!engineMap[s.engineId]) {
      engineMap[s.engineId] = { name: s.engineName || s.engineId, count: 0 };
    }
    engineMap[s.engineId].count += 1;
  }

  const totalSearches = searches.length;
  const topQueries: SearchQueryStat[] = Object.entries(queryMap)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const engineStats: EngineStat[] = Object.entries(engineMap)
    .map(([engineId, data]) => ({
      engineId,
      engineName: data.name,
      count: data.count,
      percentage: totalSearches > 0 ? Math.round((data.count / totalSearches) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const recentSearches = [...searches]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  return {
    totalVisits,
    totalSearches,
    topLinks: sortedLinks.slice(0, 12),
    allRankedLinks: sortedLinks,
    hourlyStats,
    peakHour: {
      hour: peakHour,
      count: peakCount,
      label: `${peakHour.toString().padStart(2, '0')}:00 - ${(peakHour + 1).toString().padStart(2, '0')}:00`,
    },
    topQueries,
    engineStats,
    recentSearches,
  };
}

/**
 * Seed sample data from initial link clicks only ONCE on first launch
 */
export async function seedInitialAnalyticsIfEmpty(links: Array<{ id: string; title: string; url: string; categoryId: string; clicks?: number }>) {
  try {
    // If user has already initialized or cleared, never auto-seed again!
    if (typeof window !== 'undefined' && localStorage.getItem('sangnav_analytics_initialized') === 'true') {
      return;
    }

    const db = await getDb();
    const count: number = await new Promise((resolve) => {
      const tx = db.transaction('visits', 'readonly');
      const store = tx.objectStore('visits');
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    if (count > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sangnav_analytics_initialized', 'true');
      }
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('sangnav_analytics_initialized', 'true');
    }

    // Seed realistic visits from links
    const now = Date.now();
    const tx = db.transaction(['visits', 'searches'], 'readwrite');
    const visitStore = tx.objectStore('visits');
    const searchStore = tx.objectStore('searches');

    // Generate visits distributed over the past 7 days with realistic peak afternoon hours
    for (const link of links) {
      const clickCount = Math.min(link.clicks || 0, 40);
      for (let i = 0; i < clickCount; i++) {
        // Distribute timestamp within last 7 days
        const daysAgo = Math.floor(Math.random() * 7);
        // Realistic hour distribution: peaked around 10:00 - 16:00 and 20:00 - 22:00
        const rand = Math.random();
        let hour = 14;
        if (rand < 0.3) hour = 9 + Math.floor(Math.random() * 3);
        else if (rand < 0.7) hour = 13 + Math.floor(Math.random() * 5);
        else if (rand < 0.9) hour = 20 + Math.floor(Math.random() * 3);
        else hour = Math.floor(Math.random() * 24);

        const date = new Date(now - daysAgo * 86400000);
        date.setHours(hour, Math.floor(Math.random() * 60));

        visitStore.add({
          linkId: link.id,
          title: link.title,
          url: link.url,
          domain: extractDomain(link.url),
          categoryId: link.categoryId,
          timestamp: date.getTime(),
          hour: date.getHours(),
          dayOfWeek: date.getDay(),
          dateStr: date.toISOString().split('T')[0],
        });
      }
    }

    // Seed some initial searches
    const sampleSearches = [
      { q: 'React 19 特性', engine: { id: 'bing', name: '必应' } },
      { q: 'Tailwind CSS 教程', engine: { id: 'baidu', name: '百度' } },
      { q: 'TypeScript 常用技巧', engine: { id: 'bing', name: '必应' } },
      { q: 'Github trending', engine: { id: 'github', name: 'GitHub' } },
      { q: 'AI Prompt 指南', engine: { id: 'bing', name: '必应' } },
      { q: 'B站前端公开课', engine: { id: 'bilibili', name: 'Bilibili' } },
    ];

    sampleSearches.forEach((item, idx) => {
      const date = new Date(now - (idx % 3) * 86400000);
      date.setHours(10 + (idx * 2) % 12);
      searchStore.add({
        query: item.q,
        engineId: item.engine.id,
        engineName: item.engine.name,
        timestamp: date.getTime(),
        hour: date.getHours(),
        dayOfWeek: date.getDay(),
        dateStr: date.toISOString().split('T')[0],
      });
    });
  } catch (err) {
    console.warn('Seeding initial analytics error:', err);
  }
}

/**
 * Clear all records in IndexedDB
 */
export async function clearAllAnalytics(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sangnav_analytics_initialized', 'true');
  }
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['visits', 'searches'], 'readwrite');
      const req1 = tx.objectStore('visits').clear();
      const req2 = tx.objectStore('searches').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      req1.onerror = () => reject(req1.error);
      req2.onerror = () => reject(req2.error);
    });
  } catch (err) {
    console.warn('Clear analytics error:', err);
  }
}
