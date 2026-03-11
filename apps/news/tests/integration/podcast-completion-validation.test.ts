import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { podcastRoutes } from '../../api/src/routes/podcast';

describe('podcast completion validation', () => {
  it('clamps completion to valid percentage range', async () => {
    const writes: unknown[] = [];
    const app = Fastify();
    app.decorate('prisma', {
      episode: {
        findMany: async () => []
      },
      analyticsEvent: {
        create: async (payload: unknown) => {
          writes.push(payload);
          return payload;
        }
      }
    } as any);

    await app.register(podcastRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/podcast/ep-1/complete',
      payload: { completionPercent: 240 }
    });

    expect(response.statusCode).toBe(200);
    expect(writes[0]).toMatchObject({
      data: { metadata: { episodeId: 'ep-1', completionPercent: 100 } }
    });
    await app.close();
  });

  it('rejects invalid completion payloads', async () => {
    const app = Fastify();
    app.decorate('prisma', {
      episode: {
        findMany: async () => []
      },
      analyticsEvent: {
        create: async () => ({})
      }
    } as any);

    await app.register(podcastRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/podcast/ep-1/complete',
      payload: { completionPercent: 'oops' }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid completion payload' });
    await app.close();
  });

  it('rejects invalid rss channel', async () => {
    const app = Fastify();
    app.decorate('prisma', {
      episode: {
        findMany: async () => []
      },
      analyticsEvent: {
        create: async () => ({})
      }
    } as any);

    await app.register(podcastRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/rss/unknown.xml'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid rss channel' });
    await app.close();
  });
});
