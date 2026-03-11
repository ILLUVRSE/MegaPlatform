import Phaser from 'phaser';
import type { OzChronicleState } from '../rules';

const CITY_CHAPTERS = new Set([
  'emerald-city-entry',
  'emerald-city-explore',
  'wizard-audience-setup',
  'emerald-return-arrival',
  'wizard-revelation-resolution',
  'companion-gifts-ceremony'
]);

export function isSpectaclesOverlayEnabled(state: OzChronicleState, chapterId: string): boolean {
  return state.settings.spectaclesTint && state.storyFlags.spectaclesOn && CITY_CHAPTERS.has(chapterId);
}

export function createSpectaclesOverlay(scene: Phaser.Scene): Phaser.GameObjects.Rectangle[] {
  const wash = scene.add.rectangle(640, 360, 1280, 720, 0x4f8a58, 0.12);
  const vignette = scene.add.rectangle(640, 360, 1280, 720, 0x2f5c36, 0.08);
  vignette.setStrokeStyle(22, 0x214229, 0.32);
  return [wash, vignette];
}
