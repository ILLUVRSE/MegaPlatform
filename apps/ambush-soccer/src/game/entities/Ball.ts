import type { Vec2 } from '../../shared/types';

export class Ball {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  ownerId: string | null = null;

  constructor(x: number, y: number, radius: number) {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.radius = radius;
  }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  setVelocity(x: number, y: number): void {
    this.velocity.x = x;
    this.velocity.y = y;
  }
}
