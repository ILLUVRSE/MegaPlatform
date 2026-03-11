import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parsePagination } from '../utils/pagination';

const sourceSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  rssUrl: z.string().url(),
  category: z.enum(['global', 'vertical', 'local']),
  region: z.string().optional(),
  active: z.boolean().default(true),
  parserVersion: z.number().int().default(1)
});

const eventSchema = z.object({
  type: z.string().min(1),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const headerToken = request.headers['x-admin-token'];
    const providedToken =
      (typeof headerToken === 'string' ? headerToken : undefined) ??
      ((request.query as { token?: string } | undefined)?.token ?? undefined);
    const expectedToken = process.env.ADMIN_TOKEN ?? 'dev-admin-token';

    if (!providedToken || providedToken !== expectedToken) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  const showTypeSchema = z.enum([
    'daily_global',
    'daily_vertical',
    'daily_local',
    'deep_dive',
    'weekly_global',
    'weekly_vertical',
    'weekly_local'
  ]);
  const taskStatusSchema = z.enum(['open', 'in_progress', 'done']);
  fastify.get('/admin/logs', async (request) => {
    const { limit: rawLimit, offset: rawOffset } = request.query as { limit?: string; offset?: string };
    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 100, maxLimit: 200 }
    );
    return fastify.prisma.pipelineLog.findMany({ take: limit, skip: offset, orderBy: { createdAt: 'desc' } });
  });

  fastify.get('/admin/dead-letters', async (request) => {
    const { limit: rawLimit, offset: rawOffset } = request.query as { limit?: string; offset?: string };
    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 50, maxLimit: 200 }
    );
    const end = offset + limit - 1;
    const jobs = await fastify.queues.dead_letter_queue.getJobs(
      ['waiting', 'active', 'delayed', 'failed', 'completed'],
      offset,
      end,
      true
    );
    return jobs.map((job) => ({
      id: String(job.id),
      name: job.name,
      timestamp: job.timestamp,
      failedReason: job.failedReason ?? null,
      data: job.data
    }));
  });

  fastify.get('/admin/sources', async (request) => {
    const { limit: rawLimit, offset: rawOffset } = request.query as { limit?: string; offset?: string };
    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 100, maxLimit: 200 }
    );
    return fastify.prisma.source.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset, include: { metrics: true } });
  });

  fastify.post('/admin/source', async (request, reply) => {
    const parsed = sourceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid source payload' });
    }
    const payload = parsed.data;
    return fastify.prisma.source.upsert({
      where: { rssUrl: payload.rssUrl },
      update: payload,
      create: payload
    });
  });

  fastify.post('/analytics/event', async (request, reply) => {
    const parsed = eventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid analytics payload' });
    }
    const payload = parsed.data;
    return fastify.prisma.analyticsEvent.create({
      data: {
        type: payload.type,
        metadata: payload.metadata
      }
    });
  });

  fastify.get('/admin/dashboard', async () => {
    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const dailyActiveUsers = await fastify.prisma.userInteraction.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: oneDayAgo } }
    });

    const topClusters = await fastify.prisma.cluster.findMany({ orderBy: { globalScore: 'desc' }, take: 10, select: { id: true, title: true, globalScore: true } });
    const topEpisodes = await fastify.prisma.episode.findMany({ orderBy: { publishedAt: 'desc' }, take: 10, select: { id: true, title: true, publishedAt: true } });

    const interactions = await fastify.prisma.userInteraction.count({ where: { createdAt: { gte: oneDayAgo } } });
    const completions = await fastify.prisma.analyticsEvent.count({
      where: { type: 'episode_completion', createdAt: { gte: oneDayAgo } }
    });

    return {
      dailyActiveUsers: dailyActiveUsers.length,
      engagementRate: interactions === 0 ? 0 : Number((completions / interactions).toFixed(4)),
      topClusters,
      topEpisodes
    };
  });

  fastify.get('/admin/costs', async () => {
    const usage = await fastify.prisma.tokenUsageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    const totalCost = usage.reduce((sum, row) => sum + row.costEstimate, 0);
    const stageBreakdown = usage.reduce<Record<string, { tokens: number; cost: number; calls: number }>>((acc, row) => {
      const current = acc[row.pipelineStage] ?? { tokens: 0, cost: 0, calls: 0 };
      current.tokens += row.tokensUsed;
      current.cost += row.costEstimate;
      current.calls += 1;
      acc[row.pipelineStage] = current;
      return acc;
    }, {});

    const lifetime = await fastify.prisma.tokenUsageLog.aggregate({
      _sum: { costEstimate: true, tokensUsed: true },
      _count: true
    });

    return {
      totalCost: Number(totalCost.toFixed(4)),
      usage,
      window: {
        entries: usage.length,
        totalTokens: usage.reduce((sum, row) => sum + row.tokensUsed, 0),
        totalCost: Number(totalCost.toFixed(4)),
        stageBreakdown: Object.entries(stageBreakdown)
          .map(([pipelineStage, value]) => ({
            pipelineStage,
            calls: value.calls,
            tokensUsed: value.tokens,
            totalCost: Number(value.cost.toFixed(4))
          }))
          .sort((a, b) => b.totalCost - a.totalCost)
      },
      lifetime: {
        entries: lifetime._count,
        totalTokens: lifetime._sum.tokensUsed ?? 0,
        totalCost: Number((lifetime._sum.costEstimate ?? 0).toFixed(4))
      }
    };
  });

  fastify.get('/admin/tasks', async (request, reply) => {
    const { limit: rawLimit, offset: rawOffset, status } = request.query as { limit?: string; offset?: string; status?: string };
    const parsedStatus = status ? taskStatusSchema.safeParse(status) : null;
    if (parsedStatus && !parsedStatus.success) {
      return reply.code(400).send({ message: 'Invalid task status' });
    }
    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 100, maxLimit: 200 }
    );
    return fastify.prisma.taskCard.findMany({
      where: parsedStatus?.success ? { status: parsedStatus.data } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  });

  fastify.post('/admin/tasks', async (request) => {
    const body = request.body as { title?: string; description?: string };
    if (!body.title || !body.description) {
      return { ok: false, message: 'title and description are required' };
    }

    return fastify.prisma.taskCard.create({
      data: {
        title: body.title,
        description: body.description,
        autoGenerated: false
      }
    });
  });

  fastify.post('/admin/reingest', async () => {
    const sources = await fastify.prisma.source.findMany({ where: { active: true } });
    await Promise.all(
      sources.map((source) =>
        fastify.queues.ingest_queue.add('ingest-source', {
          sourceId: source.id,
          rssUrl: source.rssUrl
        })
      )
    );

    return { ok: true, enqueued: sources.length };
  });

  fastify.post('/admin/recluster', async () => {
    const articles = await fastify.prisma.article.findMany({ where: { contentHash: { not: null } }, take: 500 });
    await Promise.all(articles.map((article) => fastify.queues.dedup_cluster_queue.add('dedup-article', { articleId: article.id })));
    return { ok: true, enqueued: articles.length };
  });

  fastify.post('/admin/resummarize', async () => {
    const clusters = await fastify.prisma.cluster.findMany({ take: 500 });
    await Promise.all(clusters.map((cluster) => fastify.queues.summarize_cluster_queue.add('summarize-cluster', { clusterId: cluster.id })));
    return { ok: true, enqueued: clusters.length };
  });

  fastify.post('/admin/generate-podcast/:showType', async (request) => {
    const params = request.params as { showType: string };
    const showType = showTypeSchema.parse(params.showType);
    await fastify.queues.podcast_script_queue.add('script', { showType });
    return { ok: true, showType };
  });

  fastify.post('/admin/nightly/source-reputation', async () => {
    await fastify.queues.source_reputation_queue.add('nightly-source-reputation', {});
    return { ok: true };
  });

  fastify.post('/admin/nightly/personalization', async () => {
    await fastify.queues.personalization_queue.add('nightly-personalization', {});
    return { ok: true };
  });

  fastify.post('/admin/experiments/evaluate', async () => {
    await fastify.queues.experiment_evaluation_queue.add('evaluate-experiments', {});
    return { ok: true };
  });

  fastify.post('/admin/weekly-digest', async () => {
    await fastify.queues.weekly_digest_queue.add('weekly-digest', {});
    return { ok: true };
  });

  fastify.post('/admin/trigger/:queue', async (request, reply) => {
    const { queue } = request.params as { queue: keyof typeof fastify.queues };
    if (!(queue in fastify.queues)) {
      return reply.code(400).send({ message: 'Unknown queue' });
    }

    await fastify.queues[queue].add('manual-trigger', { initiatedBy: 'admin', at: new Date().toISOString() });
    return { ok: true, queue };
  });
};
