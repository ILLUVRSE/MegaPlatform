import { FastifyPluginAsync } from 'fastify';
import { getGlobalTopClusters, getLocalTopClusters, getVerticalTopClusters } from '../../../lib/ranking/queries';
import { parsePagination } from '../utils/pagination';
import { rankRelatedStories } from '../../../lib/search/related';

export const clusterRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/clusters', async (request) => {
    const query = request.query as {
      type?: 'global' | 'vertical' | 'local';
      limit?: string;
      offset?: string;
    };
    const { limit, offset } = parsePagination(query, { defaultLimit: 25, maxLimit: 100 });

    if (query.type === 'vertical') {
      return getVerticalTopClusters(fastify.prisma, limit, offset);
    }
    if (query.type === 'local') {
      return getLocalTopClusters(fastify.prisma, limit, offset);
    }
    return getGlobalTopClusters(fastify.prisma, limit, offset);
  });

  fastify.get('/clusters/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cluster = await fastify.prisma.cluster.findUnique({
      where: { id },
      include: {
        articles: {
          include: {
            article: true
          }
        }
      }
    });

    if (!cluster) {
      return reply.code(404).send({ message: 'Cluster not found' });
    }

    await fastify.prisma.analyticsEvent.create({
      data: {
        type: 'cluster_view',
        metadata: { clusterId: id }
      }
    });

    return cluster;
  });

  fastify.get('/clusters/:id/related', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string };
    const { limit } = parsePagination(query, { defaultLimit: 8, maxLimit: 25 });

    const cluster = await fastify.prisma.cluster.findUnique({ where: { id }, select: { storyVector: true } });
    if (!cluster || !Array.isArray(cluster.storyVector)) {
      return [];
    }

    const all = await fastify.prisma.cluster.findMany({
      where: { id: { not: id } },
      select: { id: true, title: true, storyVector: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 200
    });

    const vector = cluster.storyVector as number[];
    return rankRelatedStories(
      vector,
      all.map((item) => ({
        id: item.id,
        title: item.title,
        storyVector: Array.isArray(item.storyVector) ? (item.storyVector as number[]) : [],
        updatedAt: item.updatedAt
      })),
      limit
    );
  });
};
