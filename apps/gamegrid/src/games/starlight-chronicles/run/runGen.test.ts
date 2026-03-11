import { describe, expect, it } from 'vitest';
import { generateStarMap } from './runGen';

describe('starlight run generation', () => {
  it('is deterministic for same seed and focus', () => {
    const a = generateStarMap(4242, 'diplomacy');
    const b = generateStarMap(4242, 'diplomacy');
    expect(a).toEqual(b);
  });

  it('always ends with boss nodes', () => {
    const map = generateStarMap(5151, 'profit');
    const finalStep = Math.max(...map.nodes.map((node) => node.step));
    const finalNodes = map.nodes.filter((node) => node.step === finalStep);
    expect(finalNodes.every((node) => node.type === 'BOSS')).toBe(true);
  });

  it('contains at least one story explore and combat node before boss', () => {
    const map = generateStarMap(7777, 'wonder');
    const nonBoss = map.nodes.filter((node) => node.type !== 'BOSS');
    const types = new Set(nonBoss.map((node) => node.type));
    expect(types.has('STORY')).toBe(true);
    expect(types.has('EXPLORE')).toBe(true);
    expect(types.has('COMBAT')).toBe(true);
  });

  it('can inject a delivery node for contract routes', () => {
    const map = generateStarMap(8888, 'profit', { includeDeliveryNode: true });
    expect(map.nodes.some((node) => node.type === 'DELIVERY')).toBe(true);
  });

  it('can inject escort and patrol nodes deterministically', () => {
    const a = generateStarMap(9999, 'diplomacy', { includeEscortNode: true, includePatrolNode: true });
    const b = generateStarMap(9999, 'diplomacy', { includeEscortNode: true, includePatrolNode: true });
    expect(a).toEqual(b);
    expect(a.nodes.some((node) => node.type === 'ESCORT')).toBe(true);
    expect(a.nodes.some((node) => node.type === 'PATROL')).toBe(true);
  });
});
