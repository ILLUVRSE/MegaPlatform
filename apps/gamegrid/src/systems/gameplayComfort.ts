import type Phaser from 'phaser';

interface ComfortSettings {
  haptics?: boolean;
  reducedMotion?: boolean;
}

const SETTINGS_KEY = 'gamegrid.settings.v1';

function readComfortSettings(): ComfortSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ComfortSettings;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function prefersReducedMotion(): boolean {
  const settings = readComfortSettings();
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  return Boolean(settings.reducedMotion || media);
}

export function canUseHaptics(): boolean {
  const settings = readComfortSettings();
  return Boolean(settings.haptics) && !prefersReducedMotion() && 'vibrate' in navigator;
}

export function triggerHaptic(pattern: number | number[]): void {
  if (!canUseHaptics()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // no-op fallback
  }
}

export function cameraShake(scene: Phaser.Scene, duration: number, intensity: number): void {
  if (prefersReducedMotion()) return;
  scene.cameras.main.shake(duration, intensity);
}

export function cameraFlash(scene: Phaser.Scene, duration: number, red: number, green: number, blue: number): void {
  if (prefersReducedMotion()) return;
  scene.cameras.main.flash(duration, red, green, blue, false);
}
