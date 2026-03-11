import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { searchRoutes } from '../../api/src/routes/search';
import { clearRateLimitState } from '../../api/src/utils/rateLimit';

describe('search rate limiting', () => {
  it('returns 429 after per-minute limit is exceeded', async () => {
    clearRateLimitState();
    const previous = process.env.SEARCH_RATE_LIMIT_PER_MINUTE;
    process.env.SEARCH_RATE_LIMIT_PER_MINUTE = '1';

    const app = Fastify();
    app.decorate('prisma', {
      cluster: {
        findMany: async () => []
      }
    } as any);

    await app.register(searchRoutes, { prefix: '/api' });
    await app.ready();

    const first = await app.inject({
      method: 'GET',
      url: '/api/search?q=gaming'
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: 'GET',
      url: '/api/search?q=gaming'
    });
    expect(second.statusCode).toBe(429);
    expect(second.json()).toEqual({ message: 'Rate limit exceeded' });

    await app.close();
    process.env.SEARCH_RATE_LIMIT_PER_MINUTE = previous;
  });
});
