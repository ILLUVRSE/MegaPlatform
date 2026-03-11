import { describe, expect, it } from 'vitest';
import { buildLayerPlan } from './sceneComposer';

describe('oz chronicle scene composer', () => {
  it('is deterministic for same seed/chapter/detail', () => {
    const a = buildLayerPlan(901, 'emerald-return-arrival', 'enhanced');
    const b = buildLayerPlan(901, 'emerald-return-arrival', 'enhanced');
    const c = buildLayerPlan(902, 'emerald-return-arrival', 'enhanced');

    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});
