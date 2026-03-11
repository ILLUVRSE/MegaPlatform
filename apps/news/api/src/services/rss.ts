import Parser from 'rss-parser';

const parser = new Parser();

export interface ParsedArticle {
  title: string;
  author?: string;
  url: string;
  publishedAt: Date;
}

export async function fetchRssArticles(rssUrl: string): Promise<ParsedArticle[]> {
  const feed = await parser.parseURL(rssUrl);
  return (feed.items ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      title: item.title ?? 'Untitled',
      author: item.creator,
      url: item.link ?? '',
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date()
    }));
}
