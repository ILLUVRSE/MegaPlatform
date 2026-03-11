import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import { buildPodcastRss } from '../../api/src/services/rssFeed';

describe('rss xml feed', () => {
  it('creates valid podcast rss with enclosure', () => {
    const xml = buildPodcastRss('daily_global', [
      {
        title: 'Episode 1',
        description: 'Desc',
        audioUrl: 'https://cdn.example.com/1.mp3',
        rssGuid: 'guid-1',
        publishedAt: new Date('2026-03-01T00:00:00Z'),
        durationSeconds: 120
      }
    ]);

    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    expect(parsed.rss.channel.item.enclosure['@_type']).toBe('audio/mpeg');
    expect(parsed.rss.channel.item.guid['#text'] ?? parsed.rss.channel.item.guid).toContain('guid-1');
  });
});
