import { TitleType } from '@prisma/client';
import { NewsHeadline, NewsProvider } from '@/lib/providers/contracts';

class StubNewsProvider implements NewsProvider {
  async getHeadlines(tmdbId: number, type: TitleType, name: string): Promise<NewsHeadline[]> {
    const today = new Date();
    return [
      {
        title: `${name} climbs streaming charts this week`,
        source: 'What2Watch Wire',
        url: `https://example.com/news/${type}/${tmdbId}/charts`,
        publishedAt: today.toISOString()
      },
      {
        title: `Why audiences keep recommending ${name}`,
        source: 'Screen Pulse',
        url: `https://example.com/news/${type}/${tmdbId}/recommendations`,
        publishedAt: new Date(today.getTime() - 86400000).toISOString()
      },
      {
        title: `${name} sparks social buzz`,
        source: 'MediaBeat',
        url: `https://example.com/news/${type}/${tmdbId}/buzz`,
        publishedAt: new Date(today.getTime() - 2 * 86400000).toISOString()
      }
    ];
  }
}

export const stubNewsProvider = new StubNewsProvider();
