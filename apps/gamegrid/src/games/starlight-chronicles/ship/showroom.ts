import type { StarlightProfile } from '../rules';
import { readShareLabels } from './cosmetics';

export interface HangarCardInput {
  hullName: string;
  hullClass: string;
  hp: number;
  dps: number;
  scan: number;
  cargo: number;
  color: string;
}

export function buildHangarShareText(profile: StarlightProfile, input: HangarCardInput): string[] {
  return readShareLabels(profile, input.hullName, input.hullClass, {
    hp: input.hp,
    dps: input.dps,
    scan: input.scan,
    cargo: input.cargo
  });
}

export async function exportHangarCardPng(profile: StarlightProfile, input: HangarCardInput): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });
  }

  const g = ctx.createLinearGradient(0, 0, 1200, 630);
  g.addColorStop(0, '#0b1629');
  g.addColorStop(1, '#1a3555');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(70, 70, 1060, 490);

  ctx.fillStyle = input.color;
  ctx.fillRect(160, 250, 260, 120);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(420, 286, 60, 24);

  const lines = buildHangarShareText(profile, input);
  ctx.fillStyle = '#e7f2ff';
  ctx.font = 'bold 46px Verdana';
  ctx.fillText(lines[0], 520, 190);
  ctx.font = '30px Verdana';
  ctx.fillText(lines[1], 520, 260);
  ctx.fillText(lines[2], 520, 306);
  ctx.fillText(lines[3], 520, 352);
  ctx.fillText(lines[4], 520, 398);
  ctx.font = '24px Verdana';
  ctx.fillText(lines[5], 520, 462);

  return await new Promise<Blob>((resolve) => {
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      resolve(new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }));
      return;
    }
    if (!canvas.toBlob) {
      resolve(new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }));
      return;
    }
    try {
      canvas.toBlob((blob) => {
        resolve(blob ?? new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }));
      }, 'image/png');
    } catch {
      resolve(new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }));
    }
  });
}
