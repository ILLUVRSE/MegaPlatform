export interface BootstrapJob {
  queueName: 'source_reputation_queue' | 'personalization_queue';
  name: string;
  data: Record<string, never>;
  jobId: string;
}

export function getBootstrapJobs(): BootstrapJob[] {
  return [
    {
      queueName: 'source_reputation_queue',
      name: 'nightly-source-reputation',
      data: {},
      jobId: 'bootstrap:nightly-source-reputation'
    },
    {
      queueName: 'personalization_queue',
      name: 'nightly-personalization',
      data: {},
      jobId: 'bootstrap:nightly-personalization'
    }
  ];
}
