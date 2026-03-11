import { PrismaClient, SourceCategory } from '@prisma/client';

const prisma = new PrismaClient();

const makeSources = (count: number, category: SourceCategory, prefix: string, region?: string) =>
  Array.from({ length: count }, (_, idx) => {
    const n = idx + 1;
    return {
      name: `${prefix} Source ${n}`,
      baseUrl: `https://${prefix.toLowerCase()}${n}.example.com`,
      rssUrl: `https://${prefix.toLowerCase()}${n}.example.com/rss.xml`,
      category,
      region,
      active: true,
      parserVersion: 1
    };
  });

async function main() {
  const sources = [
    ...makeSources(30, 'global', 'Global'),
    ...makeSources(40, 'vertical', 'Vertical'),
    ...makeSources(20, 'local', 'Chicago', 'US-IL')
  ];

  await prisma.source.createMany({ data: sources, skipDuplicates: true });

  const allSources = await prisma.source.findMany({ select: { id: true } });
  await prisma.sourceMetrics.createMany({
    data: allSources.map((source) => ({
      sourceId: source.id,
      accuracyScore: 0.7,
      recencyScore: 0.7,
      diversityScore: 0.7,
      biasScore: 0.5,
      lastEvaluatedAt: new Date()
    })),
    skipDuplicates: true
  });

  await prisma.podcastTemplate.createMany({
    data: [
      { name: 'solo-brief', structure: { segments: ['intro', 'stories', 'outro'] } },
      { name: 'debate-duo', structure: { segments: ['intro', 'debate', 'fact-check', 'outro'] } },
      { name: 'analyst-deep-dive', structure: { segments: ['intro', 'context', 'analysis', 'outro'] } },
      { name: 'rapid-fire', structure: { segments: ['sting', 'headlines', 'signoff'] } }
    ],
    skipDuplicates: true
  });

  await prisma.podcastVoice.createMany({
    data: [
      { voiceName: 'Narrator One', style: 'solo' },
      { voiceName: 'Host Alpha', style: 'debate' },
      { voiceName: 'Host Beta', style: 'debate' },
      { voiceName: 'Analyst Prime', style: 'analyst' }
    ],
    skipDuplicates: true
  });

  await prisma.experiment.createMany({
    data: [
      {
        name: 'ranking-weight-v1',
        variantA: { recency: 0.5, diversity: 0.3, count: 0.2 },
        variantB: { recency: 0.45, diversity: 0.35, count: 0.2 },
        metric: 'ctr',
        active: true
      },
      {
        name: 'podcast-intro-style',
        variantA: { tone: 'direct' },
        variantB: { tone: 'narrative' },
        metric: 'episode_completion',
        active: true
      }
    ],
    skipDuplicates: true
  });

  await prisma.user.createMany({
    data: [
      { email: 'demo+1@illuvrse.news', preferences: { categories: ['vertical'] } },
      { email: 'demo+2@illuvrse.news', preferences: { categories: ['global', 'local'] } }
    ],
    skipDuplicates: true
  });

  console.log(`Seeded ${sources.length} sources and expansion registries`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
