import dotenv from 'dotenv';
dotenv.config();

import { Queue } from 'bullmq';
import { createWorkers } from './processors/pipelineWorkers';
import { buildDeadLetterPayload } from './utils/deadLetter';

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null as null
};
const deadLetterQueue = new Queue('dead_letter_queue', { connection });

const workers = createWorkers();
console.log(`Started ${workers.length} workers`);

for (const worker of workers) {
  worker.on('failed', (job, err) => {
    void deadLetterQueue.add(
      'worker-failure',
      buildDeadLetterPayload({
        workerName: worker.name,
        jobId: job?.id ?? null,
        queueName: job?.queueName ?? null,
        error: err,
        data: job?.data ?? {}
      })
    );
    console.error(`Worker ${worker.name} failed for job ${job?.id}`, err);
  });
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down workers...`);
  await Promise.all(workers.map((worker) => worker.close()));
  await deadLetterQueue.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
