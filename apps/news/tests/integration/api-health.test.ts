import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { healthRoutes } from '../../api/src/routes/health';

describe('api health route', () => {
  it('responds with healthy status when dependencies are unconfigured', async () => {
    const app = Fastify();
    await app.register(healthRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: 'illuvrse-api',
      checks: { database: 'unconfigured', queues: 'unconfigured' }
    });

    await app.close();
  });

  it('returns 503 when database health check fails', async () => {
    const app = Fastify();
    app.decorate('prisma', {
      $queryRaw: async () => {
        throw new Error('db down');
      }
    } as any);

    await app.register(healthRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health'
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      ok: false,
      checks: { database: 'down', queues: 'unconfigured' }
    });

    await app.close();
  });

  it('aggregates queue backlog when queues are configured', async () => {
    const app = Fastify();
    app.decorate('queues', {
      ingest_queue: { getJobCounts: async () => ({ waiting: 2, active: 1, delayed: 0, failed: 0 }) },
      canonicalize_queue: { getJobCounts: async () => ({ waiting: 1, active: 0, delayed: 3, failed: 1 }) },
      dedup_cluster_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      summarize_cluster_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      evaluation_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      rank_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      source_reputation_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      personalization_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      experiment_evaluation_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      podcast_script_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      tts_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      rss_publish_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) },
      weekly_digest_queue: { getJobCounts: async () => ({ waiting: 0, active: 0, delayed: 0, failed: 0 }) }
    } as any);

    await app.register(healthRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/health'
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      checks: { database: 'unconfigured', queues: 'up' },
      queueBacklog: { waiting: 3, active: 1, delayed: 3, failed: 1 }
    });

    await app.close();
  });

  it('exposes process and cache metrics', async () => {
    const app = Fastify();
    await app.register(healthRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/metrics'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      service: 'illuvrse-api',
      memory: {
        rssBytes: expect.any(Number),
        heapUsedBytes: expect.any(Number),
        heapTotalBytes: expect.any(Number),
        externalBytes: expect.any(Number)
      },
      rankingCache: {
        size: expect.any(Number),
        hits: expect.any(Number),
        misses: expect.any(Number),
        writes: expect.any(Number),
        evictions: expect.any(Number),
        hitRate: expect.any(Number)
      }
    });

    await app.close();
  });
});
