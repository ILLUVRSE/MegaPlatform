import paletteRaw from '../../../content/oz-chronicle/artPalette.json';
import type { OzSkinId } from './settings';

interface PaletteFile {
  tokens?: Record<string, string>;
  semantics?: Record<string, string>;
  typography?: Record<string, number>;
  spacing?: Record<string, number>;
  radius?: Record<string, number>;
  shadow?: Record<string, number>;
  skins?: Array<{ id: OzSkinId; label: string; semantics: Record<string, string> }>;
}

export interface OzVisualTheme {
  id: OzSkinId;
  label: string;
  colors: {
    background: number;
    ink: number;
    accent: number;
    danger: number;
    success: number;
    paper: number;
    shadow: number;
  };
  typography: {
    headline: number;
    body: number;
    caption: number;
  };
  spacing: {
    sm: number;
    md: number;
    lg: number;
  };
  radius: {
    panel: number;
    button: number;
  };
  shadow: {
    panelAlpha: number;
    insetAlpha: number;
  };
}

const palette = paletteRaw as PaletteFile;

function parseHex(input: string | undefined, fallback: number): number {
  if (!input || !input.startsWith('#')) return fallback;
  const parsed = Number.parseInt(input.slice(1), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function baseSemantics(): Record<string, string> {
  const tokens = palette.tokens ?? {};
  return {
    background: palette.semantics?.background ?? tokens.paper ?? '#f8f1de',
    ink: palette.semantics?.ink ?? tokens.ink ?? '#1f1a16',
    accent: palette.semantics?.accent ?? tokens.emeraldHint ?? '#3f8d66',
    danger: palette.semantics?.danger ?? tokens.accentRose ?? '#b86161',
    success: palette.semantics?.success ?? tokens.field ?? '#8cab63',
    paper: palette.semantics?.paper ?? '#fbf6e8',
    shadow: palette.semantics?.shadow ?? '#2d2a25'
  };
}

export function buildTheme(skin: OzSkinId): OzVisualTheme {
  const base = baseSemantics();
  const skinDef = (palette.skins ?? []).find((entry) => entry.id === skin);
  const semantic = {
    ...base,
    ...(skinDef?.semantics ?? {})
  };

  return {
    id: skin,
    label: skinDef?.label ?? 'Engraved Paper',
    colors: {
      background: parseHex(semantic.background, 0xf8f1de),
      ink: parseHex(semantic.ink, 0x1f1a16),
      accent: parseHex(semantic.accent, 0x3f8d66),
      danger: parseHex(semantic.danger, 0xb86161),
      success: parseHex(semantic.success, 0x8cab63),
      paper: parseHex(semantic.paper, 0xfbf6e8),
      shadow: parseHex(semantic.shadow, 0x2d2a25)
    },
    typography: {
      headline: Math.max(28, Math.round(palette.typography?.headline ?? 38)),
      body: Math.max(18, Math.round(palette.typography?.body ?? 24)),
      caption: Math.max(14, Math.round(palette.typography?.caption ?? 18))
    },
    spacing: {
      sm: Math.max(8, Math.round(palette.spacing?.sm ?? 12)),
      md: Math.max(12, Math.round(palette.spacing?.md ?? 18)),
      lg: Math.max(20, Math.round(palette.spacing?.lg ?? 28))
    },
    radius: {
      panel: Math.max(8, Math.round(palette.radius?.panel ?? 14)),
      button: Math.max(8, Math.round(palette.radius?.button ?? 12))
    },
    shadow: {
      panelAlpha: Math.min(1, Math.max(0, Number(palette.shadow?.panelAlpha ?? 0.22))),
      insetAlpha: Math.min(1, Math.max(0, Number(palette.shadow?.insetAlpha ?? 0.1)))
    }
  };
}
