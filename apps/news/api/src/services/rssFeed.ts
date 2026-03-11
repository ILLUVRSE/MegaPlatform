import { ShowType } from '@prisma/client';

export interface FeedEpisode {
  title: string;
  description: string;
  audioUrl: string;
  rssGuid: string;
  publishedAt: Date;
  durationSeconds: number;
}

export function buildPodcastRss(showType: ShowType, episodes: FeedEpisode[]): string {
  const titleMap: Record<ShowType, string> = {
    daily_global: 'ILLUVRSE Global Brief',
    daily_vertical: 'ILLUVRSE Daily Brief',
    daily_local: 'ILLUVRSE Chicago Brief',
    deep_dive: 'ILLUVRSE Weekly Deep Dive',
    weekly_global: 'ILLUVRSE Weekly Global Brief',
    weekly_vertical: 'ILLUVRSE Weekly Industry Report',
    weekly_local: 'ILLUVRSE Weekly Chicago Digest'
  };

  const showTitle = titleMap[showType];
  const items = episodes
    .map(
      (episode) => `<item>
<title>${escapeXml(episode.title)}</title>
<description>${escapeXml(episode.description)}</description>
<guid isPermaLink="false">${escapeXml(episode.rssGuid)}</guid>
<pubDate>${episode.publishedAt.toUTCString()}</pubDate>
<enclosure url="${escapeXml(episode.audioUrl)}" length="${episode.durationSeconds}" type="audio/mpeg" />
</item>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
<channel>
<title>${showTitle}</title>
<link>https://illuvrse.news/podcast/${showType}</link>
<description>${showTitle} podcast feed</description>
<itunes:author>ILLUVRSE News</itunes:author>
<itunes:image href="https://illuvrse.news/podcast-artwork.jpg" />
${items}
</channel>
</rss>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
