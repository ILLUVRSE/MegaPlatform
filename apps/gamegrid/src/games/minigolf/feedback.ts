interface FeedbackDriver {
  cue: (name: 'hit' | 'wall' | 'sand' | 'water' | 'sink' | 'ui', intensity?: number) => void;
  haptic: (value: number | number[]) => void;
}

export interface MinigolfFeedback {
  onShot: (power: number) => void;
  onWallHit: (strength: number) => void;
  onCupSink: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createMinigolfFeedback(driver: FeedbackDriver): MinigolfFeedback {
  return {
    onShot: (power) => {
      const intensity = clamp(power / 900, 0.2, 1);
      driver.cue('hit', intensity);
      driver.haptic(Math.round(6 + intensity * 6));
    },
    onWallHit: (strength) => {
      const intensity = clamp(strength / 420, 0.18, 1);
      driver.cue('wall', intensity);
      driver.haptic(Math.round(5 + intensity * 8));
    },
    onCupSink: () => {
      driver.cue('sink', 1);
      driver.haptic([14, 28, 20]);
    }
  };
}
