import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { adminRoutes } from '../../api/src/routes/admin';

describe('admin route auth', () => {
  it('rejects requests without admin token', async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    const app = Fastify();
    app.decorate('prisma', {
      pipelineLog: {
        findMany: async () => []
      }
    } as any);

    await app.register(adminRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/logs'
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: 'Unauthorized' });
    await app.close();
  });

  it('allows requests with token query param', async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    const app = Fastify();
    app.decorate('prisma', {
      pipelineLog: {
        findMany: async () => [{ id: 'log-1' }]
      },
      tokenUsageLog: {
        findMany: async () => [],
        aggregate: async () => ({ _sum: { costEstimate: 0, tokensUsed: 0 }, _count: 0 })
      }
    } as any);

    await app.register(adminRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/logs?token=secret-token'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([{ id: 'log-1' }]);
    await app.close();
  });

  it('returns cost window and lifetime breakdown with valid token', async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    const app = Fastify();
    app.decorate('prisma', {
      pipelineLog: {
        findMany: async () => []
      },
      tokenUsageLog: {
        findMany: async () => [
          { pipelineStage: 'summarize_cluster_queue', tokensUsed: 100, costEstimate: 0.12 },
          { pipelineStage: 'summarize_cluster_queue', tokensUsed: 50, costEstimate: 0.06 },
          { pipelineStage: 'podcast_script_queue', tokensUsed: 200, costEstimate: 0.2 }
        ],
        aggregate: async () => ({ _sum: { costEstimate: 1.5, tokensUsed: 3000 }, _count: 42 })
      }
    } as any);

    await app.register(adminRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/costs?token=secret-token'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      totalCost: 0.38,
      window: {
        entries: 3,
        totalTokens: 350
      },
      lifetime: {
        entries: 42,
        totalTokens: 3000,
        totalCost: 1.5
      }
    });

    await app.close();
  });

  it('returns 400 for invalid admin source payload', async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    const app = Fastify();
    app.decorate('prisma', {
      source: {
        upsert: async () => ({})
      }
    } as any);

    await app.register(adminRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/source?token=secret-token',
      payload: { name: '', rssUrl: 'not-a-url' }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid source payload' });
    await app.close();
  });

  it('returns 400 for invalid task status filter', async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    const app = Fastify();
    app.decorate('prisma', {
      taskCard: {
        findMany: async () => []
      }
    } as any);

    await app.register(adminRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/tasks?token=secret-token&status=closed'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid task status' });
    await app.close();
  });

  it('returns dead-letter job summaries for authorized admin', async () => {
    process.env.ADMIN_TOKEN = 'secret-token';
    const app = Fastify();
    app.decorate('queues', {
      dead_letter_queue: {
        getJobs: async () => [
          {
            id: 'dlq-1',
            name: 'worker-failure',
            timestamp: 1_710_000_000_000,
            failedReason: null,
            data: { workerName: 'ingest_queue' }
          }
        ]
      }
    } as any);

    await app.register(adminRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/dead-letters?token=secret-token&limit=1&offset=0'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: 'dlq-1',
        name: 'worker-failure',
        timestamp: 1_710_000_000_000,
        failedReason: null,
        data: { workerName: 'ingest_queue' }
      }
    ]);
    await app.close();
  });
});
