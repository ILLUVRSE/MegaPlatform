import type { Vec2 } from './types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const length = (v: Vec2): number => Math.hypot(v.x, v.y);

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  if (len <= 1e-8) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
};

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const angleBetweenNormalized = (a: Vec2, b: Vec2): number => {
  const c = clamp(dot(a, b), -1, 1);
  return Math.acos(c);
};
