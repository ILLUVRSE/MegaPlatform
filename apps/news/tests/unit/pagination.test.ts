import { describe, expect, it } from 'vitest';
import { parsePagination } from '../../api/src/utils/pagination';

describe('pagination parsing', () => {
  it('uses defaults for invalid values', () => {
    expect(
      parsePagination(
        { limit: 'abc', offset: '-10' },
        { defaultLimit: 25, maxLimit: 100 }
      )
    ).toEqual({ limit: 25, offset: 0 });
  });

  it('enforces bounds for valid values', () => {
    expect(
      parsePagination(
        { limit: '500', offset: '12' },
        { defaultLimit: 25, maxLimit: 100 }
      )
    ).toEqual({ limit: 100, offset: 12 });
  });
});
