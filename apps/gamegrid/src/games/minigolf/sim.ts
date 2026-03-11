import { MINIGOLF_SIM_TUNING } from './gameplayTheme';

export interface FixedStepConfig {
  fixedDtSec: number;
  maxSubstepsPerFrame: number;
  maxFrameDtSec?: number;
}

export interface FixedStepResult {
  accumulatorSec: number;
  substeps: number;
  droppedTimeSec: number;
}

export function stepFixedSimulation(
  accumulatorSec: number,
  frameDtSec: number,
  config: FixedStepConfig,
  step: (stepDtSec: number, stepIndex: number) => boolean | void
): FixedStepResult {
  const clampedFrameDt = Math.min(frameDtSec, config.maxFrameDtSec ?? MINIGOLF_SIM_TUNING.maxFrameDtSec);
  let acc = accumulatorSec + clampedFrameDt;
  let substeps = 0;
  const fixedDt = config.fixedDtSec;

  while (acc >= fixedDt && substeps < config.maxSubstepsPerFrame) {
    const shouldBreak = step(fixedDt, substeps) === true;
    acc -= fixedDt;
    substeps += 1;
    if (shouldBreak) {
      return { accumulatorSec: 0, substeps, droppedTimeSec: 0 };
    }
  }

  if (substeps >= config.maxSubstepsPerFrame && acc > fixedDt * 0.5) {
    const dropped = acc - fixedDt * 0.5;
    return { accumulatorSec: fixedDt * 0.5, substeps, droppedTimeSec: dropped };
  }
  return { accumulatorSec: acc, substeps, droppedTimeSec: 0 };
}

