import type { FaviconProvider } from '../types/navigation';

const PRESERVED_URL_SCHEMES = new Set([
  'http',
  'https',
  'ftp',
  'file',
  'mailto',
  'tel',
  'about',
  'edge',
  'chrome',
  'brave',
  'opera',
  'vivaldi',
  'view-source',
  'chrome-extension',
  'edge-extension',
  'moz-extension',
]);
const BROWSER_INTERNAL_SCHEMES = new Set([
  'about',
  'edge',
  'chrome',
  'brave',
  'opera',
  'vivaldi',
  'view-source',
  'chrome-extension',
  'edge-extension',
  'moz-extension',
]);

export function isBrowserInternalUrl(input: string): boolean {
  const schemeMatch = input.trim().match(/^([a-z][a-z\d+.-]*):/i);
  return Boolean(schemeMatch && BROWSER_INTERNAL_SCHEMES.has(schemeMatch[1].toLowerCase()));
}

export function formatUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const schemeMatch = trimmed.match(/^([a-z][a-z\d+.-]*):/i);
  if (schemeMatch && PRESERVED_URL_SCHEMES.has(schemeMatch[1].toLowerCase())) {
    return trimmed;
  }

  return 'https://' + trimmed;
}

export function getDomain(url: string): string {
  try {
    const formatted = formatUrl(url);
    const parsed = new URL(formatted);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getFaviconUrl(
  url: string,
  customIcon?: string,
  provider: FaviconProvider = 'icon-horse'
): string {
  if (customIcon && customIcon.trim()) {
    return customIcon.trim();
  }
  if (provider === 'default') return '';

  try {
    const parsed = new URL(formatUrl(url));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    const domain = parsed.hostname.replace(/^www\./, '');
    switch (provider) {
      case 'google':
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
      case 'origin':
        return new URL('/favicon.ico', parsed.origin).href;
      default:
        return `https://icon.horse/icon/${encodeURIComponent(domain)}`;
    }
  } catch {
    return '';
  }
}

// Generate consistent pleasing color for fallback icons based on link title
export function getInitialColor(str: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-blue-500/15', text: 'text-blue-400' },
    { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
    { bg: 'bg-violet-500/15', text: 'text-violet-400' },
    { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    { bg: 'bg-rose-500/15', text: 'text-rose-400' },
    { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
    { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
    { bg: 'bg-teal-500/15', text: 'text-teal-400' },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
