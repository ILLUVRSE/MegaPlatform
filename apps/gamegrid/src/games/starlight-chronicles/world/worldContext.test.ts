import { describe, expect, it } from 'vitest';
import { beginRun, createInitialProfile } from '../rules';

describe('starlight world context in run seed', () => {
  it('system selection changes run seed context', () => {
    const a = createInitialProfile(500);
    const b = { ...a, currentSystemId: 'blackwake' as const };

    const runA = beginRun(a);
    const runB = beginRun(b);

    expect(runA.runSeed).not.toBe(runB.runSeed);
  });
});
