import type Phaser from 'phaser';
import { MINIGOLF_CAMERA_TUNING } from './gameplayTheme';

type CameraMode = 'idle' | 'aim' | 'follow' | 'settle';

export interface CameraAssistContext {
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  cupX: number;
  cupY: number;
  isAiming: boolean;
  isMoving: boolean;
  forceBallCam: boolean;
}

export interface CameraAssistController {
  update: (camera: Phaser.Cameras.Scene2D.Camera, ctx: CameraAssistContext) => void;
  reset: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createCameraAssistController(worldWidth: number, worldHeight: number): CameraAssistController {
  let mode: CameraMode = 'idle';

  return {
    update: (camera, ctx) => {
      if (ctx.forceBallCam || ctx.isMoving) mode = 'follow';
      else if (ctx.isAiming) mode = 'aim';
      else mode = 'settle';

      const speed = Math.hypot(ctx.ballVx, ctx.ballVy);
      const dirX = speed > 1e-5 ? ctx.ballVx / speed : 0;
      const dirY = speed > 1e-5 ? ctx.ballVy / speed : 0;
      const lookAhead = Math.min(MINIGOLF_CAMERA_TUNING.lookAheadMax, speed * 0.025);

      const targetX =
        mode === 'settle'
          ? ctx.ballX * 0.72 + ctx.cupX * 0.28
          : ctx.ballX + (mode === 'follow' ? dirX * lookAhead : 0);
      const targetY =
        mode === 'settle'
          ? ctx.ballY * 0.72 + ctx.cupY * 0.28
          : ctx.ballY + (mode === 'follow' ? dirY * lookAhead : 0);

      const zoomTarget = ctx.forceBallCam
        ? 1.03
        : mode === 'aim'
          ? 1 + MINIGOLF_CAMERA_TUNING.aimZoomDelta
          : mode === 'follow'
            ? 1 + MINIGOLF_CAMERA_TUNING.followZoomDelta
            : 1;
      camera.setZoom(camera.zoom + (zoomTarget - camera.zoom) * 0.12);

      const smooth =
        mode === 'aim'
          ? MINIGOLF_CAMERA_TUNING.aimSpeed
          : mode === 'follow'
            ? MINIGOLF_CAMERA_TUNING.followSpeed
            : MINIGOLF_CAMERA_TUNING.settleSpeed;
      const halfW = camera.width * 0.5 / camera.zoom;
      const halfH = camera.height * 0.5 / camera.zoom;
      const targetScrollX = clamp(targetX - halfW, 0, Math.max(0, worldWidth - halfW * 2));
      const targetScrollY = clamp(targetY - halfH, 0, Math.max(0, worldHeight - halfH * 2));
      camera.setScroll(camera.scrollX + (targetScrollX - camera.scrollX) * smooth, camera.scrollY + (targetScrollY - camera.scrollY) * smooth);
    },
    reset: () => {
      mode = 'idle';
    }
  };
}

