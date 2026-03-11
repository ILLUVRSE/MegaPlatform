export type Circle = { x: number; y: number; r: number };
export type Rect = { x: number; y: number; width: number; height: number };

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const circleIntersectsCircle = (a: Circle, b: Circle) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distSq = dx * dx + dy * dy;
  const r = a.r + b.r;
  return distSq <= r * r;
};

export const circleIntersectsRect = (circle: Circle, rect: Rect) => {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.r * circle.r;
};

export const rectContainsPoint = (rect: Rect, x: number, y: number) =>
  x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
