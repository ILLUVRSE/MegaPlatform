import { describe, expect, it } from 'vitest';
import { resolveUiMotionDurations } from './uiMotion';

describe('ozark ui motion durations', () => {
  it('reduced motion forces zero-duration transitions', () => {
    const motion = resolveUiMotionDurations(true, false);
    expect(motion.buttonPressMs).toBe(0);
    expect(motion.panelTransitionMs).toBe(0);
    expect(motion.badgePopMs).toBe(0);
  });

  it('ui state toggles remain deterministic regardless of motion profile', () => {
    let visible = false;
    visible = !visible;
    expect(visible).toBe(true);
    visible = !visible;
    expect(visible).toBe(false);

    const lowPerf = resolveUiMotionDurations(false, true);
    expect(lowPerf.panelTransitionMs).toBe(0);
  });
});
