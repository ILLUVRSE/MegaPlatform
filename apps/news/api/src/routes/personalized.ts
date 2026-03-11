import { FastifyPluginAsync } from 'fastify';
import { personalizationMultiplier } from '../../../lib/personalization/interestVector';
import { parsePagination } from '../utils/pagination';

export const personalizedRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/personalized', async (request) => {
    const { userId, limit: rawLimit, offset: rawOffset } = request.query as {
      userId?: string;
      limit?: string;
      offset?: string;
    };
    if (!userId) {
      return { message: 'userId is required', items: [] };
    }

    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 20, maxLimit: 100 }
    );

    const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { message: 'user not found', items: [] };
    }

    const vectorRaw = user.interestVector;
    const vector =
      typeof vectorRaw === 'object' && vectorRaw
        ? (vectorRaw as Record<'global' | 'vertical' | 'local', number>)
        : { global: 0, vertical: 0, local: 0 };

    const clusters = await fastify.prisma.cluster.findMany({
      orderBy: { globalScore: 'desc' },
      take: limit,
      skip: offset
    });

    const items = clusters
      .map((cluster) => {
        const category: 'global' | 'vertical' | 'local' =
          cluster.verticalScore >= cluster.globalScore && cluster.verticalScore >= cluster.localScore
            ? 'vertical'
            : cluster.localScore >= cluster.globalScore
              ? 'local'
              : 'global';
        const multiplier = personalizationMultiplier(vector, category);
        const score = Number((cluster.globalScore * multiplier).toFixed(4));
        return { ...cluster, personalizedScore: score };
      })
      .sort((a, b) => b.personalizedScore - a.personalizedScore);

    return { items };
  });
};
