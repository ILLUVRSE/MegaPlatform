import { FastifyPluginAsync } from 'fastify';
import { cosineSimilarity, embedTextStub } from '../../../lib/search/semantic';
import { parsePagination } from '../utils/pagination';
import { rankKeywordResults, tokenizeQuery } from '../../../lib/search/keyword';
import { consumeRateLimit } from '../utils/rateLimit';
import { getQueryCache, setQueryCache } from '../../../lib/search/queryCache';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const decision = consumeRateLimit(
      `search:${request.ip}`,
      Number(process.env.SEARCH_RATE_LIMIT_PER_MINUTE ?? 120),
      60_000
    );
    if (!decision.allowed) {
      return reply
        .code(429)
        .header('x-ratelimit-remaining', String(decision.remaining))
        .header('x-ratelimit-reset', String(decision.resetInSeconds))
        .send({ message: 'Rate limit exceeded' });
    }
  });

  fastify.get('/search', async (request) => {
    const { q, limit: rawLimit, offset: rawOffset } = request.query as { q?: string; limit?: string; offset?: string };
    if (!q) {
      return [];
    }
    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 20, maxLimit: 100 }
    );
    const terms = tokenizeQuery(q);
    if (terms.length === 0) {
      return [];
    }

    const candidates = await fastify.prisma.cluster.findMany({
      where: {
        OR: terms.map((term) => ({ title: { contains: term, mode: 'insensitive' } }))
      },
      select: {
        id: true,
        title: true,
        summaryBullets: true,
        whyItMatters: true,
        localAngle: true,
        verticalAngle: true,
        storyVector: true,
        citations: true,
        builderTakeaway: true,
        monetizationImpact: true,
        platformImplications: true,
        globalScore: true,
        verticalScore: true,
        localScore: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 300
    });

    const ranked = rankKeywordResults(
      q,
      candidates.map((cluster) => ({
        id: cluster.id,
        title: cluster.title,
        globalScore: cluster.globalScore,
        updatedAt: cluster.updatedAt
      }))
    );

    const rankById = new Map(ranked.map((item, index) => [item.id, { rank: index, searchScore: item.searchScore }]));

    return candidates
      .map((cluster) => ({ ...cluster, searchScore: rankById.get(cluster.id)?.searchScore ?? 0, rank: rankById.get(cluster.id)?.rank ?? Number.MAX_SAFE_INTEGER }))
      .sort((a, b) => a.rank - b.rank)
      .slice(offset, offset + limit)
      .map(({ rank, ...cluster }) => cluster);
  });

  fastify.get('/search/semantic', async (request) => {
    const { q, limit: rawLimit } = request.query as { q?: string; limit?: string };
    if (!q) {
      return [];
    }
    const { limit } = parsePagination(
      { limit: rawLimit },
      { defaultLimit: 20, maxLimit: 50 }
    );

    const cacheKey = `semantic:${q.toLowerCase()}:${limit}`;
    const cached = getQueryCache<
      Array<{ id: string; title: string; summaryBullets: unknown; similarity: number }>
    >(cacheKey);
    if (cached) {
      return cached;
    }

    const queryVector = embedTextStub(q);
    const candidates = await fastify.prisma.cluster.findMany({
      select: { id: true, title: true, summaryBullets: true, storyVector: true },
      take: 250
    });

    const result = candidates
      .map((candidate) => {
        const vector = Array.isArray(candidate.storyVector) ? (candidate.storyVector as number[]) : [];
        return {
          id: candidate.id,
          title: candidate.title,
          summaryBullets: candidate.summaryBullets,
          similarity: cosineSimilarity(queryVector, vector)
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    setQueryCache(cacheKey, result, 15_000);
    return result;
  });
};
