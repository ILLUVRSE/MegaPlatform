import { describe, expect, it } from 'vitest';
import { buildDeadLetterPayload } from '../../workers/src/utils/deadLetter';

describe('dead letter payload', () => {
  it('serializes worker failure metadata into stable payload', () => {
    const payload = buildDeadLetterPayload({
      workerName: 'ingest_queue',
      jobId: 42,
      queueName: 'ingest_queue',
      error: new Error('boom'),
      data: { sourceId: 's1' },
      now: new Date('2026-03-02T00:00:00Z')
    });

    expect(payload).toMatchObject({
      workerName: 'ingest_queue',
      jobId: '42',
      queueName: 'ingest_queue',
      failedAt: '2026-03-02T00:00:00.000Z',
      errorMessage: 'boom',
      data: { sourceId: 's1' }
    });
  });
});
