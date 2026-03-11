import { TUNING } from '../config/tuning';
import type { ArenaBounds, Vec2 } from '../../shared/types';

export class Arena {
  readonly width = TUNING.arena.width;
  readonly height = TUNING.arena.height;
  readonly bounds: ArenaBounds;
  readonly center: Vec2;

  constructor() {
    this.bounds = {
      left: 0,
      right: this.width,
      top: 0,
      bottom: this.height
    };
    this.center = { x: this.width / 2, y: this.height / 2 };
  }
}
