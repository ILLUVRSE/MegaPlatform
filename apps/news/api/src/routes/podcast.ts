import { FastifyPluginAsync } from 'fastify';
import { ShowType } from '@prisma/client';
import { buildPodcastRss } from '../services/rssFeed';
import { parsePagination } from '../utils/pagination';
import { z } from 'zod';

const showTypes: ShowType[] = [
  'daily_global',
  'daily_vertical',
  'daily_local',
  'deep_dive',
  'weekly_global',
  'weekly_vertical',
  'weekly_local'
];

export const podcastRoutes: FastifyPluginAsync = async (fastify) => {
  const completionSchema = z
    .object({
      completionPercent: z.number().finite().optional()
    })
    .default({});
  const channelSchema = z.enum(['global', 'vertical', 'local']);

  fastify.get('/podcast/:showType', async (request, reply) => {
    const { showType } = request.params as { showType: ShowType };
    const { limit: rawLimit, offset: rawOffset } = request.query as { limit?: string; offset?: string };
    if (!showTypes.includes(showType)) {
      return reply.code(400).send({ message: 'Invalid show type' });
    }

    const { limit, offset } = parsePagination(
      { limit: rawLimit, offset: rawOffset },
      { defaultLimit: 50, maxLimit: 100 }
    );

    return fastify.prisma.episode.findMany({
      where: { showType },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset
    });
  });

  fastify.post('/podcast/:episodeId/play', async (request) => {
    const { episodeId } = request.params as { episodeId: string };
    await fastify.prisma.analyticsEvent.create({
      data: { type: 'episode_play', metadata: { episodeId } }
    });
    return { ok: true };
  });

  fastify.post('/podcast/:episodeId/complete', async (request, reply) => {
    const { episodeId } = request.params as { episodeId: string };
    const parsed = completionSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid completion payload' });
    }
    const body = parsed.data;
    const completionPercent = Math.max(0, Math.min(100, body.completionPercent ?? 100));
    await fastify.prisma.analyticsEvent.create({
      data: { type: 'episode_completion', metadata: { episodeId, completionPercent } }
    });
    return { ok: true };
  });

  fastify.get('/rss/:channel.xml', async (request, reply) => {
    const params = request.params as { channel?: string };
    const parsedChannel = channelSchema.safeParse(params.channel);
    if (!parsedChannel.success) {
      return reply.code(400).send({ message: 'Invalid rss channel' });
    }
    const channel = parsedChannel.data;
    const map: Record<typeof channel, ShowType> = {
      global: 'daily_global',
      vertical: 'daily_vertical',
      local: 'daily_local'
    };

    const episodes = await fastify.prisma.episode.findMany({
      where: { showType: map[channel] },
      orderBy: { publishedAt: 'desc' },
      take: 100
    });

    await fastify.prisma.analyticsEvent.create({
      data: {
        type: 'rss_download',
        metadata: { channel }
      }
    });

    const xml = buildPodcastRss(
      map[channel],
      episodes.map((episode) => ({
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
        rssGuid: episode.rssGuid,
        publishedAt: episode.publishedAt,
        durationSeconds: episode.durationSeconds
      }))
    );

    reply.header('content-type', 'application/rss+xml; charset=utf-8');
    return reply.send(xml);
  });
};
