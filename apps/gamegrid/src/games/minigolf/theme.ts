import type { MinigolfTheme } from './types';

export type MinigolfPalette = {
  background: number;
  turf: number;
  turfEdge: number;
  turfStripe: number;
  turfBorder: number;
  sand: number;
  ice: number;
  rough: number;
  water: number;
  waterStroke: number;
  slope: number;
  wall: number;
  wallHighlight: number;
  wallShadow: number;
  bumper: number;
  cupDark: number;
  cupRim: number;
  ball: number;
  ballStroke: number;
  ghostBall: number;
  previewPrimary: number;
  previewBounce: number;
  previewImpact: number;
  hudPrimary: string;
  hudSecondary: string;
  hudTimer: string;
  panelBg: string;
  panelStroke: string;
  buttonBg: string;
  buttonText: string;
  buttonAltBg: string;
};

export const MINIGOLF_THEME = {
  fontStack: '"Avenir Next", "Nunito Sans", "Segoe UI", sans-serif',
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 22
  },
  shadows: {
    dx: 3,
    dy: 3,
    softAlpha: 0.18,
    hardAlpha: 0.26
  }
} as const;

const BASE_PALETTE: MinigolfPalette = {
  background: 0x0d1711,
  turf: 0x3f8e53,
  turfEdge: 0x2f6a3f,
  turfStripe: 0x66a878,
  turfBorder: 0x224c30,
  sand: 0xdcb984,
  ice: 0xa9d9f2,
  rough: 0x356c43,
  water: 0x3f9bc6,
  waterStroke: 0xbadcf0,
  slope: 0xffcc66,
  wall: 0xf3f4ef,
  wallHighlight: 0xffffff,
  wallShadow: 0xcfd4c7,
  bumper: 0xe7edf0,
  cupDark: 0x0c1714,
  cupRim: 0xffffff,
  ball: 0xfafdfd,
  ballStroke: 0xdfe8e1,
  ghostBall: 0xd9efff,
  previewPrimary: 0xffffff,
  previewBounce: 0xd8f2ff,
  previewImpact: 0xffcc66,
  hudPrimary: '#f4f7f2',
  hudSecondary: '#d7e2d8',
  hudTimer: '#ffcc66',
  panelBg: 'rgba(14, 20, 16, 0.68)',
  panelStroke: 'rgba(255, 255, 255, 0.14)',
  buttonBg: '#ffcc66',
  buttonText: '#1b2018',
  buttonAltBg: '#f3f4ef'
};

export function getThemePalette(_theme: MinigolfTheme): MinigolfPalette {
  // Art direction is intentionally consistent across course themes.
  // Tweak `BASE_PALETTE` values above to retheme the whole game quickly.
  return BASE_PALETTE;
}

