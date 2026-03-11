import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { triggerHaptic } from '../../systems/gameplayComfort';
import {
  applyShot,
  createPhysicsScratch,
  createPhysicsStepResult,
  DEFAULT_PHYSICS_CONFIG,
  findNearestSafeRespawn,
  resetBall,
  resetPhysicsStepResult,
  stepBallPhysicsFixed
} from './physics';
import { createAimCapture, type PreviewLine } from './input';
import { checkCupInteraction, applyCupLipOut } from './cup';
import { createGhostRecorder, createGhostReplay, type GhostReplay } from './ghost';
import { getHoleById, loadMinigolfCourse } from './levels';
import { createCameraAssistController } from './camera';
import { createMinigolfFeedback } from './feedback';
import {
  applyWaterPenalty,
  buildSessionSummary,
  completeCurrentHole,
  createInitialSession,
  getCurrentHoleId,
  registerStroke,
  retryCurrentHole,
  tickSessionTime
} from './rules';
import type {
  BallState,
  GhostPoint,
  MinigolfHole,
  MinigolfMode,
  MinigolfOptions,
  MinigolfSensitivity,
  MinigolfTheme,
  ShotInput
} from './types';
import { MINIGOLF_CUP_TUNING } from './gameplayTheme';
import { getThemePalette, MINIGOLF_THEME, type MinigolfPalette } from './theme';

interface MinigolfSceneConfig {
  hooks: GameRuntimeHooks;
}

interface StoredSettings {
  mode: MinigolfMode;
  courseSelection: 'all_18' | MinigolfTheme;
  previewLine: boolean;
  ballCam: boolean;
  assist: boolean;
  sensitivity: MinigolfSensitivity;
  practice: boolean;
  practiceHoleId: string;
  raceGhost: boolean;
}

interface MenuRow {
  label: () => string;
  onClick: () => void;
}

interface PendingHoleResult {
  holeId: string;
  par: number;
}

interface StoredGhostRecord {
  holeId: string;
  strokes: number;
  timeMs: number;
  points: GhostPoint[];
}

type GhostStore = Record<string, StoredGhostRecord>;

const SETTINGS_KEY = 'gamegrid.minigolf.settings.v1';
const GHOST_KEY = 'gamegrid.minigolf.ghosts.v1';

const UI_FONT = MINIGOLF_THEME.fontStack;
const BALL_TEXTURE_KEY = 'minigolf-ball';
const BALL_SHADOW_TEXTURE_KEY = 'minigolf-ball-shadow';
const CUP_TEXTURE_KEY = 'minigolf-cup';
const CUP_SHADOW_TEXTURE_KEY = 'minigolf-cup-shadow';
const BACKGROUND_TEXTURE_KEY = 'minigolf-bg';
const OBSTACLE_TEXTURE_KEY = 'minigolf-obstacle';
const OBSTACLE_SHADOW_TEXTURE_KEY = 'minigolf-obstacle-shadow';
const HUD_PANEL_TEXTURE_KEY = 'minigolf-hud-panel';
const HUD_BUTTON_TEXTURE_KEY = 'minigolf-hud-button';
const HUD_BUTTON_ALT_TEXTURE_KEY = 'minigolf-hud-button-alt';

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function mixColor(colorA: number, colorB: number, ratio: number): number {
  const aR = (colorA >> 16) & 0xff;
  const aG = (colorA >> 8) & 0xff;
  const aB = colorA & 0xff;
  const bR = (colorB >> 16) & 0xff;
  const bG = (colorB >> 8) & 0xff;
  const bB = colorB & 0xff;
  const r = Math.round(aR + (bR - aR) * ratio);
  const g = Math.round(aG + (bG - aG) * ratio);
  const b = Math.round(aB + (bB - aB) * ratio);
  return (r << 16) | (g << 8) | b;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'stroke',
  courseSelection: 'all_18',
  previewLine: true,
  ballCam: false,
  assist: true,
  sensitivity: 'medium',
  practice: false,
  practiceHoleId: 'classic-1',
  raceGhost: true
};

const DEV_PHYSICS_FLAG = '__MINIGOLF_DEBUG_PHYSICS__';

function loadStoredSettings(): StoredSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveStoredSettings(settings: StoredSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

function loadGhostStore(): GhostStore {
  try {
    const raw = window.localStorage.getItem(GHOST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as GhostStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveGhostStore(store: GhostStore) {
  try {
    window.localStorage.setItem(GHOST_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}


function formatMode(mode: MinigolfMode): string {
  if (mode === 'time_attack') return 'Time Attack';
  if (mode === 'ghost') return 'Ghost';
  return 'Stroke';
}

function formatTheme(value: 'all_18' | MinigolfTheme): string {
  if (value === 'all_18') return 'All 18';
  if (value === 'classic') return 'Classic';
  if (value === 'neon') return 'Neon Arcade';
  return 'Backyard';
}

function parLabel(delta: number): string {
  if (delta <= -2) return `Eagle ${delta}`;
  if (delta === -1) return 'Birdie -1';
  if (delta === 0) return 'Par';
  if (delta === 1) return 'Bogey +1';
  return `+${delta}`;
}

export class MinigolfScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private palette: MinigolfPalette = getThemePalette('classic');

  private settings: StoredSettings = loadStoredSettings();
  private options!: MinigolfOptions;
  private holes = loadMinigolfCourse().holes;
  private ghostStore: GhostStore = loadGhostStore();

  private currentHole: MinigolfHole | null = null;
  private session = createInitialSession({ mode: 'stroke', holeOrder: [], practice: false });
  private pendingHoleResult: PendingHoleResult | null = null;

  private readonly ball: BallState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angularVelocity: 0,
    radius: 12,
    moving: false,
    restFrames: 0
  };

  private lastSafeX = 0;
  private lastSafeY = 0;

  private readonly physicsScratch = createPhysicsScratch();
  private readonly physicsStepResult = createPhysicsStepResult();
  private readonly slopeScratch = { x: 0, y: 0 };
  private readonly obstacleScratch = { x: 0, y: 0 };

  private readonly preview = {
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    impactX: 0,
    impactY: 0,
    bounceEndX: 0,
    bounceEndY: 0,
    visible: false
  } as PreviewLine;

  private readonly ghostFollowPoint = { x: 0, y: 0, visible: false };
  private readonly waterRespawn = { x: 0, y: 0 };

  private readonly aim = createAimCapture();
  private readonly ghostRecorder = createGhostRecorder(50);
  private ghostReplay: GhostReplay | null = null;
  private readonly cameraController = createCameraAssistController(1280, 720);
  private readonly feedback = createMinigolfFeedback({
    cue: (name, intensity) => this.playCue(name, intensity),
    haptic: (value) => triggerHaptic(value)
  });
  private cupRollIn: { elapsedMs: number; durationMs: number; fromX: number; fromY: number; toX: number; toY: number } | null = null;

  private menuContainer!: Phaser.GameObjects.Container;
  private holeCardContainer!: Phaser.GameObjects.Container;
  private summaryContainer!: Phaser.GameObjects.Container;
  private pauseContainer!: Phaser.GameObjects.Container;

  private holeCardText!: Phaser.GameObjects.Text;
  private summaryText!: Phaser.GameObjects.Text;
  private summaryCopyButton!: Phaser.GameObjects.Text;

  private courseGfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private previewGfx!: Phaser.GameObjects.Graphics;
  private ghostGfx!: Phaser.GameObjects.Graphics;

  private backdropVisual!: Phaser.GameObjects.Image;
  private ballShadowVisual!: Phaser.GameObjects.Image;
  private ballVisual!: Phaser.GameObjects.Image;
  private cupShadowVisual!: Phaser.GameObjects.Image;
  private cupVisual!: Phaser.GameObjects.Image;
  private ghostBall!: Phaser.GameObjects.Arc;

  private movingObstacleVisuals: Array<{ body: Phaser.GameObjects.Image; shadow: Phaser.GameObjects.Image }> = [];

  private hudPanel!: Phaser.GameObjects.Image;
  private hudButtons: Phaser.GameObjects.Container[] = [];
  private hudTop!: Phaser.GameObjects.Text;
  private hudStats!: Phaser.GameObjects.Text;
  private hudTimer!: Phaser.GameObjects.Text;
  private pauseButtonLabel!: Phaser.GameObjects.Text;
  private physicsDebugText!: Phaser.GameObjects.Text;
  private wallImpactUntil = 0;
  private ballTrail: Array<{ x: number; y: number; life: number }> = [];

  private menuRows: Phaser.GameObjects.Text[] = [];
  private bootedMatch = false;
  private localPaused = false;
  private fatalError = false;
  private physicsAccumulatorSec = 0;
  private waterMessageUntilMs = 0;
  private physicsDebugEnabled = false;

  constructor(config: MinigolfSceneConfig) {
    super('minigolf-main');
    this.hooks = config.hooks;
  }

  create() {
    this.rebuildThemeTextures();

    this.backdropVisual = this.add.image(640, 360, BACKGROUND_TEXTURE_KEY).setDepth(-5);
    this.courseGfx = this.add.graphics();
    this.trailGfx = this.add.graphics();
    this.previewGfx = this.add.graphics();
    this.ghostGfx = this.add.graphics();

    this.cupShadowVisual = this.add.image(0, 0, CUP_SHADOW_TEXTURE_KEY).setDepth(4).setAlpha(0.22);
    this.cupVisual = this.add.image(0, 0, CUP_TEXTURE_KEY).setDepth(5);
    this.ballShadowVisual = this.add.image(0, 0, BALL_SHADOW_TEXTURE_KEY).setDepth(7).setAlpha(0.24);
    this.ballVisual = this.add.image(0, 0, BALL_TEXTURE_KEY).setDepth(8);
    this.ghostBall = this.add.circle(0, 0, this.ball.radius - 2, 0x8ce2ff, 0.3).setVisible(false).setDepth(6);

    this.hudPanel = this.add.image(18, 14, HUD_PANEL_TEXTURE_KEY).setOrigin(0, 0).setDepth(20).setScrollFactor(0);
    this.hudTop = this.add
      .text(32, 26, '', { color: '#ffffff', fontSize: '20px', fontStyle: '700', fontFamily: UI_FONT })
      .setDepth(21)
      .setScrollFactor(0);
    this.hudStats = this.add
      .text(32, 54, '', { color: '#d8f3ff', fontSize: '15px', fontFamily: UI_FONT })
      .setDepth(21)
      .setScrollFactor(0);
    this.hudTimer = this.add
      .text(32, 80, '', { color: '#ffd799', fontSize: '15px', fontFamily: UI_FONT })
      .setDepth(21)
      .setScrollFactor(0);

    this.createHudButtons();

    this.physicsDebugText = this.add
      .text(102, 82, '', {
        color: '#f6f7f9',
        fontSize: '14px',
        backgroundColor: '#101820'
      })
      .setDepth(22)
      .setPadding(8, 6, 8, 6)
      .setVisible(false)
      .setScrollFactor(0);

    this.buildMenu();
    this.buildHoleCard();
    this.buildSummaryCard();
    this.buildPauseCard();
    this.applyPalette();
    this.layoutHud();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.canShoot()) return;
      if (this.isPointerBlockedByHud(pointer)) return;
      this.aim.pointerDown(pointer.id, pointer.x, pointer.y);
      const event = pointer.event as PointerEvent | undefined;
      const target = event?.target as Element | null;
      if (target && event?.pointerId !== undefined && 'setPointerCapture' in target) {
        (target as Element & { setPointerCapture: (pointerId: number) => void }).setPointerCapture(event.pointerId);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.aim.pointerMove(pointer.id, pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.finishAim(pointer.id, pointer.x, pointer.y);
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      this.finishAim(pointer.id, pointer.x, pointer.y);
    });

    this.input.keyboard?.on('keydown-P', () => {
      this.localPaused = !this.localPaused;
      if (this.localPaused) this.physicsAccumulatorSec = 0;
      this.pauseButtonLabel.setText(this.localPaused ? 'Resume' : 'Pause');
      this.showCard(this.pauseContainer, this.localPaused);
      if (!this.localPaused) this.showCard(this.menuContainer, false);
    });

    this.physicsDebugEnabled = import.meta.env.DEV && (globalThis as Record<string, unknown>)[DEV_PHYSICS_FLAG] === true;
    this.input.keyboard?.on('keydown-F8', () => {
      if (!import.meta.env.DEV) return;
      this.physicsDebugEnabled = !this.physicsDebugEnabled;
      (globalThis as Record<string, unknown>)[DEV_PHYSICS_FLAG] = this.physicsDebugEnabled;
    });

    this.scale.on('resize', () => {
      this.layoutHud();
    });
  }

  update(_time: number, delta: number) {
    if (this.fatalError) return;
    this.aim.tick(delta);

    try {
      if (this.bootedMatch && this.currentHole && !this.menuContainer.visible && !this.localPaused) {
        if (!this.holeCardContainer.visible && !this.summaryContainer.visible) {
          this.session = tickSessionTime(this.session, delta);
          this.ghostRecorder.tick(delta, this.ball.x, this.ball.y);
          if (this.ghostReplay) {
            this.ghostReplay.tick(delta);
            this.ghostReplay.sample(this.ghostFollowPoint);
            this.ghostBall.setVisible(this.ghostFollowPoint.visible);
            if (this.ghostFollowPoint.visible) {
              this.ghostBall.setPosition(this.ghostFollowPoint.x, this.ghostFollowPoint.y);
            }
          }
        }

        if (this.cupRollIn && !this.holeCardContainer.visible && !this.summaryContainer.visible) {
          this.stepCupRollIn(delta);
        } else if (this.ball.moving && !this.holeCardContainer.visible && !this.summaryContainer.visible) {
          resetPhysicsStepResult(this.physicsStepResult);
          this.physicsAccumulatorSec = stepBallPhysicsFixed(
            this.ball,
            this.currentHole,
            this.session.elapsedMs,
            Math.min(0.05, delta / 1000),
            this.physicsAccumulatorSec,
            DEFAULT_PHYSICS_CONFIG,
            this.physicsScratch,
            this.slopeScratch,
            this.obstacleScratch,
            this.physicsStepResult
          );

          if (this.physicsStepResult.hitWall) {
            const wallStrength = Math.hypot(this.ball.vx, this.ball.vy);
            this.feedback.onWallHit(wallStrength);
            this.wallImpactUntil = this.time.now + 90;
            this.tweens.add({
              targets: this.ballVisual,
              scaleX: 1.04 + Math.min(0.06, wallStrength / 1800),
              scaleY: 0.96 - Math.min(0.06, wallStrength / 1800),
              duration: 55,
              yoyo: true,
              ease: 'Quad.Out'
            });
          }
          if (this.physicsStepResult.hitSand) this.playCue('sand');
          if (this.physicsStepResult.enteredWater) {
            this.playCue('water');
            triggerHaptic(14);
            this.session = applyWaterPenalty(this.session);
            findNearestSafeRespawn(
              this.currentHole,
              this.lastSafeX,
              this.lastSafeY,
              this.ball.radius,
              this.session.elapsedMs,
              this.physicsScratch,
              this.obstacleScratch,
              this.waterRespawn
            );
            this.waterMessageUntilMs = this.session.elapsedMs + 1800;
            resetBall(this.ball, this.waterRespawn.x, this.waterRespawn.y);
            this.lastSafeX = this.waterRespawn.x;
            this.lastSafeY = this.waterRespawn.y;
            this.physicsAccumulatorSec = 0;
          }

          this.updateCupCapture();

          if (!this.ball.moving) {
            this.lastSafeX = this.ball.x;
            this.lastSafeY = this.ball.y;
            this.physicsAccumulatorSec = 0;
          }
        }

        this.ballVisual.setPosition(this.ball.x, this.ball.y);
        this.ballShadowVisual.setPosition(this.ball.x + MINIGOLF_THEME.shadows.dx, this.ball.y + MINIGOLF_THEME.shadows.dy + 3);
        this.pushBallTrail(delta);
        this.drawCourse();
        this.drawBallTrail();
        this.drawPreview();
        this.updateMovingObstacleVisuals();
        this.updateHud();
        this.updateCameraMode();
      } else {
        this.pushBallTrail(delta);
        this.drawBallTrail();
        this.drawPreview();
        this.updateHud();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Minigolf runtime failure';
      this.fatalError = true;
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
      this.add
        .text(640, 360, `Minigolf error\n${message}`, { color: '#ffbdbd', align: 'center', fontSize: '24px', backgroundColor: '#341616' })
        .setOrigin(0.5)
        .setPadding(12, 10, 12, 10)
        .setDepth(200);
    }
  }

  private canShoot(): boolean {
    return (
      this.bootedMatch &&
      !this.localPaused &&
      !!this.currentHole &&
      !this.menuContainer.visible &&
      !this.holeCardContainer.visible &&
      !this.summaryContainer.visible &&
      !this.ball.moving &&
      !this.cupRollIn
    );
  }

  private isPointerBlockedByHud(pointer: Phaser.Input.Pointer): boolean {
    const panel = this.hudPanel.getBounds();
    if (panel.contains(pointer.x, pointer.y)) return true;
    for (let i = 0; i < this.hudButtons.length; i += 1) {
      if (this.hudButtons[i].getBounds().contains(pointer.x, pointer.y)) return true;
    }
    return false;
  }

  private finishAim(pointerId: number, x: number, y: number) {
    if (!this.canShoot()) {
      this.aim.cancel();
      return;
    }

    const shot = this.aim.pointerUp(pointerId, x, y, this.options.assist, this.options.sensitivity);
    if (!shot) return;
    this.takeShot(shot);
  }

  private takeShot(shot: ShotInput) {
    if (!this.currentHole) return;
    this.session = registerStroke(this.session);
    applyShot(this.ball, shot);
    this.physicsAccumulatorSec = 0;
    this.feedback.onShot(shot.power);
  }

  private updateCupCapture() {
    if (!this.currentHole || this.cupRollIn) return;
    const interaction = checkCupInteraction(this.ball, this.currentHole);
    if (interaction.captured) {
      this.cupRollIn = {
        elapsedMs: 0,
        durationMs: MINIGOLF_CUP_TUNING.rollInDurationMs,
        fromX: this.ball.x,
        fromY: this.ball.y,
        toX: this.currentHole.cup.x,
        toY: this.currentHole.cup.y
      };
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.angularVelocity = 0;
      this.ball.moving = false;
      this.physicsAccumulatorSec = 0;
      return;
    }
    if (interaction.lipOut) {
      applyCupLipOut(this.ball, this.currentHole, interaction.lipStrength);
      this.wallImpactUntil = this.time.now + 60;
    }
  }

  private stepCupRollIn(deltaMs: number) {
    if (!this.cupRollIn) return;
    this.cupRollIn.elapsedMs += deltaMs;
    const t = Math.min(1, this.cupRollIn.elapsedMs / this.cupRollIn.durationMs);
    const eased = 1 - (1 - t) * (1 - t);
    this.ball.x = this.cupRollIn.fromX + (this.cupRollIn.toX - this.cupRollIn.fromX) * eased;
    this.ball.y = this.cupRollIn.fromY + (this.cupRollIn.toY - this.cupRollIn.fromY) * eased;
    if (t >= 1) {
      this.ball.x = this.cupRollIn.toX;
      this.ball.y = this.cupRollIn.toY;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.angularVelocity = 0;
      this.ball.moving = false;
      this.cupRollIn = null;
      this.handleHoleSink();
    }
  }

  private handleHoleSink() {
    if (!this.currentHole || this.pendingHoleResult) return;

    this.feedback.onCupSink();

    this.pendingHoleResult = {
      holeId: this.currentHole.id,
      par: this.currentHole.par
    };

    if (this.options.mode === 'ghost') {
      this.commitGhostIfBest();
    }

    const delta = this.session.currentHoleStrokes - this.currentHole.par;
    this.holeCardText.setText(
      `Hole Complete\n${this.currentHole.name}\nStrokes: ${this.session.currentHoleStrokes}\nPar: ${this.currentHole.par} (${parLabel(delta)})`
    );
    this.showCard(this.holeCardContainer, true);
  }

  private commitGhostIfBest() {
    if (!this.currentHole) return;
    const holeId = this.currentHole.id;
    const run = this.ghostRecorder.flush(holeId);
    const existing = this.ghostStore[holeId];
    const nextRecord: StoredGhostRecord = {
      holeId,
      strokes: this.session.currentHoleStrokes,
      timeMs: this.session.currentHoleTimeMs,
      points: run.points
    };

    const better =
      !existing ||
      nextRecord.strokes < existing.strokes ||
      (nextRecord.strokes === existing.strokes && nextRecord.timeMs < existing.timeMs);

    if (better) {
      this.ghostStore[holeId] = nextRecord;
      saveGhostStore(this.ghostStore);
    }
  }

  private createCanvasTexture(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void
  ) {
    const dpr = Math.max(1, Math.min(2, Math.round(window.devicePixelRatio || 1)));
    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    const texture = this.textures.createCanvas(key, Math.max(2, Math.round(width * dpr)), Math.max(2, Math.round(height * dpr)));
    const ctx = texture.getContext();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height, dpr);
    texture.refresh();
  }

  private rebuildThemeTextures() {
    const p = this.palette;
    const backgroundLight = colorToCss(mixColor(p.turf, 0xffffff, 0.12));
    const backgroundDark = colorToCss(mixColor(p.turfEdge, 0x000000, 0.12));
    const neutral = colorToCss(p.wall);

    // Top-left light source and edge vignette are intentionally centralized here.
    this.createCanvasTexture(BACKGROUND_TEXTURE_KEY, 1280, 720, (ctx, w, h) => {
      const directional = ctx.createLinearGradient(0, 0, w, h);
      directional.addColorStop(0, backgroundLight);
      directional.addColorStop(1, backgroundDark);
      ctx.fillStyle = directional;
      ctx.fillRect(0, 0, w, h);

      const vignette = ctx.createRadialGradient(w * 0.52, h * 0.46, w * 0.1, w * 0.5, h * 0.52, w * 0.72);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    });

    this.createCanvasTexture(BALL_TEXTURE_KEY, 36, 36, (ctx, w, h) => {
      const c = w * 0.5;
      const grad = ctx.createRadialGradient(c - 5, c - 6, 2, c, c, c - 1);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, colorToCss(p.ball));
      grad.addColorStop(1, colorToCss(p.ballStroke));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c, c, c - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.beginPath();
      ctx.arc(c - 6, c - 7, 4.2, 0, Math.PI * 2);
      ctx.fill();
    });

    this.createCanvasTexture(BALL_SHADOW_TEXTURE_KEY, 42, 20, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.52, h * 0.12, w * 0.5, h * 0.52, w * 0.46);
      grad.addColorStop(0, `rgba(0,0,0,${MINIGOLF_THEME.shadows.hardAlpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    this.createCanvasTexture(CUP_TEXTURE_KEY, 40, 40, (ctx, w, h) => {
      const c = w * 0.5;
      const rimGrad = ctx.createLinearGradient(0, 0, w, h);
      rimGrad.addColorStop(0, '#ffffff');
      rimGrad.addColorStop(1, neutral);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(c, c, c - 0.5, 0, Math.PI * 2);
      ctx.fill();

      const cupGrad = ctx.createRadialGradient(c - 2, c - 3, 2, c, c, c - 8);
      cupGrad.addColorStop(0, '#25302a');
      cupGrad.addColorStop(1, colorToCss(p.cupDark));
      ctx.fillStyle = cupGrad;
      ctx.beginPath();
      ctx.arc(c, c, c - 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c - 2, c - 2, c - 7, Math.PI * 1.05, Math.PI * 1.9);
      ctx.stroke();
    });

    this.createCanvasTexture(CUP_SHADOW_TEXTURE_KEY, 48, 28, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.12, w * 0.5, h * 0.45, h * 0.92);
      grad.addColorStop(0, `rgba(0,0,0,${MINIGOLF_THEME.shadows.softAlpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });

    this.createCanvasTexture(OBSTACLE_TEXTURE_KEY, 96, 40, (ctx, w, h) => {
      const r = MINIGOLF_THEME.radii.md;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, colorToCss(p.wallShadow));
      ctx.fillStyle = grad;
      ctx.beginPath();
      roundedRectPath(ctx, 1, 1, w - 2, h - 2, r);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundedRectPath(ctx, 2, 2, w - 4, h - 4, r - 1);
      ctx.stroke();
    });

    this.createCanvasTexture(OBSTACLE_SHADOW_TEXTURE_KEY, 96, 42, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.03)');
      grad.addColorStop(1, `rgba(0,0,0,${MINIGOLF_THEME.shadows.softAlpha})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      roundedRectPath(ctx, 1, 1, w - 2, h - 2, MINIGOLF_THEME.radii.md);
      ctx.fill();
    });

    this.createCanvasTexture(HUD_PANEL_TEXTURE_KEY, 760, 116, (ctx, w, h) => {
      ctx.fillStyle = p.panelBg;
      ctx.beginPath();
      roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, MINIGOLF_THEME.radii.lg);
      ctx.fill();
      ctx.strokeStyle = p.panelStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, MINIGOLF_THEME.radii.lg);
      ctx.stroke();
      const topLight = ctx.createLinearGradient(0, 0, 0, h);
      topLight.addColorStop(0, 'rgba(255,255,255,0.12)');
      topLight.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = topLight;
      ctx.beginPath();
      roundedRectPath(ctx, 1, 1, w - 2, h * 0.56, MINIGOLF_THEME.radii.lg);
      ctx.fill();
    });

    this.createCanvasTexture(HUD_BUTTON_TEXTURE_KEY, 148, 48, (ctx, w, h) => {
      ctx.fillStyle = p.buttonBg;
      ctx.beginPath();
      roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, MINIGOLF_THEME.radii.xl);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, MINIGOLF_THEME.radii.xl);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.beginPath();
      roundedRectPath(ctx, 2, 2, w - 4, h * 0.46, MINIGOLF_THEME.radii.xl);
      ctx.fill();
    });

    this.createCanvasTexture(HUD_BUTTON_ALT_TEXTURE_KEY, 148, 48, (ctx, w, h) => {
      ctx.fillStyle = p.buttonAltBg;
      ctx.beginPath();
      roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, MINIGOLF_THEME.radii.xl);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.11)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundedRectPath(ctx, 0.5, 0.5, w - 1, h - 1, MINIGOLF_THEME.radii.xl);
      ctx.stroke();
    });
  }

  private createHudButtons() {
    const pause = this.createHudButton('Pause', HUD_BUTTON_TEXTURE_KEY, () => {
      this.localPaused = !this.localPaused;
      if (this.localPaused) this.physicsAccumulatorSec = 0;
      this.pauseButtonLabel.setText(this.localPaused ? 'Resume' : 'Pause');
      this.showCard(this.pauseContainer, this.localPaused);
      if (!this.localPaused) this.showCard(this.menuContainer, false);
      this.playCue('ui');
    });
    this.pauseButtonLabel = pause.getData('label') as Phaser.GameObjects.Text;

    const settings = this.createHudButton('Settings', HUD_BUTTON_ALT_TEXTURE_KEY, () => {
      this.playCue('ui');
      this.localPaused = true;
      this.pauseButtonLabel.setText('Resume');
      this.showCard(this.pauseContainer, true);
      this.showCard(this.menuContainer, true);
    });
    const finish = this.createHudButton('Finish Round', HUD_BUTTON_ALT_TEXTURE_KEY, () => {
      this.playCue('ui');
      this.bootedMatch = false;
      this.localPaused = false;
      this.pendingHoleResult = null;
      this.showCard(this.pauseContainer, false);
      this.showCard(this.summaryContainer, false);
      this.showCard(this.holeCardContainer, false);
      this.showCard(this.menuContainer, true);
      this.pauseButtonLabel.setText('Pause');
    });

    this.hudButtons = [pause, settings, finish];
  }

  private createHudButton(label: string, textureKey: string, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.image(0, 0, textureKey).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(74, 24, label, { color: this.palette.buttonText, fontSize: '17px', fontFamily: UI_FONT, fontStyle: '700' })
      .setOrigin(0.5);
    const button = this.add.container(0, 0, [bg, text]).setDepth(23).setScrollFactor(0);
    button.setData('label', text);
    bg.on('pointerdown', () => {
      button.setScale(0.98);
      onClick();
    });
    bg.on('pointerup', () => button.setScale(1));
    bg.on('pointerout', () => button.setScale(1));
    return button;
  }

  private layoutHud() {
    const width = this.scale.width;
    const safeX = MINIGOLF_THEME.spacing.sm;
    const safeY = MINIGOLF_THEME.spacing.sm;
    this.hudPanel.setPosition(safeX, safeY);
    this.hudTop.setPosition(safeX + 14, safeY + 12);
    this.hudStats.setPosition(safeX + 14, safeY + 40);
    this.hudTimer.setPosition(safeX + 14, safeY + 66);

    const buttonWidth = 148;
    const gap = MINIGOLF_THEME.spacing.sm;
    let nextX = width - safeX - buttonWidth;
    for (let i = this.hudButtons.length - 1; i >= 0; i -= 1) {
      this.hudButtons[i].setPosition(nextX, safeY);
      nextX -= buttonWidth + gap;
    }
    this.physicsDebugText.setPosition(safeX + 6, safeY + 94);
  }

  private showCard(container: Phaser.GameObjects.Container, visible: boolean) {
    if (visible) {
      container.setVisible(true).setAlpha(0);
      container.setY(container.y + 10);
      this.tweens.add({ targets: container, alpha: 1, y: container.y - 10, duration: 120, ease: 'Quad.Out' });
      return;
    }
    if (!container.visible) return;
    this.tweens.add({
      targets: container,
      alpha: 0,
      y: container.y + 8,
      duration: 100,
      ease: 'Quad.In',
      onComplete: () => {
        container.setVisible(false);
        container.setAlpha(1);
        container.setY(0);
      }
    });
  }

  private pushBallTrail(delta: number) {
    const lifeStep = delta / 260;
    for (let i = this.ballTrail.length - 1; i >= 0; i -= 1) {
      this.ballTrail[i].life -= lifeStep;
      if (this.ballTrail[i].life <= 0) {
        this.ballTrail.splice(i, 1);
      }
    }
    if (!this.ball.moving) return;
    const last = this.ballTrail[this.ballTrail.length - 1];
    if (last) {
      const dx = last.x - this.ball.x;
      const dy = last.y - this.ball.y;
      if (dx * dx + dy * dy < 20) return;
    }
    this.ballTrail.push({ x: this.ball.x, y: this.ball.y, life: 1 });
    if (this.ballTrail.length > 10) {
      this.ballTrail.shift();
    }
  }

  private drawBallTrail() {
    this.trailGfx.clear();
    if (this.ballTrail.length < 2) return;
    for (let i = 1; i < this.ballTrail.length; i += 1) {
      const a = this.ballTrail[i - 1];
      const b = this.ballTrail[i];
      const alpha = 0.08 * Math.min(a.life, b.life);
      this.trailGfx.lineStyle(3, this.palette.previewPrimary, alpha);
      this.trailGfx.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private buildMenu() {
    const rows: MenuRow[] = [
      {
        label: () => `Mode: ${formatMode(this.settings.mode)}`,
        onClick: () => {
          const order: MinigolfMode[] = ['stroke', 'time_attack', 'ghost'];
          const idx = order.indexOf(this.settings.mode);
          this.settings.mode = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Course: ${formatTheme(this.settings.courseSelection)}`,
        onClick: () => {
          const order: Array<'all_18' | MinigolfTheme> = ['all_18', 'classic', 'neon', 'backyard'];
          const idx = order.indexOf(this.settings.courseSelection);
          this.settings.courseSelection = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Practice: ${this.settings.practice ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.practice = !this.settings.practice;
          this.refreshMenu();
        }
      },
      {
        label: () => `Practice Hole: ${this.settings.practiceHoleId}`,
        onClick: () => {
          const ids = this.holes.map((hole) => hole.id);
          const idx = ids.indexOf(this.settings.practiceHoleId);
          this.settings.practiceHoleId = ids[(idx + 1) % ids.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Sensitivity: ${this.settings.sensitivity}`,
        onClick: () => {
          const order: MinigolfSensitivity[] = ['low', 'medium', 'high'];
          const idx = order.indexOf(this.settings.sensitivity);
          this.settings.sensitivity = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Preview Line: ${this.settings.previewLine ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.previewLine = !this.settings.previewLine;
          this.refreshMenu();
        }
      },
      {
        label: () => `Ball Cam: ${this.settings.ballCam ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.ballCam = !this.settings.ballCam;
          this.refreshMenu();
        }
      },
      {
        label: () => `Assist: ${this.settings.assist ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.assist = !this.settings.assist;
          this.refreshMenu();
        }
      },
      {
        label: () => `Race Ghost: ${this.settings.raceGhost ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.raceGhost = !this.settings.raceGhost;
          this.refreshMenu();
        }
      }
    ];

    const children: Phaser.GameObjects.GameObject[] = [];

    const panel = this.add.rectangle(640, 360, 620, 560, 0x0b1320, 0.94).setStrokeStyle(2, 0x2f4f73);
    const title = this.add.text(640, 126, 'Minigolf', { color: '#ffffff', fontSize: '40px', fontFamily: UI_FONT }).setOrigin(0.5);
    const subtitle = this.add
      .text(640, 165, 'Drag aim, pull back power, release to shoot', { color: '#bcdcff', fontSize: '18px', fontFamily: UI_FONT })
      .setOrigin(0.5);

    children.push(panel, title, subtitle);

    this.menuRows = [];
    rows.forEach((row, index) => {
      const y = 212 + index * 40;
      const text = this.add
        .text(640, y, '', { color: '#d8ebff', fontSize: '22px', backgroundColor: '#1f3550', fontFamily: UI_FONT })
        .setPadding(10, 6, 10, 6)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          row.onClick();
          this.playCue('ui');
        });
      text.setData('labelFn', row.label);
      this.menuRows.push(text);
      children.push(text);
    });

    const start = this.add
      .text(640, 548, 'Start Round', { color: '#072013', fontSize: '28px', backgroundColor: '#9df0b4', fontFamily: UI_FONT })
      .setOrigin(0.5)
      .setPadding(14, 8, 14, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startRound());

    const back = this.add
      .text(640, 596, 'Back to Lobby', { color: '#d8ebff', fontSize: '20px', backgroundColor: '#274562', fontFamily: UI_FONT })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    children.push(start, back);

    this.menuContainer = this.add.container(0, 0, children).setDepth(60);
    this.refreshMenu();
  }

  private refreshMenu() {
    for (let i = 0; i < this.menuRows.length; i += 1) {
      const row = this.menuRows[i];
      const labelFn = row.getData('labelFn') as (() => string) | undefined;
      if (labelFn) {
        row.setText(labelFn());
      }
    }
  }

  private buildHoleCard() {
    const panel = this.add.rectangle(640, 360, 460, 300, 0x0a1521, 0.95).setStrokeStyle(2, 0x375d82);
    const title = this.add.text(640, 252, 'Hole Complete', { color: '#fff', fontSize: '32px', fontFamily: UI_FONT }).setOrigin(0.5);
    this.holeCardText = this.add.text(640, 338, '', { color: '#d3e9ff', align: 'center', fontSize: '22px', fontFamily: UI_FONT }).setOrigin(0.5);

    const retry = this.add
      .text(560, 458, 'Retry Hole', { color: '#051322', fontSize: '21px', backgroundColor: '#f7c97f', fontFamily: UI_FONT })
      .setPadding(12, 7, 12, 7)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.retryHole());

    const next = this.add
      .text(720, 458, 'Next Hole', { color: '#051322', fontSize: '21px', backgroundColor: '#93eca9', fontFamily: UI_FONT })
      .setPadding(12, 7, 12, 7)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.advanceHole());

    this.holeCardContainer = this.add.container(0, 0, [panel, title, this.holeCardText, retry, next]).setDepth(70);
    this.holeCardContainer.setVisible(false);
  }

  private buildSummaryCard() {
    const panel = this.add.rectangle(640, 360, 760, 500, 0x081422, 0.95).setStrokeStyle(2, 0x3a5f85);
    const title = this.add.text(640, 196, 'Course Complete', { color: '#ffffff', fontSize: '34px', fontFamily: UI_FONT }).setOrigin(0.5);
    this.summaryText = this.add.text(640, 326, '', { color: '#d8ecff', align: 'center', fontSize: '18px', wordWrap: { width: 680 }, fontFamily: UI_FONT }).setOrigin(0.5);

    this.summaryCopyButton = this.add
      .text(640, 492, 'Copy Scorecard', { color: '#051b18', fontSize: '20px', backgroundColor: '#d8f3ff', fontFamily: UI_FONT })
      .setOrigin(0.5)
      .setPadding(12, 7, 12, 7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const scorecard = this.buildScorecardString();
        void navigator.clipboard?.writeText(scorecard);
        this.summaryCopyButton.setText('Copied Scorecard');
      });

    const rematch = this.add
      .text(520, 548, 'Play Again', { color: '#051b18', fontSize: '24px', backgroundColor: '#9de8b2', fontFamily: UI_FONT })
      .setOrigin(0.5)
      .setPadding(12, 7, 12, 7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.summaryContainer.setVisible(false);
        this.menuContainer.setVisible(true);
      });

    const back = this.add
      .text(760, 548, 'Back to Lobby', { color: '#d8ebff', fontSize: '20px', backgroundColor: '#254563', fontFamily: UI_FONT })
      .setOrigin(0.5)
      .setPadding(12, 7, 12, 7)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.summaryContainer = this.add.container(0, 0, [panel, title, this.summaryText, this.summaryCopyButton, rematch, back]).setDepth(75);
    this.summaryContainer.setVisible(false);
  }

  private buildPauseCard() {
    const panel = this.add.rectangle(640, 360, 320, 180, 0x091520, 0.92).setStrokeStyle(2, 0x315574);
    const text = this.add.text(640, 334, 'Paused', { color: '#ffffff', fontSize: '32px', fontFamily: UI_FONT }).setOrigin(0.5);
    const hint = this.add.text(640, 378, 'Tap Resume or press P', { color: '#bddcff', fontSize: '18px', fontFamily: UI_FONT }).setOrigin(0.5);
    this.pauseContainer = this.add.container(0, 0, [panel, text, hint]).setDepth(68);
    this.pauseContainer.setVisible(false);
  }

  private applyPalette() {
    const p = this.palette;
    this.cameras.main.setBackgroundColor(p.background);
    this.rebuildThemeTextures();
    this.backdropVisual.setTexture(BACKGROUND_TEXTURE_KEY);
    this.ballVisual.setTexture(BALL_TEXTURE_KEY);
    this.ballShadowVisual.setTexture(BALL_SHADOW_TEXTURE_KEY);
    this.cupVisual.setTexture(CUP_TEXTURE_KEY);
    this.cupShadowVisual.setTexture(CUP_SHADOW_TEXTURE_KEY);
    this.ghostBall.setFillStyle(p.ghostBall, 0.32);
    this.hudPanel.setTexture(HUD_PANEL_TEXTURE_KEY);

    this.hudTop.setStyle({ color: p.hudPrimary, fontFamily: UI_FONT });
    this.hudStats.setStyle({ color: p.hudSecondary, fontFamily: UI_FONT });
    this.hudTimer.setStyle({ color: p.hudTimer, fontFamily: UI_FONT });
    this.physicsDebugText.setStyle({ fontFamily: UI_FONT });
    for (let i = 0; i < this.hudButtons.length; i += 1) {
      const label = this.hudButtons[i].getData('label') as Phaser.GameObjects.Text;
      if (label) label.setStyle({ color: p.buttonText, fontFamily: UI_FONT });
      const bg = (this.hudButtons[i].list[0] as Phaser.GameObjects.Image | undefined) ?? null;
      if (bg && i === 0) bg.setTexture(HUD_BUTTON_TEXTURE_KEY);
      if (bg && i > 0) bg.setTexture(HUD_BUTTON_ALT_TEXTURE_KEY);
    }

    for (let i = 0; i < this.menuRows.length; i += 1) {
      this.menuRows[i].setStyle({ color: p.hudPrimary, backgroundColor: 'rgba(15,22,30,0.64)', fontFamily: UI_FONT });
    }

    this.holeCardText?.setStyle({ color: p.hudSecondary, fontFamily: UI_FONT });
    this.summaryText?.setStyle({ color: p.hudSecondary, fontFamily: UI_FONT });
    this.summaryCopyButton?.setStyle({ backgroundColor: p.buttonBg, color: p.buttonText, fontFamily: UI_FONT });
  }

  private startRound() {
    const holeOrder = this.resolveHoleOrder();
    this.options = {
      mode: this.settings.mode,
      courseSelection: this.settings.practice ? 'practice' : this.settings.courseSelection,
      practiceHoleId: this.settings.practice ? this.settings.practiceHoleId : null,
      previewLine: this.settings.previewLine,
      ballCam: this.settings.ballCam,
      assist: this.settings.assist,
      sensitivity: this.settings.sensitivity
    };

    this.session = createInitialSession({
      mode: this.settings.mode,
      holeOrder,
      practice: this.settings.practice
    });
    this.bootedMatch = true;
    this.localPaused = false;
    this.pauseContainer.setVisible(false);
    this.pauseButtonLabel.setText('Pause');
    this.pendingHoleResult = null;
    this.physicsAccumulatorSec = 0;
    this.waterMessageUntilMs = 0;
    this.cupRollIn = null;

    this.menuContainer.setVisible(false);
    this.holeCardContainer.setVisible(false);
    this.summaryContainer.setVisible(false);
    this.ballTrail.length = 0;

    saveStoredSettings(this.settings);

    this.loadCurrentHole();

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.options.mode,
      courseSelection: this.options.courseSelection,
      options: {
        previewLine: this.options.previewLine,
        ballCam: this.options.ballCam,
        assist: this.options.assist,
        sensitivity: this.options.sensitivity,
        practice: this.settings.practice
      }
    });
  }

  private resolveHoleOrder(): string[] {
    if (this.settings.practice) {
      return [this.settings.practiceHoleId];
    }

    if (this.settings.courseSelection === 'all_18') {
      return this.holes.map((hole) => hole.id);
    }

    const theme = this.settings.courseSelection;
    return this.holes.filter((hole) => hole.theme === theme).map((hole) => hole.id);
  }

  private loadCurrentHole() {
    const holeId = getCurrentHoleId(this.session);
    if (!holeId) {
      this.finishCourse();
      return;
    }

    this.currentHole = getHoleById(holeId);
    const start = this.currentHole.start;
    this.palette = getThemePalette(this.currentHole.theme);
    this.applyPalette();

    resetBall(this.ball, start.x, start.y);
    this.ballVisual.setPosition(start.x, start.y);
    this.ballShadowVisual.setPosition(start.x + MINIGOLF_THEME.shadows.dx, start.y + MINIGOLF_THEME.shadows.dy + 3);
    this.cupVisual.setPosition(this.currentHole.cup.x, this.currentHole.cup.y);
    this.cupShadowVisual.setPosition(this.currentHole.cup.x + MINIGOLF_THEME.shadows.dx, this.currentHole.cup.y + MINIGOLF_THEME.shadows.dy + 4);
    this.lastSafeX = start.x;
    this.lastSafeY = start.y;
    this.physicsAccumulatorSec = 0;
    this.cupRollIn = null;
    this.cameraController.reset();
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);

    this.ghostRecorder.reset();
    this.configureGhostReplayForHole();
    this.syncObstacleVisuals();
    this.drawCourse();
    this.drawGhostPath();
    this.updateHud();
  }

  private configureGhostReplayForHole() {
    if (!this.currentHole || this.options.mode !== 'ghost') {
      this.ghostReplay = null;
      this.ghostBall.setVisible(false);
      return;
    }

    const record = this.ghostStore[this.currentHole.id];
    if (!record || record.points.length < 2) {
      this.ghostReplay = null;
      this.ghostBall.setVisible(false);
      return;
    }

    this.ghostReplay = createGhostReplay(record.points);
    this.ghostReplay.reset();
    this.ghostBall.setVisible(true);
  }

  private syncObstacleVisuals() {
    for (let i = 0; i < this.movingObstacleVisuals.length; i += 1) {
      this.movingObstacleVisuals[i].body.destroy();
      this.movingObstacleVisuals[i].shadow.destroy();
    }
    this.movingObstacleVisuals.length = 0;

    if (!this.currentHole) return;
    for (let i = 0; i < this.currentHole.movingObstacles.length; i += 1) {
      const obstacle = this.currentHole.movingObstacles[i];
      const x = obstacle.x + obstacle.width * 0.5;
      const y = obstacle.y + obstacle.height * 0.5;
      const shadow = this.add.image(x, y, OBSTACLE_SHADOW_TEXTURE_KEY).setDepth(3.8).setAlpha(0.2);
      const body = this.add.image(x, y, OBSTACLE_TEXTURE_KEY).setDepth(4.2);
      shadow.setDisplaySize(obstacle.width + 6, obstacle.height + 6);
      body.setDisplaySize(obstacle.width, obstacle.height);
      this.movingObstacleVisuals.push({ body, shadow });
    }
  }

  private updateMovingObstacleVisuals() {
    if (!this.currentHole) return;
    for (let i = 0; i < this.currentHole.movingObstacles.length; i += 1) {
      const obstacle = this.currentHole.movingObstacles[i];
      const visual = this.movingObstacleVisuals[i];
      if (!visual) continue;
      const phase = obstacle.phase + (this.session.elapsedMs / 1000) * obstacle.speed;
      const offset = Math.sin(phase) * obstacle.range;
      const x = obstacle.axis === 'x' ? obstacle.x + offset : obstacle.x;
      const y = obstacle.axis === 'y' ? obstacle.y + offset : obstacle.y;
      const cx = x + obstacle.width * 0.5;
      const cy = y + obstacle.height * 0.5;
      visual.shadow.setPosition(cx + MINIGOLF_THEME.shadows.dx, cy + MINIGOLF_THEME.shadows.dy);
      visual.body.setPosition(cx, cy);
    }
  }

  private retryHole() {
    if (!this.currentHole) return;
    this.playCue('ui');
    this.pendingHoleResult = null;
    this.session = retryCurrentHole(this.session);
    resetBall(this.ball, this.currentHole.start.x, this.currentHole.start.y);
    this.lastSafeX = this.currentHole.start.x;
    this.lastSafeY = this.currentHole.start.y;
    this.physicsAccumulatorSec = 0;
    this.cupRollIn = null;
    this.ghostRecorder.reset();
    if (this.ghostReplay) {
      this.ghostReplay.reset();
    }
    this.holeCardContainer.setVisible(false);
  }

  private advanceHole() {
    if (!this.pendingHoleResult || !this.currentHole) return;
    this.playCue('ui');
    const hole = this.pendingHoleResult;
    this.pendingHoleResult = null;
    this.holeCardContainer.setVisible(false);

    this.session = completeCurrentHole(this.session, hole.holeId, hole.par);
    if (this.session.finished) {
      this.finishCourse();
      return;
    }

    this.loadCurrentHole();
  }

  private finishCourse() {
    const summary = buildSessionSummary(this.session);
    const perHole = this.session.completedHoles
      .map((entry, index) => {
        const delta = entry.strokes - entry.par;
        return `H${index + 1}:${entry.strokes}/${entry.par}(${delta >= 0 ? '+' : ''}${delta})`;
      })
      .join('  ');
    this.summaryText.setText(
      `Strokes: ${summary.totalStrokes}\nPar: ${summary.totalPar} (${summary.parDelta >= 0 ? '+' : ''}${summary.parDelta})\nTime: ${(summary.totalTimeMs / 1000).toFixed(2)}s\nBest Hole: ${summary.bestHole ? `${summary.bestHole.id} (${summary.bestHole.delta >= 0 ? '+' : ''}${summary.bestHole.delta})` : '-'}\nWorst Hole: ${summary.worstHole ? `${summary.worstHole.id} (${summary.worstHole.delta >= 0 ? '+' : ''}${summary.worstHole.delta})` : '-'}\n\n${perHole}`
    );
    this.summaryCopyButton.setText('Copy Scorecard');

    this.showCard(this.summaryContainer, true);
    this.ghostBall.setVisible(false);

    const practiceMode = this.settings.practice;
    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: practiceMode ? 'practice' : this.options.mode,
      totalStrokes: summary.totalStrokes,
      totalTimeMs: this.options.mode === 'time_attack' ? summary.totalTimeMs : undefined,
      parDelta: summary.parDelta,
      holesPlayed: summary.holesPlayed
    });

    if (!practiceMode) {
      void window.gamegridAds?.requestInterstitial({ reason: 'course_end', gameId: this.hooks.gameId });
    }
  }

  private buildScorecardString(): string {
    const summary = buildSessionSummary(this.session);
    const holeCards = this.session.completedHoles.map((entry) => `${entry.holeId}:${entry.strokes}/${entry.par}`).join('|');
    return `GG-MINIGOLF|mode=${this.options.mode}|strokes=${summary.totalStrokes}|par=${summary.totalPar}|delta=${summary.parDelta}|timeMs=${summary.totalTimeMs}|holes=${holeCards}`;
  }

  private drawCourse() {
    if (!this.currentHole) return;

    const hole = this.currentHole;
    const g = this.courseGfx;
    g.clear();
    g.fillGradientStyle(
      mixColor(this.palette.turf, 0xffffff, 0.08),
      this.palette.turf,
      this.palette.turf,
      mixColor(this.palette.turfEdge, 0x000000, 0.08),
      1
    );
    g.fillRect(hole.bounds.x, hole.bounds.y, hole.bounds.width, hole.bounds.height);

    const stripeWidth = 60;
    for (let x = hole.bounds.x; x < hole.bounds.x + hole.bounds.width; x += stripeWidth * 2) {
      g.fillStyle(this.palette.turfStripe, 0.11);
      g.fillRect(x, hole.bounds.y, stripeWidth, hole.bounds.height);
    }

    g.lineStyle(8, this.palette.turfBorder, 0.9);
    g.strokeRect(hole.bounds.x, hole.bounds.y, hole.bounds.width, hole.bounds.height);
    g.lineStyle(2, this.palette.wallHighlight, 0.22);
    g.strokeRect(hole.bounds.x + 2, hole.bounds.y + 2, hole.bounds.width - 4, hole.bounds.height - 4);

    const surfaces = hole.hazards.surfaces;
    for (let i = 0; i < surfaces.length; i += 1) {
      const zone = surfaces[i];
      const color = zone.material === 'sand' ? this.palette.sand : zone.material === 'ice' ? this.palette.ice : this.palette.rough;
      g.fillStyle(0x000000, 0.08);
      g.fillRoundedRect(zone.x + MINIGOLF_THEME.shadows.dx, zone.y + MINIGOLF_THEME.shadows.dy, zone.width, zone.height, MINIGOLF_THEME.radii.sm);
      g.fillGradientStyle(mixColor(color, 0xffffff, 0.1), color, color, mixColor(color, 0x000000, 0.08), zone.material === 'ice' ? 0.52 : 0.74);
      g.fillRoundedRect(zone.x, zone.y, zone.width, zone.height, MINIGOLF_THEME.radii.sm);
    }

    const water = hole.hazards.water;
    g.fillStyle(this.palette.water, 0.84);
    g.lineStyle(2, this.palette.waterStroke, 0.74);
    for (let i = 0; i < water.length; i += 1) {
      const hazard = water[i];
      if (hazard.kind === 'rect') {
        g.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
        g.strokeRect(hazard.x, hazard.y, hazard.width, hazard.height);
      } else if (hazard.points.length > 2) {
        g.beginPath();
        g.moveTo(hazard.points[0].x, hazard.points[0].y);
        for (let p = 1; p < hazard.points.length; p += 1) {
          g.lineTo(hazard.points[p].x, hazard.points[p].y);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    }

    const slopes = hole.hazards.slopes;
    g.lineStyle(1.5, this.palette.slope, 0.5);
    for (let i = 0; i < slopes.length; i += 1) {
      const slope = slopes[i];
      g.strokeRect(slope.x, slope.y, slope.width, slope.height);
      g.lineBetween(
        slope.x + slope.width * 0.5,
        slope.y + slope.height * 0.5,
        slope.x + slope.width * 0.5 + slope.forceX * 0.9,
        slope.y + slope.height * 0.5 + slope.forceY * 0.9
      );
    }

    g.lineStyle(8, this.palette.wallShadow, 0.4);
    for (let i = 0; i < hole.walls.length; i += 1) {
      const wall = hole.walls[i];
      g.lineBetween(wall.x1 + 1.5, wall.y1 + 1.5, wall.x2 + 1.5, wall.y2 + 1.5);
    }
    g.lineStyle(8, this.palette.wall, 1);
    for (let i = 0; i < hole.walls.length; i += 1) {
      const wall = hole.walls[i];
      g.lineBetween(wall.x1, wall.y1, wall.x2, wall.y2);
    }
    g.lineStyle(2.5, this.palette.wallHighlight, 0.7);
    for (let i = 0; i < hole.walls.length; i += 1) {
      const wall = hole.walls[i];
      g.lineBetween(wall.x1 - 1.4, wall.y1 - 1.4, wall.x2 - 1.4, wall.y2 - 1.4);
    }
    g.lineStyle(2.3, this.palette.wallShadow, 0.6);
    for (let i = 0; i < hole.walls.length; i += 1) {
      const wall = hole.walls[i];
      g.lineBetween(wall.x1 + 1.2, wall.y1 + 1.2, wall.x2 + 1.2, wall.y2 + 1.2);
    }

    for (let i = 0; i < hole.bumpers.length; i += 1) {
      const bumper = hole.bumpers[i];
      if (bumper.kind === 'circle') {
        g.fillStyle(0x000000, 0.15);
        g.fillCircle(bumper.x + MINIGOLF_THEME.shadows.dx, bumper.y + MINIGOLF_THEME.shadows.dy, bumper.radius + 1);
        g.fillStyle(this.palette.wallShadow, 0.96);
        g.fillCircle(bumper.x, bumper.y, bumper.radius);
        g.fillStyle(this.palette.bumper, 0.98);
        g.fillCircle(bumper.x - 1.5, bumper.y - 1.5, Math.max(2, bumper.radius - 2));
        g.fillStyle(this.palette.wallHighlight, 0.34);
        g.fillCircle(bumper.x - bumper.radius * 0.35, bumper.y - bumper.radius * 0.35, Math.max(1.5, bumper.radius * 0.3));
      } else {
        g.fillStyle(0x000000, 0.14);
        g.fillRoundedRect(
          bumper.x + MINIGOLF_THEME.shadows.dx,
          bumper.y + MINIGOLF_THEME.shadows.dy,
          bumper.width,
          bumper.height,
          MINIGOLF_THEME.radii.sm
        );
        g.fillStyle(this.palette.bumper, 0.98);
        g.fillRoundedRect(bumper.x, bumper.y, bumper.width, bumper.height, MINIGOLF_THEME.radii.sm);
        g.lineStyle(1.5, this.palette.wallHighlight, 0.6);
        g.strokeRoundedRect(bumper.x + 1, bumper.y + 1, bumper.width - 2, bumper.height - 2, MINIGOLF_THEME.radii.sm);
        g.lineStyle(1.4, this.palette.wallShadow, 0.48);
        g.strokeRoundedRect(bumper.x, bumper.y, bumper.width, bumper.height, MINIGOLF_THEME.radii.sm);
      }
    }

    const impactAlpha = this.time.now < this.wallImpactUntil ? 0.06 : 0;
    if (impactAlpha > 0) {
      g.fillStyle(this.palette.previewImpact, impactAlpha);
      g.fillRect(hole.bounds.x, hole.bounds.y, hole.bounds.width, hole.bounds.height);
    }

    if (this.physicsDebugEnabled) {
      g.lineStyle(2, 0xff5f5f, 0.8);
      g.lineBetween(this.ball.x, this.ball.y, this.ball.x + this.ball.vx * 0.16, this.ball.y + this.ball.vy * 0.16);
      g.lineStyle(2, 0x7dd3fc, 0.7);
      g.strokeCircle(this.lastSafeX, this.lastSafeY, this.ball.radius + 4);
      const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);
      this.physicsDebugText
        .setText(`physics-debug  speed:${speed.toFixed(1)}  spin:${this.ball.angularVelocity.toFixed(1)}  rest:${this.ball.restFrames}`)
        .setVisible(true);
    } else {
      this.physicsDebugText.setVisible(false);
    }
  }

  private drawPreview() {
    this.previewGfx.clear();
    if (!this.options || !this.options.previewLine || !this.currentHole) return;
    if (!this.aim.isAiming() || this.ball.moving || this.cupRollIn) return;

    this.aim.buildPreview(this.ball.x, this.ball.y, this.currentHole, this.options.assist, this.options.sensitivity, this.preview);
    if (!this.preview.visible) return;

    this.previewGfx.lineStyle(2, this.palette.previewPrimary, 0.7);
    this.previewGfx.lineBetween(this.preview.startX, this.preview.startY, this.preview.endX, this.preview.endY);
    this.previewGfx.lineStyle(2, this.palette.previewBounce, 0.45);
    this.previewGfx.lineBetween(this.preview.endX, this.preview.endY, this.preview.bounceEndX, this.preview.bounceEndY);
    this.previewGfx.fillStyle(this.palette.previewImpact, 0.8);
    this.previewGfx.fillCircle(this.preview.impactX, this.preview.impactY, 4);
  }

  private drawGhostPath() {
    this.ghostGfx.clear();
    if (!this.currentHole || this.options.mode !== 'ghost') return;

    const record = this.ghostStore[this.currentHole.id];
    if (!record || record.points.length < 2) return;

    this.ghostGfx.lineStyle(2, this.palette.previewBounce, 0.35);
    for (let i = 1; i < record.points.length; i += 1) {
      const a = record.points[i - 1];
      const b = record.points[i];
      this.ghostGfx.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private updateHud() {
    if (!this.bootedMatch || !this.currentHole) {
      this.hudTop.setText('Select mode and options, then start.');
      this.hudStats.setText('');
      this.hudTimer.setText('');
      return;
    }

    const totalHoles = this.session.holeOrder.length;
    const currentNumber = Math.min(totalHoles, this.session.currentHoleIndex + 1);

    this.hudTop.setText(`Hole ${currentNumber}/${totalHoles} - ${this.currentHole.name}`);
    this.hudStats.setText(
      `Par ${this.currentHole.par} | Strokes ${this.session.currentHoleStrokes} | Mode ${formatMode(this.options.mode)}${this.settings.practice ? ' | Practice' : ''}`
    );

    if (this.options.mode === 'time_attack') {
      const totalMs = this.session.elapsedMs + this.session.timePenaltyMs;
      this.hudTimer.setText(`Timer ${(totalMs / 1000).toFixed(2)}s (penalties ${(this.session.timePenaltyMs / 1000).toFixed(0)}s)`);
    } else if (this.options.mode === 'ghost' && this.settings.raceGhost && this.ghostReplay) {
      const deltaMs = this.session.currentHoleTimeMs - this.ghostReplay.getElapsedMs();
      this.hudTimer.setText(`Hole Time ${(this.session.currentHoleTimeMs / 1000).toFixed(2)}s | Ghost ${deltaMs >= 0 ? '+' : ''}${(deltaMs / 1000).toFixed(2)}s`);
    } else {
      this.hudTimer.setText(`Hole Time ${(this.session.currentHoleTimeMs / 1000).toFixed(2)}s`);
    }

    if (this.waterMessageUntilMs > this.session.elapsedMs) {
      this.hudStats.setText(`${this.hudStats.text} | Water +1 (respawn)`);
    }
  }

  private updateCameraMode() {
    if (!this.options || !this.currentHole) return;
    this.cameraController.update(this.cameras.main, {
      ballX: this.ball.x,
      ballY: this.ball.y,
      ballVx: this.ball.vx,
      ballVy: this.ball.vy,
      cupX: this.currentHole.cup.x,
      cupY: this.currentHole.cup.y,
      isAiming: this.aim.isAiming(),
      isMoving: this.ball.moving || !!this.cupRollIn,
      forceBallCam: this.options.ballCam
    });
  }

  private playCue(cue: 'hit' | 'wall' | 'sand' | 'water' | 'sink' | 'ui', intensity = 1) {
    if (!this.sound || this.sound.mute) return;
    const ctx = (this.sound as unknown as { context?: AudioContext }).context;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq =
      cue === 'hit' ? 330 : cue === 'wall' ? 260 : cue === 'sand' ? 190 : cue === 'water' ? 140 : cue === 'sink' ? 640 : 420;
    const duration = cue === 'sink' ? 0.18 : cue === 'water' ? 0.16 : 0.08;
    osc.type = cue === 'water' ? 'sine' : cue === 'sand' ? 'square' : 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03 * intensity, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
