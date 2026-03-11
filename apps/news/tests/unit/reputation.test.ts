import { describe, expect, it } from 'vitest';
import { scoreSourceHealth } from '../../lib/reputation/sourceHealth';

describe('source reputation scoring', () => {
  it('drops health score when duplicate rate is high', () => {
    const weak = scoreSourceHealth({ duplicateRate: 0.8, averageLagHours: 24, sourceDiversity: 2 });
    const strong = scoreSourceHealth({ duplicateRate: 0.1, averageLagHours: 4, sourceDiversity: 8 });
    expect(strong.aggregate).toBeGreaterThan(weak.aggregate);
  });
});
