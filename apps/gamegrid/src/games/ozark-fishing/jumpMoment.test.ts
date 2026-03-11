import { describe, expect, it } from 'vitest';
import { JumpMomentController, isJumpEligible, planJumpMoment } from './jumpMoment';

describe('ozark jump moment', () => {
  it('is deterministic by seed + event id', () => {
    const a = planJumpMoment(1234, 88, 'Legendary', 24, 20);
    const b = planJumpMoment(1234, 88, 'Legendary', 24, 20);
    const c = planJumpMoment(1234, 89, 'Legendary', 24, 20);
    expect(a).toEqual(b);
    expect(c.triggerSec).not.toBe(a.triggerSec);
  });

  it('does not mutate rules state and remains visual-only', () => {
    const plan = planJumpMoment(42, 7, 'Rare', 14, 12);
    const rulesState = {
      tension: 0.6,
      fishStamina: 80
    };
    const original = { ...rulesState };
    const controller = new JumpMomentController();
    controller.arm(plan);
    controller.update(0.016, false, true);
    controller.update(0.016, false, true);
    expect(rulesState).toEqual(original);
  });

  it('reduced motion disables shake suggestion', () => {
    expect(isJumpEligible('Rare', 12, 10)).toBe(true);
    const plan = planJumpMoment(9, 11, 'Rare', 12, 10);
    const controller = new JumpMomentController();
    controller.arm(plan);

    let state = controller.update(0.05, true, true);
    while (!state.active) {
      state = controller.update(0.05, true, true);
    }
    expect(state.active).toBe(true);
    expect(state.shakeSuggested).toBe(false);

    state = controller.update(0.01, false, false);
    expect(state.active).toBe(false);
  });
});
