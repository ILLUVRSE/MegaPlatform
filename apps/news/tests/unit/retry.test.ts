import { describe, expect, it } from 'vitest';
import { retryWithBackoff } from '../../lib/pipeline/retry';

describe('retry with backoff', () => {
  it('retries transient failures and eventually succeeds', async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('temporary');
        }
        return 'ok';
      },
      { attempts: 3, baseDelayMs: 1 }
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after maximum attempts are exhausted', async () => {
    await expect(
      retryWithBackoff(
        async () => {
          throw new Error('still failing');
        },
        { attempts: 2, baseDelayMs: 1 }
      )
    ).rejects.toThrow('still failing');
  });
});
