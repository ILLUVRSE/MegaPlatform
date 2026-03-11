import dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma';
import queuePlugin from './plugins/queues';
import { healthRoutes } from './routes/health';
import { clusterRoutes } from './routes/clusters';
import { searchRoutes } from './routes/search';
import { podcastRoutes } from './routes/podcast';
import { adminRoutes } from './routes/admin';
import { personalizedRoutes } from './routes/personalized';

export async function buildServer() {
  const fastify = Fastify({ logger: true });
  await fastify.register(prismaPlugin);
  await fastify.register(queuePlugin);

  await fastify.register(healthRoutes, { prefix: '/api' });
  await fastify.register(clusterRoutes, { prefix: '/api' });
  await fastify.register(searchRoutes, { prefix: '/api' });
  await fastify.register(personalizedRoutes, { prefix: '/api' });
  await fastify.register(podcastRoutes, { prefix: '/api' });
  await fastify.register(podcastRoutes);
  await fastify.register(adminRoutes, { prefix: '/api' });

  return fastify;
}

async function start() {
  const server = await buildServer();
  await server.listen({ port: Number(process.env.API_PORT ?? 4000), host: '0.0.0.0' });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
