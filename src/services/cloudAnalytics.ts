import { aggregateEvents, analyticsWindow, type AnalyticsRange, type Stream } from './cloudEvents';
import { getCloudConnection, readValue } from './cloudStorage';
import type { NavLinkItem, SearchEngine } from '../types/navigation';
import type { SearchRecord } from './analyticsDb';

function count(row: Record<string, unknown> | undefined, field = 'count') {
  const value = row?.[field] ?? 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('统计计数超出可安全展示的范围。');
  return value;
}

export async function getCloudDashboard(range: AnalyticsRange) {
  const timeRange = analyticsWindow(range);
  const caps = getCloudConnection()?.capabilities.eventAggregation;
  if (!caps || !['count', 'count_distinct'].every(operation => caps.operations.includes(operation)) || !caps.timeBuckets.includes('hourOfDay') || caps.rows < 24 || caps.metrics < 2 || caps.groupDimensions < 1) throw new Error('服务端统计聚合能力不满足看板要求。');
  const query = (stream: Stream, groupBy: unknown[], limit = 1, ranked = false) => aggregateEvents(stream, {
    timeRange, groupBy, metrics: [{ op: 'count', alias: 'count' }], limit: Math.min(limit, caps.rows),
    ...(ranked ? { orderBy: { field: 'count', direction: 'desc' } } : {}),
  });
  const totals = (stream: Stream, field: string) => aggregateEvents(stream, { timeRange, groupBy: [], metrics: [{ op: 'count', alias: 'count' }, { op: 'count_distinct', field, alias: 'unique' }], limit: 1 });
  const visits = await totals('analytics.visits', 'domain');
  const searches = await totals('analytics.searches', 'query');
  const domains = await query('analytics.visits', ['domain'], 12, true);
  const hours = await query('analytics.visits', [{ source: 'eventTime', bucket: 'hourOfDay', timeZone: timeRange.timeZone, alias: 'hour' }], 24);
  const queries = await query('analytics.searches', ['query'], 10, true);
  const engines = await query('analytics.searches', ['engineId'], caps.rows, true);
  const totalVisits = count(visits.rows[0]);
  const totalSearches = count(searches.rows[0]);
  const links = readValue<NavLinkItem[]>('sangnav_links', []);
  const engineList = readValue<SearchEngine[]>('sangnav_engines', []);
  const topLinks = domains.rows.map(row => {
    const domain = typeof row.domain === 'string' ? row.domain : '';
    const link = links.find(item => { try { return new URL(item.url).hostname.replace(/^www\./, '') === domain; } catch { return false; } });
    return { linkId: link?.id || domain, title: link?.title || domain || '未知站点', url: link?.url || (domain ? `https://${domain}` : ''), domain, count: count(row), percentage: totalVisits ? Math.round(count(row) / totalVisits * 100) : 0 };
  });
  const hourlyCounts = Array.from({ length: 24 }, (_, hour) => count(hours.rows.find(row => row.hour === hour)));
  const maxHour = Math.max(...hourlyCounts, 1);
  const hourlyStats = hourlyCounts.map((value, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count: value, percentage: Math.round(value / maxHour * 100) }));
  const peak = hourlyStats.reduce((best, item) => item.count > best.count ? item : best, hourlyStats[0]);
  const engineStats = engines.rows.map(row => ({ engineId: String(row.engineId ?? ''), engineName: engineList.find(engine => engine.id === row.engineId)?.name || String(row.engineId ?? '未知引擎'), count: count(row), percentage: totalSearches ? Math.round(count(row) / totalSearches * 100) : 0 }));
  if (engines.truncated) {
    const other = Math.max(0, totalSearches - engineStats.reduce((sum, item) => sum + item.count, 0));
    engineStats.push({ engineId: '__other', engineName: '其他', count: other, percentage: totalSearches ? Math.round(other / totalSearches * 100) : 0 });
  }
  return {
    totalVisits, totalSearches, uniqueDomains: count(visits.rows[0], 'unique'), uniqueQueries: count(searches.rows[0], 'unique'), topLinks, allRankedLinks: topLinks, hourlyStats,
    peakHour: { hour: peak.hour, count: peak.count, label: `${peak.label} - ${String(peak.hour + 1).padStart(2, '0')}:00` },
    topQueries: queries.rows.map(row => ({ query: typeof row.query === 'string' ? row.query : '未知查询', count: count(row) })),
    engineStats, recentSearches: [] as SearchRecord[],
  };
}