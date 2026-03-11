import { FastifyPluginAsync } from 'fastify';
import { getCacheStats } from '../../../lib/ranking/cache';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    const checkedAt = new Date().toISOString();
    const uptimeSeconds = Math.floor(process.uptime());

    const checks = {
      database: 'unconfigured' as 'up' | 'down' | 'unconfigured',
      queues: 'unconfigured' as 'up' | 'down' | 'unconfigured'
    };

    const queueBacklog = {
      waiting: 0,
      active: 0,
      delayed: 0,
      failed: 0
    };

    if (fastify.hasDecorator('prisma')) {
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        checks.database = 'up';
      } catch {
        checks.database = 'down';
      }
    }

    if (fastify.hasDecorator('queues')) {
      try {
        const counts = await Promise.all(
          Object.values(fastify.queues).map((queue) =>
            queue.getJobCounts('waiting', 'active', 'delayed', 'failed')
          )
        );
        for (const count of counts) {
          queueBacklog.waiting += count.waiting ?? 0;
          queueBacklog.active += count.active ?? 0;
          queueBacklog.delayed += count.delayed ?? 0;
          queueBacklog.failed += count.failed ?? 0;
        }
        checks.queues = 'up';
      } catch {
        checks.queues = 'down';
      }
    }

    const ok = checks.database !== 'down' && checks.queues !== 'down';
    return reply.code(ok ? 200 : 503).send({
      ok,
      service: 'illuvrse-api',
      checkedAt,
      uptimeSeconds,
      checks,
      queueBacklog
    });
  });

  fastify.get('/metrics', async () => {
    const memory = process.memoryUsage();
    return {
      service: 'illuvrse-api',
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
        heapTotalBytes: memory.heapTotal,
        externalBytes: memory.external
      },
      rankingCache: getCacheStats()
    };
  });
};
