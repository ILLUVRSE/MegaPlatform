import { describe, expect, it } from 'vitest';
import { getBootstrapJobs } from '../../workers/src/utils/bootstrapJobs';

describe('worker bootstrap jobs', () => {
  it('uses stable dedupe IDs for startup jobs', () => {
    const jobs = getBootstrapJobs();
    expect(jobs).toHaveLength(2);
    expect(new Set(jobs.map((job) => job.jobId)).size).toBe(jobs.length);
    expect(jobs.map((job) => job.queueName)).toEqual([
      'source_reputation_queue',
      'personalization_queue'
    ]);
  });
});
