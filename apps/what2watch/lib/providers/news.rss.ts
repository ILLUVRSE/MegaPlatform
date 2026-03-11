import { TitleType } from '@prisma/client';
import { NewsHeadline, NewsProvider } from '@/lib/providers/contracts';

const FEEDS = [
  { source: 'Variety', url: 'https://variety.com/v/film/feed/' },
  { source: 'The Hollywood Reporter', url: 'https://www.hollywoodreporter.com/t/movies/movie-news/feed/' }
];

function parseItems(xml: string, query: string, source: string): NewsHeadline[] {
  const items = xml.split('<item>').slice(1, 12);
  const lower = query.toLowerCase();
  const out: NewsHeadline[] = [];

  for (const item of items) {
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '').trim();
    const link = (item.match(/<link>(.*?)<\/link>/)?.[1] || '').trim();
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim();
    if (!title || !link) continue;
    if (title.toLowerCase().includes(lower)) {
      out.push({ title, source, url: link, publishedAt: new Date(pubDate || Date.now()).toISOString() });
    }
  }

  return out;
}

class RssNewsProvider implements NewsProvider {
  async getHeadlines(_tmdbId: number, _type: TitleType, name: string): Promise<NewsHeadline[]> {
    const headlines: NewsHeadline[] = [];

    await Promise.all(
      FEEDS.map(async (feed) => {
        try {
          const res = await fetch(feed.url, { next: { revalidate: 1800 } });
          if (!res.ok) return;
          const xml = await res.text();
          headlines.push(...parseItems(xml, name, feed.source));
        } catch {
          // ignore feed failures
        }
      })
    );

    return headlines.slice(0, 8);
  }
}

export const rssNewsProvider = new RssNewsProvider();
