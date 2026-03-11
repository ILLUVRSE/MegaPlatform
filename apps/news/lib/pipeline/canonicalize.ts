import crypto from 'crypto';

export function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.searchParams.sort();
  const removable = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  for (const key of removable) {
    parsed.searchParams.delete(key);
  }
  if (parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }
  return parsed.toString();
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .toLowerCase();
}

export function contentHashFromText(text: string): string {
  return crypto.createHash('sha256').update(cleanText(text)).digest('hex');
}
