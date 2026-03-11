export interface UiMotionDurations {
  buttonPressMs: number;
  panelTransitionMs: number;
  badgePopMs: number;
}

export function resolveUiMotionDurations(reducedMotion: boolean, lowPerf: boolean): UiMotionDurations {
  if (reducedMotion || lowPerf) {
    return {
      buttonPressMs: 0,
      panelTransitionMs: 0,
      badgePopMs: 0
    };
  }
  return {
    buttonPressMs: 90,
    panelTransitionMs: 180,
    badgePopMs: 190
  };
}
