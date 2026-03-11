import type { HomerunDifficulty, PitchDefinition, PitchGeneratorState } from '../types';
import type { HomerunTuning } from '../config/tuning';
import { createPitchGenerator, nextPitch } from './pitch';

export class PitchSequenceGenerator {
  private state: PitchGeneratorState;

  constructor(seed: number) {
    this.state = createPitchGenerator(seed);
  }

  next(difficulty: HomerunDifficulty, tuning: HomerunTuning): PitchDefinition {
    const generated = nextPitch(this.state, difficulty, tuning);
    this.state = generated.state;
    return generated.pitch;
  }

  getState(): PitchGeneratorState {
    return this.state;
  }
}
