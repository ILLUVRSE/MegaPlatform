import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { clusterRoutes } from '../../api/src/routes/clusters';

describe('cluster route query validation', () => {
  it('falls back to safe pagination defaults for invalid values', async () => {
    const calls: Array<{ take: number; skip: number }> = [];
    const app = Fastify();

    app.decorate('prisma', {
      cluster: {
        findMany: async (args: { take: number; skip: number }) => {
          calls.push({ take: args.take, skip: args.skip });
          return [];
        },
        findUnique: async () => null
      },
      analyticsEvent: {
        create: async () => ({})
      }
    } as any);

    await app.register(clusterRoutes, { prefix: '/api' });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/api/clusters?type=global&limit=nope&offset=-44'
    });

    expect(response.statusCode).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ take: 25, skip: 0 });

    await app.close();
  });
});
