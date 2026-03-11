import type { MinigolfHole, SurfaceMaterial, Vec2, WaterHazard } from './types';

function pointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function pointInPolygon(x: number, y: number, points: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function waterContains(water: WaterHazard, x: number, y: number): boolean {
  if (water.kind === 'rect') {
    return pointInRect(x, y, water);
  }
  return pointInPolygon(x, y, water.points);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function sampleForceGrid(zone: MinigolfHole['hazards']['slopes'][number], localU: number, localV: number, out: Vec2): boolean {
  const cols = zone.sampleCols;
  const rows = zone.sampleRows;
  const values = zone.sampleForces;
  if (!cols || !rows || !Array.isArray(values)) return false;
  if (cols < 2 || rows < 2 || values.length !== cols * rows * 2) return false;

  const u = clamp01(localU) * (cols - 1);
  const v = clamp01(localV) * (rows - 1);
  const ix = Math.floor(u);
  const iy = Math.floor(v);
  const ix1 = Math.min(cols - 1, ix + 1);
  const iy1 = Math.min(rows - 1, iy + 1);
  const tx = u - ix;
  const ty = v - iy;

  const read = (cx: number, cy: number) => {
    const base = (cy * cols + cx) * 2;
    return { x: values[base], y: values[base + 1] };
  };

  const a = read(ix, iy);
  const b = read(ix1, iy);
  const c = read(ix, iy1);
  const d = read(ix1, iy1);

  const xTop = a.x + (b.x - a.x) * tx;
  const yTop = a.y + (b.y - a.y) * tx;
  const xBottom = c.x + (d.x - c.x) * tx;
  const yBottom = c.y + (d.y - c.y) * tx;

  out.x += xTop + (xBottom - xTop) * ty;
  out.y += yTop + (yBottom - yTop) * ty;
  return true;
}

export function getSurfaceMaterialAt(hole: MinigolfHole, x: number, y: number): SurfaceMaterial {
  const surfaces = hole.hazards.surfaces;
  for (let i = 0; i < surfaces.length; i += 1) {
    const zone = surfaces[i];
    if (pointInRect(x, y, zone)) {
      return zone.material;
    }
  }
  return 'normal';
}

export function isWaterAt(hole: MinigolfHole, x: number, y: number): boolean {
  const water = hole.hazards.water;
  for (let i = 0; i < water.length; i += 1) {
    if (waterContains(water[i], x, y)) {
      return true;
    }
  }
  return false;
}

export function sampleSlopeAt(hole: MinigolfHole, x: number, y: number, out: Vec2): Vec2 {
  out.x = 0;
  out.y = 0;
  const zones = hole.hazards.slopes;
  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    if (pointInRect(x, y, zone)) {
      const zoneForce = { x: 0, y: 0 };
      const localU = (x - zone.x) / Math.max(1e-6, zone.width);
      const localV = (y - zone.y) / Math.max(1e-6, zone.height);
      const mx = Math.min(localU, 1 - localU);
      const my = Math.min(localV, 1 - localV);
      const edgeBlend = smoothstep01(Math.min(mx, my) / 0.22);

      const hadGrid = sampleForceGrid(zone, localU, localV, zoneForce);
      if (!hadGrid) {
        zoneForce.x += zone.forceX;
        zoneForce.y += zone.forceY;
      }

      out.x += zoneForce.x * edgeBlend;
      out.y += zoneForce.y * edgeBlend;
    }
  }
  return out;
}

export function rectContainsPoint(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  return pointInRect(x, y, rect);
}
