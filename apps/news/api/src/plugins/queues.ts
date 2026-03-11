import fp from 'fastify-plugin';
import { Queue } from 'bullmq';

const queueNames = [
  'ingest_queue',
  'canonicalize_queue',
  'dedup_cluster_queue',
  'summarize_cluster_queue',
  'evaluation_queue',
  'rank_queue',
  'source_reputation_queue',
  'personalization_queue',
  'experiment_evaluation_queue',
  'podcast_script_queue',
  'tts_queue',
  'rss_publish_queue',
  'weekly_digest_queue',
  'dead_letter_queue'
] as const;

type QueueName = (typeof queueNames)[number];

declare module 'fastify' {
  interface FastifyInstance {
    queues: Record<QueueName, Queue>;
  }
}

export default fp(async (fastify) => {
  const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const connection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null as null
  };
  const queues = queueNames.reduce((acc, name) => {
    acc[name] = new Queue(name, { connection });
    return acc;
  }, {} as Record<QueueName, Queue>);

  fastify.decorate('queues', queues);
  fastify.addHook('onClose', async () => {
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
  });
});
