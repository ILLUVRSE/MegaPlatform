import Phaser from 'phaser';
import { clamp } from '../config/tuning';

export type CameraIntensity = 'low' | 'medium' | 'high';

export interface CameraDirectorSettings {
  followEnabled: boolean;
  intensity: CameraIntensity;
  reducedMotion: boolean;
}

export class CameraDirector {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private baseZoom = 1;
  private batterZoom = 1.06;
  private batterFocus = new Phaser.Math.Vector2(640, 420);
  private flightZoom = 0.92;
  private flightDuration = 380;
  private active = 'batter' as 'batter' | 'flight';

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
    this.camera.setRoundPixels(true);
  }

  updateSettings(settings: CameraDirectorSettings) {
    if (settings.reducedMotion || !settings.followEnabled) {
      this.baseZoom = 1;
      this.batterZoom = 1.02;
      this.flightZoom = 1;
      this.flightDuration = 260;
    } else {
      this.baseZoom = 1;
      this.batterZoom = 1.08;
      this.flightZoom = settings.intensity === 'high' ? 0.86 : settings.intensity === 'medium' ? 0.9 : 0.94;
      this.flightDuration = settings.intensity === 'high' ? 520 : settings.intensity === 'medium' ? 420 : 320;
    }
  }

  setBatterCam() {
    this.active = 'batter';
    this.camera.pan(this.batterFocus.x, this.batterFocus.y, 220, 'Sine.easeOut', true);
    this.camera.zoomTo(this.batterZoom, 220, 'Sine.easeOut', true);
  }

  onPitchProgress(progress: number) {
    if (this.active !== 'batter') return;
    const microZoom = clamp(this.batterZoom + progress * 0.015, 1, 1.2);
    this.camera.setZoom(microZoom);
  }

  onContact(targetX: number, targetY: number, settings: CameraDirectorSettings) {
    if (settings.reducedMotion || !settings.followEnabled) return;
    this.active = 'flight';
    const focusY = clamp(targetY, 200, 420);
    this.camera.pan(targetX, focusY, this.flightDuration, 'Sine.easeOut', true);
    this.camera.zoomTo(this.flightZoom, this.flightDuration, 'Sine.easeOut', true);
  }

  onLanding(targetX: number) {
    if (this.active !== 'flight') return;
    this.camera.pan(targetX, 360, this.flightDuration * 0.7, 'Sine.easeOut', true);
  }

  reset() {
    this.active = 'batter';
    this.camera.zoomTo(this.baseZoom, 180, 'Sine.easeOut', true);
    this.camera.pan(640, 360, 180, 'Sine.easeOut', true);
  }

  contactPulse(intensity = 0.03) {
    const scene = this.camera.scene;
    if (!scene) return;
    const startZoom = this.camera.zoom;
    scene.tweens.add({
      targets: this.camera,
      zoom: startZoom + intensity,
      duration: 80,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
  }
}
