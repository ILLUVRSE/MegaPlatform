import Phaser from 'phaser';

export type VisualMode = 'classic' | 'polished';

export const TABLE_TENNIS_THEME = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background: {
    deepNavyTop: 0x08182a,
    deepNavyBottom: 0x0e2438,
    vignetteAlpha: 0.18
  },
  table: {
    x: 260,
    y: 124,
    width: 760,
    height: 560,
    radius: 26,
    nearColor: 0x2a6f99,
    farColor: 0x1e577f,
    lineColor: 0xe7f4ff,
    lineAlpha: 0.68,
    lineWidth: 2
  },
  lighting: {
    directionalLinearAlpha: 0.055,
    directionalSpecularAlpha: 0.045
  },
  net: {
    color: 0xdceeff,
    alpha: 0.72,
    shadowAlpha: 0.24,
    width: 736,
    height: 3,
    highlightAlpha: 0.9
  },
  paddle: {
    playerBase: 0xff8a5b,
    playerHighlight: 0xffbb92,
    aiBase: 0x5caee8,
    aiHighlight: 0x99ccf4,
    rim: 0xeaf6ff,
    shadowAlpha: 0.2
  },
  ball: {
    base: 0xffffff,
    rim: 0xd0dce9,
    highlight: 0xffffff,
    shadowAlpha: 0.26,
    shadowAlphaNear: 0.32,
    shadowAlphaFar: 0.14
  },
  accent: 0xffc86f,
  vfx: {
    ringDurationMs: 180,
    ringScale: 1.42,
    ringAlpha: 0.52,
    speckCount: 3,
    speckDurationMs: 190
  },
  animation: {
    scorePopScale: 1.12,
    scorePopDurationMs: 190
  },
  ui: {
    textPrimary: '#ecf5ff',
    textSecondary: '#c2d6e8',
    textMuted: '#9cb2c8',
    chipBg: '#16344f',
    chipBorder: '#3a6483',
    buttonPrimaryBg: '#ffc977',
    buttonPrimaryText: '#0c2238',
    buttonSecondaryBg: '#20405c',
    buttonSecondaryText: '#eaf4ff',
    buttonGhostBg: '#2a3f52',
    buttonGhostText: '#dce8f2'
  },
  button: {
    radius: 14,
    minHeight: 44
  }
} as const;

export const VISUAL_DEBUG_DEFAULTS = {
  directionalLight: true,
  vfx: true,
  vignette: true
} as const;

export function snap(value: number, step = 0.5): number {
  return Math.round(value / step) * step;
}

export function buildTextStyle(size: number, color: string, weight: string = '500'): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    color,
    fontSize: `${size}px`,
    fontStyle: weight,
    fontFamily: TABLE_TENNIS_THEME.fontFamily
  };
}

export function applyButtonStyle(
  text: Phaser.GameObjects.Text,
  variant: 'primary' | 'secondary' | 'ghost'
): Phaser.GameObjects.Text {
  const palette =
    variant === 'primary'
      ? { bg: TABLE_TENNIS_THEME.ui.buttonPrimaryBg, fg: TABLE_TENNIS_THEME.ui.buttonPrimaryText }
      : variant === 'secondary'
      ? { bg: TABLE_TENNIS_THEME.ui.buttonSecondaryBg, fg: TABLE_TENNIS_THEME.ui.buttonSecondaryText }
      : { bg: TABLE_TENNIS_THEME.ui.buttonGhostBg, fg: TABLE_TENNIS_THEME.ui.buttonGhostText };

  return text
    .setStyle({
      ...text.style,
      fontFamily: TABLE_TENNIS_THEME.fontFamily,
      fontSize: '17px',
      fontStyle: '600',
      color: palette.fg,
      backgroundColor: palette.bg
    })
    .setPadding(18, 12, 18, 12);
}

export function ensureNoiseTexture(scene: Phaser.Scene, key = 'tt-noise'): string {
  if (scene.textures.exists(key)) return key;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const grain = Math.floor(Math.random() * 255);
    imageData.data[i] = grain;
    imageData.data[i + 1] = grain;
    imageData.data[i + 2] = grain;
    imageData.data[i + 3] = Math.random() < 0.52 ? 12 : 0;
  }
  ctx.putImageData(imageData, 0, 0);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function ensureVignetteTexture(scene: Phaser.Scene, key = 'tt-vignette'): string {
  if (scene.textures.exists(key)) return key;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.22, size / 2, size / 2, size * 0.52);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function ensureDirectionalLinearTexture(scene: Phaser.Scene, key = 'tt-dir-linear'): string {
  if (scene.textures.exists(key)) return key;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.62, 'rgba(255,255,255,0.14)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.24)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function ensureDirectionalSpecTexture(scene: Phaser.Scene, key = 'tt-dir-spec'): string {
  if (scene.textures.exists(key)) return key;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;
  const gradient = ctx.createRadialGradient(size * 0.27, size * 0.24, 0, size * 0.27, size * 0.24, size * 0.44);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function ensureOuterVignetteTexture(scene: Phaser.Scene, key = 'tt-outer-vignette'): string {
  if (scene.textures.exists(key)) return key;
  const w = 1280;
  const h = 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return key;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.7);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.72, 'rgba(0,0,0,0.06)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function ensurePaddleTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  topColor: number,
  bottomColor: number,
  rimColor: number
): string {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const radius = height * 0.5;
  g.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
  g.fillRoundedRect(0, 0, width, height, radius);
  g.lineStyle(1.5, rimColor, 0.55);
  g.strokeRoundedRect(0.75, 0.75, width - 1.5, height - 1.5, radius - 1);
  g.lineStyle(1, 0xffffff, 0.3);
  g.beginPath();
  g.moveTo(8, 4);
  g.lineTo(width - 8, 4);
  g.strokePath();
  g.generateTexture(key, width, height);
  g.destroy();
  return key;
}

export function ensureRacketTexture(
  scene: Phaser.Scene,
  key: string,
  faceColor: number,
  faceHighlight: number,
  rimColor: number,
  handleColor: number
): string {
  if (scene.textures.exists(key)) return key;
  const width = 78;
  const height = 100;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  g.fillStyle(handleColor, 0.95);
  g.fillRoundedRect(31, 56, 16, 36, 6);
  g.fillStyle(0x05090f, 0.15);
  g.fillRoundedRect(35, 56, 8, 36, 3);

  g.fillGradientStyle(faceHighlight, faceHighlight, faceColor, faceColor, 1);
  g.fillCircle(39, 36, 30);
  g.lineStyle(2, rimColor, 0.7);
  g.strokeCircle(39, 36, 30);
  g.lineStyle(1.5, 0xffffff, 0.35);
  g.beginPath();
  g.moveTo(20, 19);
  g.lineTo(56, 19);
  g.strokePath();

  g.generateTexture(key, width, height);
  g.destroy();
  return key;
}

export function tableMaskShape(scene: Phaser.Scene): Phaser.Display.Masks.GeometryMask {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(
    TABLE_TENNIS_THEME.table.x,
    TABLE_TENNIS_THEME.table.y,
    TABLE_TENNIS_THEME.table.width,
    TABLE_TENNIS_THEME.table.height,
    TABLE_TENNIS_THEME.table.radius
  );
  return g.createGeometryMask();
}
