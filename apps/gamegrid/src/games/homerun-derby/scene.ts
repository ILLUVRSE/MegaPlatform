import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { cameraFlash, cameraShake, prefersReducedMotion, triggerHaptic } from '../../systems/gameplayComfort';
import { createFpsSampler } from '../../systems/perfMonitor';
import { GAME_INSTRUCTIONS } from '../../content/howToPlay';
import { playHomerunSfx } from './audio/sfx';
import { loadSettings, saveSettings, type HomerunSettings } from './config/settings';
import { QualityTuner, type QualitySnapshot } from './config/quality';
import { clamp, loadTuning, type HomerunTuning } from './config/tuning';
import { createSwipeSwingController, type SwipeMetrics } from './input/SwipeSwingController';
import { getTimingWindows } from './physics/contact';
import { simulateFlight } from './physics/flight';
import { createPitchGenerator, getPitchTell, nextPitch, samplePitchPosition } from './pitching/pitch';
import { applyPitchOutcome, createMatchState, resolveMatchEnd, tickMatch } from './rules';
import { simulateAiSwing } from './ai';
import { HomerunHud } from './ui/hud';
import { TimingMeter } from './ui/timingMeter';
import { buildStadiumArt, type StadiumArt } from './vfx/stadium';
import { ensureBallTexture, ensureBatTexture } from './vfx/sprites';
import { ParticlePool, resolveSparkCount } from './vfx/particles';
import { TrailPool } from './vfx/trail';
import { CameraDirector } from './camera/CameraDirector';
import { ContactBanner } from './ui/ContactBanner';
import { PitchCountdown } from './ui/PitchCountdown';
import { DebugPanel, type DebugOverrides } from './dev/DebugPanel';
import { setGameCategoryVolume } from '../../systems/audioManager';
import { resolveSwipeContact } from './physics/ContactResolver';
import { GAME_CONFIG } from './config/gameConfig';
import { appendReplayInput, closeReplayRunLog, createReplayRunLog, type ReplayRunLog } from './replay/ReplayLog';
import { ResultPopupPool } from './ui/ResultPopupPool';
import type {
  AimLane,
  BatterSwing,
  HomerunDifficulty,
  HomerunMode,
  MatchState,
  PitchDefinition,
  PitchGeneratorState
} from './types';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;
const PLATE_X = 640;
const PLATE_Y = 592;
const GROUND_Y = 560;
const SETTINGS_TUTORIAL_KEY = 'gamegrid.homerun-derby.tutorial.v1';

interface HomerunDerbySceneConfig {
  hooks: GameRuntimeHooks;
}

interface BattedBallState {
  swing: BatterSwing;
  elapsedMs: number;
  startX: number;
  startY: number;
}

interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function readSafeArea(): SafeInsets {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const style = getComputedStyle(document.documentElement);
  const top = parseFloat(style.getPropertyValue('--safe-area-top')) || 0;
  const right = parseFloat(style.getPropertyValue('--safe-area-right')) || 0;
  const bottom = parseFloat(style.getPropertyValue('--safe-area-bottom')) || 0;
  const left = parseFloat(style.getPropertyValue('--safe-area-left')) || 0;
  return { top, right, bottom, left };
}

function formatTimer(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const safe = Math.max(0, total);
  const mins = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function laneToLabel(lane: AimLane): string {
  if (lane < 0) return 'Pull';
  if (lane > 0) return 'Oppo';
  return 'Center';
}

function contactTimingLabel(contact: BatterSwing['contact']) {
  return contact.grade;
}

function bucketSpeed(speedPxPerSec: number): string {
  if (speedPxPerSec < 720) return 'slow';
  if (speedPxPerSec < 840) return 'medium';
  return 'fast';
}

function bucketDistance(distanceFt: number): string {
  if (distanceFt >= 430) return 'elite';
  if (distanceFt >= 380) return 'long';
  if (distanceFt >= 330) return 'deep';
  if (distanceFt >= 250) return 'mid';
  if (distanceFt >= 180) return 'short';
  return 'weak';
}

export class HomerunDerbyScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private settings: HomerunSettings = loadSettings();
  private tuning: HomerunTuning = loadTuning();

  private match: MatchState = createMatchState(this.settings.mode);
  private matchStartedAtMs = 0;

  private rngSeed = 0x89abcdef;
  private pitchGenerator: PitchGeneratorState = createPitchGenerator();

  private inputController = createSwipeSwingController();

  private hud!: HomerunHud;
  private timingMeter!: TimingMeter;
  private contactBanner!: ContactBanner;
  private pitchCountdown!: PitchCountdown;
  private cameraDirector!: CameraDirector;
  private safeInsets: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

  private menuContainer!: Phaser.GameObjects.Container;
  private pauseContainer!: Phaser.GameObjects.Container;
  private settingsContainer!: Phaser.GameObjects.Container;
  private howToContainer!: Phaser.GameObjects.Container;
  private endContainer!: Phaser.GameObjects.Container;
  private endSummaryText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private tutorialText!: Phaser.GameObjects.Text;
  private replayBanner!: Phaser.GameObjects.Text;

  private pitcherSprite!: Phaser.GameObjects.Arc;
  private batterSprite!: Phaser.GameObjects.Rectangle;
  private ballSprite!: Phaser.GameObjects.Image;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private batSprite!: Phaser.GameObjects.Image;
  private batBlurA!: Phaser.GameObjects.Image;
  private batBlurB!: Phaser.GameObjects.Image;
  private distanceMarker!: Phaser.GameObjects.Text;
  private landingIndicator!: Phaser.GameObjects.Arc;
  private swingArc!: Phaser.GameObjects.Graphics;
  private swingButtonBg!: Phaser.GameObjects.Rectangle;
  private swingButtonText!: Phaser.GameObjects.Text;

  private trail!: TrailPool;
  private sparkPool!: ParticlePool;
  private confettiPool!: ParticlePool;
  private popupPool!: ResultPopupPool;

  private activePitch: PitchDefinition | null = null;
  private pitchLane: AimLane = 0;
  private pitchReleasedAtMs = 0;
  private windupRemainingMs = 0;
  private nextPitchDelayMs = 320;
  private nextPitchDelayTotalMs = 320;
  private pitchIndicatorMs = 0;
  private distanceMarkerMs = 0;
  private pitchCueFired = false;

  private battedBall: BattedBallState | null = null;
  private lastContact: { x: number; y: number } | null = null;
  private replay: { swing: BatterSwing; elapsedMs: number; durationMs: number; startX: number; startY: number } | null = null;
  private swingResolved = false;
  private localPaused = false;
  private endPosted = false;
  private aiDelayMs = 0;

  private countdownRemainingMs = 0;
  private countdownLastTick = 0;
  private tutorialUntilMs = 0;
  private tutorialSeen = false;
  private tutorialStep: 0 | 1 | 2 | 3 = 0;
  private seededRunSeed: number | null = null;
  private replayLog: ReplayRunLog | null = null;

  private qualityTuner?: QualityTuner;
  private qualitySnapshot?: QualitySnapshot;
  private perfText?: Phaser.GameObjects.Text;
  private fpsSamplerCancel?: () => void;
  private telemetryDprChanges = 0;
  private telemetryFxChanges = 0;

  private sfxLimiter = new Map<string, number>();
  private crowdEnergy = 0;
  private stadiumArt?: StadiumArt;
  private hitStopMs = 0;
  private hitStopScale = 1;
  private replayDucked = false;
  private debugPanel?: DebugPanel;
  private debugOverrides: DebugOverrides = { forcedType: null, speedBucket: null, deterministic: false };

  constructor(config: HomerunDerbySceneConfig) {
    super('homerun-derby-main');
    this.hooks = config.hooks;
  }

  create() {
    this.safeInsets = readSafeArea();
    this.tutorialSeen = this.readTutorialSeen();
    this.tuning = loadTuning();

    ensureBallTexture(this);
    ensureBatTexture(this);
    this.stadiumArt = buildStadiumArt(this);

    this.cameraDirector = new CameraDirector(this.cameras.main);
    this.cameraDirector.updateSettings({
      followEnabled: this.settings.cameraFollow && !this.motionSuppressed(),
      intensity: this.settings.cameraIntensity,
      reducedMotion: this.motionSuppressed()
    });

    this.trail = new TrailPool(this, this.tuning.vfx.trailDots);
    this.trail.setDepth(18);
    this.sparkPool = new ParticlePool(this, 80);
    this.sparkPool.setDepth(20);
    this.confettiPool = new ParticlePool(this, 90);
    this.confettiPool.setDepth(21);
    this.popupPool = new ResultPopupPool(this, 8);
    this.popupPool.setDepth(26);
    this.sparkPool.emitBurst(-200, -200, { count: 4, color: 0xffffff, speed: 50, spread: Math.PI, gravity: 0, life: 0.1 });
    this.confettiPool.emitBurst(-200, -200, { count: 4, color: 0xffffff, speed: 50, spread: Math.PI, gravity: 0, life: 0.1 });

    this.pitcherSprite = this.add.circle(PLATE_X, 96, 18, 0x356aa0);
    this.batterSprite = this.add.rectangle(PLATE_X, PLATE_Y, 26, 52, 0x3a2b1c);

    this.ballSprite = this.add.image(PLATE_X, 130, 'homerun-ball').setVisible(false).setScale(0.6);
    this.ballShadow = this.add.ellipse(PLATE_X, GROUND_Y + 6, 28, 12, 0x000000, 0.3).setVisible(false);

    this.batSprite = this.add.image(PLATE_X + 34, PLATE_Y - 12, 'homerun-bat').setOrigin(0.1, 0.5);
    this.batBlurA = this.add.image(PLATE_X + 34, PLATE_Y - 12, 'homerun-bat').setOrigin(0.1, 0.5).setAlpha(0.2).setVisible(false);
    this.batBlurB = this.add.image(PLATE_X + 34, PLATE_Y - 12, 'homerun-bat').setOrigin(0.1, 0.5).setAlpha(0.1).setVisible(false);

    this.distanceMarker = this.add
      .text(PLATE_X, 540, '', {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '20px',
        color: '#fff4b8'
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.landingIndicator = this.add.circle(PLATE_X, GROUND_Y + 2, 8, 0xfff2b2, 0.6).setVisible(false);

    this.swingArc = this.add.graphics();
    this.swingButtonBg = this.add.rectangle(0, 0, 140, 56, 0x1e3853, 0.92).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.swingButtonText = this.add
      .text(0, 0, 'SWING', { fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '18px', color: '#f7fbff' })
      .setOrigin(0.5);
    this.swingButtonBg.on('pointerdown', () => {
      if (!this.settings.swingButton) return;
      if (!this.canPlayerSwing()) return;
      this.inputController.triggerSwing(performance.now());
      if (this.settings.haptics) triggerHaptic(6);
      this.playCue('swing');
    });

    this.contactBanner = new ContactBanner(this);
    this.pitchCountdown = new PitchCountdown(this);

    this.pitcherSprite.setDepth(7);
    this.ballShadow.setDepth(8);
    this.batterSprite.setDepth(9);
    this.batSprite.setDepth(12);
    this.batBlurA.setDepth(11);
    this.batBlurB.setDepth(10);
    this.ballSprite.setDepth(16);
    this.swingArc.setDepth(14);
    this.distanceMarker.setDepth(17);
    this.landingIndicator.setDepth(15);
    this.swingButtonBg.setDepth(22);
    this.swingButtonText.setDepth(23);

    this.hud = new HomerunHud(this);
    this.hud.onMenuClick(() => this.openPauseMenu());

    this.timingMeter = new TimingMeter(this);

    this.contactBanner.setDepth(24);
    this.pitchCountdown.setDepth(23);

    this.countdownText = this.add
      .text(PLATE_X, 260, '', {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '64px',
        color: '#ffffff'
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.tutorialText = this.add
      .text(PLATE_X, 280, '', {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '20px',
        color: '#f5f5f5',
        backgroundColor: '#162b40',
        padding: { left: 14, right: 14, top: 10, bottom: 10 },
        align: 'center',
        wordWrap: { width: 520 }
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.replayBanner = this.add
      .text(PLATE_X, 210, 'REPLAY', {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '18px',
        color: '#ffe5a5',
        backgroundColor: '#1f2f45',
        padding: { left: 12, right: 12, top: 6, bottom: 6 },
        letterSpacing: '3px'
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.buildMenus();

    this.inputController.setScheme(this.settings.controlScheme);
    this.inputController.setAimTuning(this.tuning.input.aimDeadzonePx, this.tuning.input.aimStepPx);
    this.inputController.setSwingCooldown(this.tuning.input.swingCooldownMs);
    this.inputController.setDragThreshold(this.tuning.input.dragSwingThresholdPx);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.inputController.pointerDown(pointer.id, pointer.x, pointer.y, performance.now(), this.canPlayerSwing());
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const allowAim = this.activePitch !== null && this.pitchReleasedAtMs === 0 && !this.battedBall;
      this.inputController.pointerMove(pointer.id, pointer.x, pointer.y, performance.now(), allowAim);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.inputController.pointerUp(pointer.id, pointer.x, pointer.y, performance.now(), this.canPlayerSwing());
    });

    this.scale.on('resize', () => this.layout());
    this.layout();

    this.hooks.reportEvent({ type: 'telemetry', gameId: this.hooks.gameId, event: 'session_start' });

    this.setupQualityTuner();
    if (import.meta.env.DEV) {
      this.debugPanel = new DebugPanel(this, (next) => {
        this.debugOverrides = next;
        if (next.deterministic) {
          this.rngSeed = 0x1234abcd;
          this.pitchGenerator = createPitchGenerator(0x10203040);
        }
      });
    }

    this.startMenuMode();
  }

  update(_time: number, deltaMs: number) {
    const rawDtMs = Math.min(deltaMs, 50);
    const timeScale = this.hitStopMs > 0 ? this.hitStopScale : 1;
    const dtMs = rawDtMs * timeScale;
    if (this.hitStopMs > 0) {
      this.hitStopMs = Math.max(0, this.hitStopMs - rawDtMs);
    }
    const dt = dtMs / 1000;

    this.trail.update(dt);
    this.sparkPool.update(dt);
    this.confettiPool.update(dt);
    this.popupPool.update(dt);
    if (this.stadiumArt && !this.motionSuppressed()) {
      const pulse = Math.sin(performance.now() / 260) * 0.02;
      const alpha = clamp(0.62 + this.crowdEnergy * 0.36 + pulse, 0.55, 0.98);
      this.stadiumArt.crowd.setAlpha(alpha);
    }
    this.pitchIndicatorMs = Math.max(0, this.pitchIndicatorMs - dtMs);
    this.distanceMarkerMs = Math.max(0, this.distanceMarkerMs - dtMs);
    this.distanceMarker.setVisible(this.distanceMarkerMs > 0);
    this.landingIndicator.setVisible(this.distanceMarkerMs > 0);
    if (!this.settings.timingMeter || !this.activePitch || this.pitchReleasedAtMs === 0 || this.swingResolved) {
      this.timingMeter.setVisible(false);
    }
    if (this.activePitch) this.pitchCountdown.hide();
    const swingVisible = import.meta.env.DEV && this.settings.swingButton && !this.menuContainer.visible && !this.endContainer.visible && !this.localPaused;
    this.swingButtonBg.setVisible(swingVisible);
    this.swingButtonText.setVisible(swingVisible);

    if (this.localPaused || this.menuContainer.visible || this.settingsContainer.visible || this.howToContainer.visible || this.endContainer.visible) {
      this.pitchCountdown.hide();
      this.refreshHud();
      return;
    }

    if (this.replay) {
      this.updateReplay(dtMs);
      this.refreshHud();
      return;
    }

    if (this.countdownRemainingMs > 0) {
      this.updateCountdown(dtMs);
      this.refreshHud();
      return;
    }

    if (this.tutorialUntilMs > 0) {
      this.tutorialUntilMs -= dtMs;
      if (this.tutorialUntilMs <= 0) {
        this.tutorialUntilMs = 0;
        if (this.tutorialStep === 1) {
          this.tutorialStep = 2;
          this.tutorialText.setText('Hit this slow pitch');
          this.tutorialText.setVisible(true);
        } else if (this.tutorialStep === 3) {
          this.tutorialStep = 0;
          this.tutorialText.setVisible(false);
          this.tutorialSeen = true;
          this.markTutorialSeen();
        } else {
          this.tutorialText.setVisible(false);
        }
      }
    }

    if (!this.match.state.ended) {
      this.match = tickMatch(this.match, dtMs);
      if (this.match.state.ended) {
        this.finishMatch();
        return;
      }
    }

    if (this.match.state.kind === 'duel_10' && this.match.state.phase === 'ai') {
      this.updateAiPhase(dtMs);
    } else {
      this.updatePlayerPitchCycle(dtMs);
    }

    this.updateBattedBall(dtMs);
    this.refreshHud();
    this.refreshAimPreview();

    if (this.qualityTuner && this.qualitySnapshot) {
      const fps = this.game.loop.actualFps;
      this.qualityTuner.sampleFps(fps, dt);
      this.refreshPerfHud(fps);
    }
  }

  private layout() {
    this.safeInsets = readSafeArea();
    const width = this.scale.width || BASE_WIDTH;
    const height = this.scale.height || BASE_HEIGHT;
    this.hud.setLeftHanded(this.settings.leftHandedHud);
    this.hud.layout(width, height, this.safeInsets);
    this.timingMeter.layout(width, height, this.safeInsets);
    this.contactBanner.layout(width, this.safeInsets.top);
    const countdownX = this.settings.leftHandedHud ? width - this.safeInsets.right - 170 : this.safeInsets.left + 16;
    this.pitchCountdown.layout(countdownX, this.safeInsets.top + 112);
    const swingX = this.settings.leftHandedHud ? this.safeInsets.left + 90 : width - this.safeInsets.right - 90;
    const swingY = height - this.safeInsets.bottom - 70;
    this.swingButtonBg.setPosition(swingX, swingY);
    this.swingButtonText.setPosition(swingX, swingY);
    this.swingButtonBg.setVisible(import.meta.env.DEV && this.settings.swingButton);
    this.swingButtonText.setVisible(import.meta.env.DEV && this.settings.swingButton);
    this.inputController.setZone(this.safeInsets.left + 20, height * 0.48, width - this.safeInsets.left - this.safeInsets.right - 40, height * 0.5);
    if (this.perfText) {
      this.perfText.setPosition(16 + this.safeInsets.left, height - this.safeInsets.bottom - 22);
    }
  }

  private startMenuMode() {
    this.menuContainer.setVisible(true);
    this.pauseContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.howToContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.localPaused = false;
    this.activePitch = null;
    this.battedBall = null;
    this.replay = null;
    this.clearReplayAudioDucking();
    this.replayBanner.setVisible(false);
    this.swingResolved = false;
    this.ballSprite.setVisible(false);
    this.ballShadow.setVisible(false);
    this.distanceMarker.setVisible(false);
    this.landingIndicator.setVisible(false);
    this.pitchCountdown.hide();
    this.resetBat();
    this.refreshCameraSettings();
    this.cameraDirector.setBatterCam();
    this.refreshHud();
  }

  private startMatch() {
    this.match = createMatchState(this.settings.mode);
    this.matchStartedAtMs = performance.now();
    const seededFromUrl = this.readSeededRunSeed();
    this.seededRunSeed = Number.isFinite(seededFromUrl) ? seededFromUrl : null;
    const runSeed = this.seededRunSeed ?? (this.debugOverrides.deterministic ? 0x10203040 : 0x87a2d411);
    this.pitchGenerator = createPitchGenerator(runSeed);
    this.rngSeed = this.seededRunSeed ?? (this.debugOverrides.deterministic ? 0x1234abcd : 0x89abcdef);
    this.replayLog = createReplayRunLog(runSeed, this.matchStartedAtMs);
    this.activePitch = null;
    this.battedBall = null;
    this.replay = null;
    this.clearReplayAudioDucking();
    this.replayBanner.setVisible(false);
    this.swingResolved = false;
    this.localPaused = false;
    this.nextPitchDelayMs = 380;
    this.nextPitchDelayTotalMs = 380;
    this.pitchReleasedAtMs = 0;
    this.pitchLane = 0;
    this.endPosted = false;
    this.aiDelayMs = 800;
    this.inputController.clearAimLock();
    this.menuContainer.setVisible(false);
    this.pauseContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.howToContainer.setVisible(false);
    this.countdownRemainingMs = 3000;
    this.countdownLastTick = 0;
    this.countdownText.setVisible(true);
    this.distanceMarker.setVisible(false);
    this.landingIndicator.setVisible(false);
    this.crowdEnergy = 0;
    this.refreshCameraSettings();
    this.cameraDirector.setBatterCam();
    this.refreshHud();

    if (!this.tutorialSeen) {
      this.tutorialStep = 1;
      this.tutorialUntilMs = GAME_CONFIG.tutorial.step1Ms;
      this.tutorialText.setText('Swipe to swing');
      this.tutorialText.setVisible(true);
    } else {
      this.tutorialStep = 0;
      this.tutorialUntilMs = 0;
      this.tutorialText.setVisible(false);
    }

    saveSettings(this.settings);

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      options: {
        controlScheme: this.settings.controlScheme,
        timingAssist: this.settings.timingAssist,
        aimAssist: this.settings.aimAssist,
        pitchTells: this.settings.pitchTells
      }
    });

    this.hooks.reportEvent({
      type: 'telemetry',
      gameId: this.hooks.gameId,
      event: 'mode_start',
      mode: this.settings.mode,
      difficulty: this.settings.difficulty
    });
  }

  private finishMatch() {
    if (this.endPosted) return;
    this.endPosted = true;

    this.activePitch = null;
    this.battedBall = null;
    this.ballSprite.setVisible(false);
    this.ballShadow.setVisible(false);
    this.landingIndicator.setVisible(false);
    this.pitchCountdown.hide();

    const durationMs = Math.max(0, performance.now() - this.matchStartedAtMs);
    const summary = resolveMatchEnd(this.match, durationMs);

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: summary.mode,
      score: summary.score,
      hrCount: summary.hrCount,
      bestDistance: summary.bestDistance,
      perfectCount: summary.perfectCount,
      durationMs: summary.durationMs
    });

    this.hooks.reportEvent({
      type: 'telemetry',
      gameId: this.hooks.gameId,
      event: 'mode_end',
      mode: summary.mode,
      score: summary.score,
      hrCount: summary.hrCount,
      bestDistance: summary.bestDistance,
      perfectCount: summary.perfectCount,
      avgFps: this.qualitySnapshot ? this.game.loop.actualFps : null,
      dprChanges: this.telemetryDprChanges,
      fxChanges: this.telemetryFxChanges
    });

    if (this.replayLog) {
      closeReplayRunLog(this.replayLog, performance.now());
      this.hooks.reportEvent({
        type: 'telemetry',
        gameId: this.hooks.gameId,
        event: 'replay_log_ready',
        seed: this.replayLog.seed,
        inputCount: this.replayLog.inputs.length
      });
      (window as Window & { __homerunReplay?: ReplayRunLog }).__homerunReplay = this.replayLog;
    }

    const duelSuffix =
      this.match.state.kind === 'duel_10'
        ? `\nPlayer ${this.match.state.playerScore} - AI ${this.match.state.aiScore} (${summary.winner ?? 'n/a'})`
        : '';

    this.endSummaryText.setText(
      `Score ${summary.score}\nHR ${summary.hrCount}\nBest ${Math.round(summary.bestDistance)} ft\nPerfect ${summary.perfectCount}\nStrikeouts ${this.match.stats.strikeouts}${duelSuffix}`
    );

    this.endContainer.setVisible(true);
  }

  private updateCountdown(dtMs: number) {
    this.countdownRemainingMs -= dtMs;
    const remaining = Math.max(0, this.countdownRemainingMs);
    const count = Math.ceil(remaining / 1000);
    if (remaining <= 0) {
      this.countdownRemainingMs = 0;
      this.countdownText.setVisible(false);
      this.countdownLastTick = 0;
      return;
    }
    this.countdownText.setText(String(count));
    if (count !== this.countdownLastTick) {
      this.countdownLastTick = count;
      playHomerunSfx('countdown', { gameId: this.hooks.gameId, enabled: this.settings.sfx, limiter: this.sfxLimiter, crowd: 0 });
    }
  }

  private updatePlayerPitchCycle(dtMs: number) {
    if (this.battedBall) return;

    if (!this.activePitch) {
      this.nextPitchDelayMs -= dtMs;
      if (this.nextPitchDelayMs <= 0) {
        this.pitchCountdown.hide();
        this.spawnPitch();
      } else {
        const progress = clamp(1 - this.nextPitchDelayMs / Math.max(1, this.nextPitchDelayTotalMs), 0, 1);
        this.pitchCountdown.update(progress);
      }
      return;
    }

    if (this.pitchReleasedAtMs === 0) {
      this.windupRemainingMs -= dtMs;
      const windupProgress = clamp(1 - this.windupRemainingMs / Math.max(1, this.activePitch.windupMs), 0, 1);
      const pulse = 1 + Math.sin(windupProgress * Math.PI * 2) * 0.06;
      this.pitcherSprite.setScale(pulse);
      if (this.windupRemainingMs <= 0) {
        this.pitchReleasedAtMs = performance.now();
        this.inputController.lockAim();
        this.pitchIndicatorMs = 700;
        this.pitcherSprite.setScale(1);
      }
      return;
    }

    const now = performance.now();
    const elapsed = now - this.pitchReleasedAtMs;
    const pitch = this.activePitch;
    const progress = clamp(elapsed / pitch.travelMs, 0, 1);
    const originX = PLATE_X + this.pitchLane * 30;
    const ballPos = samplePitchPosition(pitch, progress, originX);

    this.ballSprite.setPosition(ballPos.x, ballPos.y).setVisible(true);
    const shadowScale = 0.28 + progress * 0.52;
    this.ballShadow
      .setPosition(ballPos.x + 6, GROUND_Y + 6)
      .setVisible(true)
      .setScale(shadowScale, 0.8)
      .setAlpha(0.18 + progress * 0.5);
    const effectsLevel = this.resolveEffectsLevel();
    if (effectsLevel !== 'off') {
      const trailColor =
        pitch.type === 'curveball'
          ? 0xd9e8ff
          : pitch.type === 'slider'
            ? 0xffe2c2
            : pitch.type === 'changeup'
              ? 0xbfffe1
              : pitch.type === 'splitter'
                ? 0xd6c7ff
                : 0xfff5cd;
      this.trail.spawn(ballPos.x, ballPos.y, this.tuning.vfx.trailLife, trailColor);
    }
    const tint =
      pitch.type === 'curveball'
        ? 0xe8f3ff
        : pitch.type === 'slider'
          ? 0xfff0de
          : pitch.type === 'changeup'
            ? 0xdfffee
            : pitch.type === 'splitter'
              ? 0xf1e7ff
              : 0xffffff;
    this.ballSprite.setTint(tint);
    if (!this.motionSuppressed()) {
      this.cameraDirector.onPitchProgress(progress * 0.5);
    }

    if (!this.pitchCueFired && this.settings.timingCue) {
      const cueAt = pitch.travelMs - this.tuning.timing.cueLeadMs;
      if (elapsed >= cueAt) {
        this.pitchCueFired = true;
        this.playCue('timing_cue');
        if (this.settings.haptics) triggerHaptic(4);
      }
    }

    const swingInput = this.inputController.consumeSwing();
    if (swingInput && !this.swingResolved) {
      this.resolvePlayerSwing(swingInput.atMs, pitch, ballPos.x, ballPos.y, swingInput.aimLane, swingInput.swingPlane, swingInput.swipe);
      return;
    }

    if (!this.swingResolved) {
      const idealContact = this.pitchReleasedAtMs + pitch.travelMs;
      const windows = getTimingWindows(this.settings.difficulty, this.settings.timingAssist, this.tuning);
      const earlyLateMs = windows.earlyLateMs;
      if (now > idealContact + earlyLateMs) {
        this.resolveAutomaticStrike();
        return;
      }

      if (this.settings.timingMeter) {
        const perfectWindow = (windows.perfectMs * 2) / pitch.travelMs;
        const earlyWindow = (windows.earlyLateMs * 2) / pitch.travelMs;
        this.timingMeter.setVisible(true);
        this.timingMeter.update(progress * 0.5, perfectWindow, earlyWindow);
      }
    }
  }

  private updateAiPhase(dtMs: number) {
    if (this.match.state.kind !== 'duel_10' || this.match.state.ended) return;

    this.aiDelayMs -= dtMs;
    if (this.aiDelayMs > 0) return;

    const generated = nextPitch(this.pitchGenerator, this.settings.difficulty, this.tuning);
    this.pitchGenerator = generated.state;

    const aiSwing = simulateAiSwing(
      generated.pitch,
      this.settings.difficulty,
      this.randomLane(),
      this.nextRandom(),
      this.nextRandom(),
      this.nextRandom(),
      this.tuning
    );

    this.match = applyPitchOutcome(this.match, {
      role: 'ai',
      swing: aiSwing
    }, this.tuning.scoring);

    this.hud.showToast(aiSwing.flight.isHomeRun ? 'AI sends it out.' : `AI ${aiSwing.flight.result.replace('_', ' ')}`, 'neutral');

    if (this.match.state.ended) {
      this.finishMatch();
      return;
    }

    this.aiDelayMs = generated.pitch.intervalMs * 0.62;
  }

  private updateBattedBall(dtMs: number) {
    if (!this.battedBall) return;

    const flight = this.battedBall.swing.flight;
    this.battedBall.elapsedMs += dtMs;
    const progress = clamp(this.battedBall.elapsedMs / flight.hangTimeMs, 0, 1);

    const x = Phaser.Math.Linear(this.battedBall.startX, flight.landingX, progress);
    const y =
      (1 - progress) * (1 - progress) * this.battedBall.startY +
      2 * (1 - progress) * progress * flight.peakY +
      progress * progress * GROUND_Y;

    this.ballSprite.setPosition(x, y).setVisible(true);
    const shadowScale = clamp(0.25 + progress * 0.7, 0.2, 1);
    const shadowAlpha = clamp(0.45 - progress * 0.3, 0.12, 0.5);
    this.ballShadow.setPosition(x + 8, GROUND_Y + 6).setVisible(true).setScale(shadowScale, 0.8).setAlpha(shadowAlpha);
    const effectsLevel = this.resolveEffectsLevel();
    if (effectsLevel !== 'off') {
      this.trail.spawn(x, y, this.tuning.vfx.trailLife, 0xfff5cd);
    }

    if (progress >= 1) {
      this.cameraDirector.onLanding(this.battedBall.swing.flight.landingX);
      this.finishSwingOutcome(this.battedBall.swing);
      this.battedBall = null;
      this.activePitch = null;
      this.pitchReleasedAtMs = 0;
      this.swingResolved = false;
      this.nextPitchDelayMs = this.match.state.kind === 'timed_60' ? 220 : 520;
      this.nextPitchDelayTotalMs = this.nextPitchDelayMs;
      this.inputController.clearAimLock();
      this.ballSprite.setVisible(false);
      this.ballShadow.setVisible(false);
      this.cameraDirector.setBatterCam();
    }
  }

  private updateReplay(dtMs: number) {
    if (!this.replay) return;
    const replay = this.replay;
    replay.elapsedMs += dtMs * 0.7;
    const flight = replay.swing.flight;
    const raw = clamp(replay.elapsedMs / replay.durationMs, 0, 1);
    const progress = Phaser.Math.Easing.Sine.InOut(raw);
    const x = Phaser.Math.Linear(replay.startX, flight.landingX, progress);
    const y =
      (1 - progress) * (1 - progress) * replay.startY +
      2 * (1 - progress) * progress * flight.peakY +
      progress * progress * GROUND_Y;

    this.ballSprite.setPosition(x, y).setVisible(true);
    const shadowScale = clamp(0.25 + progress * 0.7, 0.2, 1);
    const shadowAlpha = clamp(0.45 - progress * 0.3, 0.12, 0.5);
    this.ballShadow.setPosition(x + 8, GROUND_Y + 6).setVisible(true).setScale(shadowScale, 0.8).setAlpha(shadowAlpha);
    const effectsLevel = this.resolveEffectsLevel();
    if (effectsLevel !== 'off') {
      this.trail.spawn(x, y, this.tuning.vfx.trailLife, 0xfff0c9);
    }
    if (progress >= 1) {
      this.replay = null;
      this.ballSprite.setVisible(false);
      this.ballShadow.setVisible(false);
      this.cameraDirector.setBatterCam();
      this.replayBanner.setVisible(false);
      this.clearReplayAudioDucking();
    }
  }

  private queueReplay(swing: BatterSwing) {
    if (this.replay || this.motionSuppressed()) return;
    const startX = this.lastContact?.x ?? PLATE_X;
    const startY = this.lastContact?.y ?? PLATE_Y - 40;
    const durationMs = clamp(swing.flight.hangTimeMs * 0.65, 700, 1400);
    this.replay = { swing, elapsedMs: 0, durationMs, startX, startY };
    this.replayBanner.setVisible(true);
    this.applyReplayAudioDucking();
    const midX = Phaser.Math.Linear(startX, swing.flight.landingX, 0.55);
    const midY = clamp(swing.flight.peakY, 200, 360);
    this.cameras.main.pan(midX, midY, 260, 'Sine.easeOut', true);
    this.cameras.main.zoomTo(0.88, 260, 'Sine.easeOut', true);
  }

  private applyReplayAudioDucking() {
    if (this.replayDucked) return;
    setGameCategoryVolume(this.hooks.gameId, 'sfx', 0.55);
    this.replayDucked = true;
  }

  private clearReplayAudioDucking() {
    if (!this.replayDucked) return;
    setGameCategoryVolume(this.hooks.gameId, 'sfx', 1);
    this.replayDucked = false;
  }

  private resolvePlayerSwing(
    swingAtMs: number,
    pitch: PitchDefinition,
    contactX: number,
    contactY: number,
    aimLane: AimLane,
    swingPlane: number,
    swipe: SwipeMetrics
  ) {
    this.playCue('swing');
    const idealContactMs = this.pitchReleasedAtMs + pitch.travelMs;
    const timingDeltaMs = swingAtMs - idealContactMs;

    const adjustedAimLane = this.applyAimAssist(aimLane, this.pitchLane);
    const resolved = resolveSwipeContact(
      timingDeltaMs,
      pitch,
      this.settings.difficulty,
      this.pitchLane,
      { ...swipe, aimLane: adjustedAimLane, swingPlane },
      Math.hypot(contactX - PLATE_X, contactY - PLATE_Y),
      this.settings.timingAssist,
      this.tuning,
      this.nextRandom()
    );
    const contact = resolved.contact;

    if (this.replayLog) {
      appendReplayInput(this.replayLog, {
        startTimeMs: swipe.path[0]?.t ?? swipe.endMs - swipe.durationMs,
        endTimeMs: swipe.endMs,
        startX: swipe.startX,
        startY: swipe.startY,
        endX: swipe.endX,
        endY: swipe.endY,
        angleRad: swipe.angleRad,
        speedPxPerMs: swipe.speedPxPerMs,
        path: swipe.path
      });
    }

    const swing: BatterSwing = {
      contact,
      flight: simulateFlight(contact, this.nextRandom(), this.tuning)
    };

    this.swingResolved = true;

    if (contact.quality === 'miss' || swing.flight.result === 'strike') {
      this.playCue('miss');
      if (this.settings.haptics) triggerHaptic(6);
      this.finishSwingOutcome(swing);
      this.resetPitch();
      return;
    }

    this.animateBatSwing(swing.contact.quality === 'perfect');
    if (this.settings.haptics) triggerHaptic(swing.flight.isHomeRun ? [16, 22, 16] : 10);
    this.playCue(swing.contact.quality === 'perfect' ? 'perfect' : 'contact');

    const effectsLevel = this.resolveEffectsLevel();
    if (effectsLevel !== 'off') {
      const count = resolveSparkCount(effectsLevel, this.tuning.vfx.sparkCount);
      this.sparkPool.emitBurst(contactX, contactY, {
        count,
        color: swing.contact.quality === 'perfect' ? 0xfff6b3 : 0xffffff,
        speed: 180,
        spread: Math.PI,
        gravity: 240,
        life: 0.5
      });
      if (swing.contact.perfectPerfect) {
        this.sparkPool.emitBurst(contactX, contactY, {
          count: Math.round(count * 1.4),
          color: 0xffe58a,
          speed: 240,
          spread: Math.PI * 2,
          gravity: 280,
          life: 0.6
        });
      }
    }

    if (!this.motionSuppressed()) {
      if (swing.contact.quality === 'perfect') {
        cameraFlash(this, 90, 255, 230, 140);
        if (!this.settings.reducedShake) cameraShake(this, 120, 0.003);
        this.cameraDirector.contactPulse(0.035);
      } else if (swing.contact.quality === 'solid') {
        cameraFlash(this, 60, 255, 245, 210);
        if (!this.settings.reducedShake) cameraShake(this, 80, 0.0024);
        this.cameraDirector.contactPulse(0.025);
      }
    }

    if (!this.motionSuppressed() && swing.contact.quality === 'perfect') {
      this.tweens.add({
        targets: this.ballSprite,
        scale: 0.72,
        duration: 120,
        yoyo: true,
        ease: 'Sine.easeOut'
      });
    }

    this.battedBall = {
      swing,
      elapsedMs: 0,
      startX: contactX,
      startY: contactY
    };
    this.lastContact = { x: contactX, y: contactY };

    if (this.settings.cameraFollow && swing.flight.distanceFt >= this.tuning.camera.followDistanceFt) {
      this.cameraDirector.onContact(
        swing.flight.landingX,
        swing.flight.peakY,
        { followEnabled: this.settings.cameraFollow, intensity: this.settings.cameraIntensity, reducedMotion: this.motionSuppressed() }
      );
    }
  }

  private resolveAutomaticStrike() {
    const missSwing: BatterSwing = {
      contact: {
        timing: 'miss',
        quality: 'miss',
        grade: 'Miss',
        exitVelocityMph: 0,
        launchAngleDeg: 0,
        sprayLane: this.inputController.getAimLane(),
        sprayAngleDeg: 0,
        perfectPerfect: false,
        strike: true,
        aimError: 1,
        timingDeltaMs: 0
      },
      flight: {
        result: 'strike',
        distanceFt: 0,
        hangTimeMs: 0,
        landingX: PLATE_X,
        peakY: 0,
        isHomeRun: false,
        sprayAngleDeg: 0
      }
    };

    this.finishSwingOutcome(missSwing);
    this.resetPitch();
  }

  private finishSwingOutcome(swing: BatterSwing) {
    this.match = applyPitchOutcome(this.match, {
      role: 'player',
      swing
    }, this.tuning.scoring);

    const result = swing.flight.result;
    this.crowdEnergy = clamp(this.match.stats.multiplier / this.tuning.scoring.multiplierCap, 0, 1);
    if (result === 'home_run') this.crowdEnergy = clamp(this.crowdEnergy + 0.3, 0, 1);
    if (this.stadiumArt) {
      this.stadiumArt.crowd.setAlpha(0.65 + this.crowdEnergy * 0.35);
      if (result === 'home_run' || swing.contact.perfectPerfect) {
        this.tweens.add({
          targets: this.stadiumArt.scoreboard,
          scale: 1.08,
          duration: 140,
          yoyo: true,
          ease: 'Sine.easeOut'
        });
      }
    }
    if (result !== 'strike') {
      this.distanceMarker.setText(`${Math.round(swing.flight.distanceFt)} ft`).setPosition(swing.flight.landingX, 530);
      this.distanceMarkerMs = 1350;
      this.landingIndicator.setPosition(swing.flight.landingX, GROUND_Y + 4).setVisible(true);
      if (this.resolveEffectsLevel() !== 'off') {
        this.sparkPool.emitBurst(swing.flight.landingX, GROUND_Y + 6, {
          count: 10,
          color: 0xffe4b5,
          speed: 90,
          spread: Math.PI,
          gravity: 260,
          life: 0.45
        });
      }
    } else {
      this.landingIndicator.setVisible(false);
    }

    const timingTag = contactTimingLabel(swing.contact);
    const resultLabel =
      result === 'home_run'
        ? 'HR'
        : result === 'fly_out'
          ? 'Flyout'
          : result === 'ground_out'
            ? 'Grounder'
            : result === 'line_out'
              ? 'Liner'
              : result === 'foul'
                ? 'Foul'
                : 'Strike';
    const deltaMs = Math.round(swing.contact.timingDeltaMs);
    const deltaLabel = deltaMs === 0 ? '0ms' : `${deltaMs > 0 ? '+' : ''}${deltaMs}ms ${deltaMs > 0 ? 'late' : 'early'}`;
    if (this.settings.showTimingDelta && this.settings.timingMeter && swing.contact.timing !== 'miss') {
      this.timingMeter.showDelta(deltaLabel);
    }
    const bannerSubtitle = this.settings.showHitStats && result !== 'strike'
      ? `${Math.round(swing.contact.exitVelocityMph)} mph • ${Math.round(swing.contact.launchAngleDeg)}°`
      : result !== 'strike'
        ? `${Math.round(swing.flight.distanceFt)} ft`
        : 'Swing and miss';
    this.popupPool.spawn(
      PLATE_X,
      PLATE_Y - 96,
      timingTag.toUpperCase(),
      timingTag === 'Perfect' ? '#ffe38d' : timingTag === 'Miss' ? '#ff9ea8' : '#ffffff'
    );

    if (swing.contact.perfectPerfect) {
      this.hud.showToast(`${timingTag} • Perfect-Perfect!`, 'good');
      this.contactBanner.show(`${timingTag} • ${resultLabel}`, bannerSubtitle, 'good');
      this.playCue('perfect');
      if (!this.settings.reducedShake && !this.motionSuppressed()) cameraShake(this, 140, 0.0034);
      this.applyHitStop(GAME_CONFIG.contact.perfectSlowMoMs, GAME_CONFIG.contact.perfectSlowMoScale);
      if (this.resolveEffectsLevel() !== 'off') {
        this.confettiPool.emitBurst(PLATE_X, 140, { count: 16, color: 0xfff2b2, speed: 120, spread: Math.PI, gravity: 90, life: 0.9 });
      }
      this.playCue('pa_perfect');
    } else if (result === 'home_run') {
      this.hud.showToast(`${timingTag} • Home Run ${Math.round(swing.flight.distanceFt)} ft`, 'good');
      this.contactBanner.show(`${timingTag} • ${resultLabel}`, bannerSubtitle, 'good');
      this.playCue('home_run');
      if (!this.settings.reducedShake && !this.motionSuppressed()) cameraShake(this, 170, 0.0038);
      this.spawnCelebration();
      this.applyHitStop(90, 0.6);
      if (!this.motionSuppressed()) this.cameraDirector.contactPulse(0.045);
      this.queueReplay(swing);
      this.playCue('pa_home_run');
      if (this.match.stats.streak >= 3) this.playCue('chant');
    } else if (result === 'foul') {
      this.hud.showToast(`${timingTag} • Foul ${Math.round(swing.flight.distanceFt)} ft`, 'bad');
      this.contactBanner.show(`${timingTag} • ${resultLabel}`, bannerSubtitle, 'bad');
      this.playCue('foul');
    } else if (result === 'strike') {
      this.hud.showToast('Miss • Strike', 'bad');
      this.contactBanner.show('Miss • Strike', bannerSubtitle, 'bad');
      this.playCue('miss');
    } else {
      this.hud.showToast(`${timingTag} • ${result.replace('_', ' ')} ${Math.round(swing.flight.distanceFt)} ft`, 'neutral');
      this.contactBanner.show(`${timingTag} • ${resultLabel}`, bannerSubtitle, 'neutral');
      this.playCue('contact');
    }

    if (this.tutorialStep === 2 && result !== 'strike') {
      this.tutorialStep = 3;
      this.tutorialUntilMs = GAME_CONFIG.tutorial.step3Ms;
      this.tutorialText.setText('Swipe as the ball reaches the zone');
      this.tutorialText.setVisible(true);
    }

    if (result !== 'strike') {
      this.nextPitchDelayMs = this.match.state.kind === 'timed_60' ? 180 : 420;
      this.nextPitchDelayTotalMs = this.nextPitchDelayMs;
    }

    if (this.match.state.kind === 'duel_10' && this.match.state.phase === 'ai') {
      this.aiDelayMs = 780;
    }

    this.hooks.reportEvent({
      type: 'telemetry',
      gameId: this.hooks.gameId,
      event: 'pitch_result',
      pitchType: this.activePitch?.type ?? 'unknown',
      timing: swing.contact.timing,
      quality: swing.contact.quality,
      aimError: Math.round(swing.contact.aimError * 100) / 100,
      result: swing.flight.result,
      distanceBucket: bucketDistance(swing.flight.distanceFt),
      distanceFt: Math.round(swing.flight.distanceFt)
    });

    if (this.match.state.ended) {
      this.finishMatch();
    }
  }

  private spawnPitch() {
    let generated = nextPitch(this.pitchGenerator, this.settings.difficulty, this.tuning);
    this.pitchGenerator = generated.state;
    if (this.debugOverrides.forcedType) {
      generated = {
        ...generated,
        pitch: {
          ...generated.pitch,
          type: this.debugOverrides.forcedType,
          tell: getPitchTell(this.debugOverrides.forcedType)
        }
      };
    }
    if (this.debugOverrides.speedBucket) {
      const tuning = this.tuning.pitch[this.settings.difficulty === 'easy' ? 'easy' : this.settings.difficulty === 'hard' ? 'hard' : this.settings.difficulty === 'pro' ? 'pro' : 'medium'];
      const speed =
        this.debugOverrides.speedBucket === 'slow'
          ? tuning.speedMin
          : this.debugOverrides.speedBucket === 'fast'
            ? tuning.speedMax
            : (tuning.speedMin + tuning.speedMax) / 2;
      generated = {
        ...generated,
        pitch: {
          ...generated.pitch,
          speedPxPerSec: speed,
          travelMs: (430 / speed) * 1000
        }
      };
    }
    if (this.tutorialStep === 2 && GAME_CONFIG.tutorial.enabled) {
      const speed = generated.pitch.speedPxPerSec * GAME_CONFIG.tutorial.slowPitchSpeedScale;
      generated = {
        ...generated,
        pitch: {
          ...generated.pitch,
          speedPxPerSec: speed,
          travelMs: (430 / speed) * 1000
        }
      };
    }
    this.activePitch = generated.pitch;
    this.pitchLane = this.randomLane();
    this.windupRemainingMs = generated.pitch.windupMs;
    this.pitchReleasedAtMs = 0;
    this.swingResolved = false;
    this.pitchCueFired = false;
    this.inputController.clearAimLock();

    this.ballSprite.setPosition(PLATE_X + this.pitchLane * 30, 130).setVisible(true);
    this.ballShadow.setVisible(true).setPosition(PLATE_X, GROUND_Y + 6).setScale(0.3, 0.8);

    this.pitcherSprite.setFillStyle(this.settings.pitchTells ? generated.pitch.tell.color : 0x356aa0, 1);
    this.pitchIndicatorMs = this.settings.pitchTells ? 760 : 0;

    this.playCue('windup');

    this.hooks.reportEvent({
      type: 'telemetry',
      gameId: this.hooks.gameId,
      event: 'pitch_spawn',
      pitchType: generated.pitch.type,
      speedBucket: bucketSpeed(generated.pitch.speedPxPerSec),
      break: Math.round(generated.pitch.breakPx),
      vertical: Math.round(generated.pitch.verticalBreak)
    });
  }

  private resetPitch() {
    this.activePitch = null;
    this.pitchReleasedAtMs = 0;
    this.swingResolved = false;
    this.nextPitchDelayMs = 360;
    this.nextPitchDelayTotalMs = this.nextPitchDelayMs;
    this.inputController.clearAimLock();
    this.ballSprite.setVisible(false);
    this.ballShadow.setVisible(false);
  }

  private refreshHud() {
    const score = this.match.stats.score;
    const streakLabel = `Streak x${this.match.stats.multiplier}`;
    let countLabel = '';
    if (this.match.state.kind === 'classic_10') {
      countLabel = `Balls ${this.match.state.pitchesRemaining}`;
    } else if (this.match.state.kind === 'timed_60') {
      countLabel = `Time ${formatTimer(this.match.state.timeRemainingMs)}`;
    } else if (this.match.state.phase === 'player') {
      countLabel = `You ${10 - this.match.state.playerPitchesThrown} left`;
    } else {
      countLabel = `AI ${10 - this.match.state.aiPitchesThrown} left`;
    }

    const badgeLabel = `${this.settings.difficulty.toUpperCase()} · Swipe`;
    const pitchLabel =
      this.activePitch && this.settings.pitchTells && this.pitchIndicatorMs > 0
        ? this.activePitch.type.toUpperCase()
        : this.seededRunSeed !== null
          ? `Seed ${this.seededRunSeed}`
        : this.match.state.kind === 'duel_10' && this.match.state.phase === 'ai'
          ? 'AI at bat'
          : this.activePitch
            ? 'Pitch in'
            : 'On deck';

    const hintText =
      this.tutorialStep === 1
        ? 'Swipe to swing'
        : this.tutorialStep === 2
          ? 'Swipe now for contact'
          : this.tutorialStep === 3
            ? 'Time your swipe in the zone'
            : !this.tutorialSeen
              ? 'Swipe to swing'
              : '';

    this.hud.update({
      score,
      countLabel,
      comboLabel: streakLabel,
      badgeLabel,
      pitchLabel,
      streak: this.match.stats.streak,
      hintText
    });
  }

  private refreshAimPreview() {
    const lane = this.inputController.getAimLane();
    this.batterSprite.setX(PLATE_X + lane * 14);
    this.batSprite.setX(PLATE_X + 34 + lane * 14);
    this.batBlurA.setX(PLATE_X + 34 + lane * 14);
    this.batBlurB.setX(PLATE_X + 34 + lane * 14);

    const plane = this.inputController.getSwingPlane();
    if (this.settings.controlScheme === 'drag_release' && this.settings.dragPreview && this.inputController.hasActiveDrag()) {
      this.swingArc.clear();
      this.swingArc.lineStyle(3, 0xffe2a3, 0.75);
      const arcRadius = 70;
      const startAngle = Phaser.Math.DegToRad(210 + plane * 22);
      const endAngle = Phaser.Math.DegToRad(330 + plane * 22);
      this.swingArc.strokeArc(PLATE_X, PLATE_Y, arcRadius, startAngle, endAngle);
      this.swingArc.lineStyle(2, 0xfff4d6, 0.35);
      this.swingArc.strokeArc(PLATE_X, PLATE_Y, arcRadius + 10, startAngle, endAngle);
    } else {
      this.swingArc.clear();
    }
  }

  private applyHitStop(durationMs: number, scale: number) {
    if (this.motionSuppressed()) return;
    this.hitStopMs = Math.max(this.hitStopMs, durationMs);
    this.hitStopScale = scale;
  }

  private playCue(name: Parameters<typeof playHomerunSfx>[0]) {
    playHomerunSfx(name, { gameId: this.hooks.gameId, enabled: this.settings.sfx, limiter: this.sfxLimiter, crowd: this.crowdEnergy });
  }

  private openPauseMenu() {
    if (this.menuContainer.visible || this.settingsContainer.visible || this.howToContainer.visible || this.endContainer.visible) return;
    this.localPaused = true;
    this.pauseContainer.setVisible(true);
  }

  private closePauseMenu() {
    this.localPaused = false;
    this.pauseContainer.setVisible(false);
  }

  private openSettingsMenu() {
    this.pauseContainer.setVisible(false);
    this.settingsContainer.setVisible(true);
  }

  private closeSettingsMenu() {
    this.settingsContainer.setVisible(false);
    this.pauseContainer.setVisible(true);
    saveSettings(this.settings);
    this.refreshCameraSettings();
    this.layout();
  }

  private openHowTo() {
    this.pauseContainer.setVisible(false);
    this.howToContainer.setVisible(true);
  }

  private closeHowTo() {
    this.howToContainer.setVisible(false);
    this.pauseContainer.setVisible(true);
  }

  private buildMenus() {
    const makeButton = (x: number, y: number, label: string, onClick: () => void) =>
      this.add
        .text(x, y, label, {
          fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#304e69'
        })
        .setPadding(10, 7)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          onClick();
          this.playCue('ui');
        });

    const buildCard = (w: number, h: number) => this.add.rectangle(PLATE_X, BASE_HEIGHT / 2, w, h, 0x0f2031, 0.9);

    const titleStyle = { fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '38px', color: '#ffffff' };

    const title = this.add.text(PLATE_X, 170, 'Homerun Derby', titleStyle).setOrigin(0.5);
    const subtitle = this.add
      .text(PLATE_X, 214, 'Time your swing, pick your lane, launch it deep.', {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '16px',
        color: '#d2def2'
      })
      .setOrigin(0.5);

    const modeButton = makeButton(PLATE_X, 276, `Mode: ${this.modeLabel(this.settings.mode)}`, () => {
      const sequence: HomerunMode[] = ['classic_10', 'timed_60', 'duel_10'];
      const idx = sequence.indexOf(this.settings.mode);
      this.settings.mode = sequence[(idx + 1) % sequence.length];
      modeButton.setText(`Mode: ${this.modeLabel(this.settings.mode)}`);
    });

    const difficultyButton = makeButton(PLATE_X, 320, `Difficulty: ${this.settings.difficulty}`, () => {
      const sequence: HomerunDifficulty[] = ['easy', 'medium', 'hard', 'pro'];
      const idx = sequence.indexOf(this.settings.difficulty);
      this.settings.difficulty = sequence[(idx + 1) % sequence.length];
      difficultyButton.setText(`Difficulty: ${this.settings.difficulty}`);
    });

    const controlsButton = makeButton(PLATE_X, 364, 'Controls: Swipe Swing', () => {
      this.settings.controlScheme = 'drag_release';
      this.inputController.setScheme(this.settings.controlScheme);
      controlsButton.setText('Controls: Swipe Swing');
    });

    const startButton = makeButton(PLATE_X, 440, 'Start Match', () => this.startMatch());
    startButton.setStyle({ backgroundColor: '#2f6e3f', color: '#fef7e8' });

    this.menuContainer = this.add.container(0, 0, [buildCard(640, 380), title, subtitle, modeButton, difficultyButton, controlsButton, startButton]);

    const pauseTitle = this.add.text(PLATE_X, 210, 'Paused', titleStyle).setOrigin(0.5);
    const resumeButton = makeButton(PLATE_X, 280, 'Resume', () => this.closePauseMenu());
    const restartButton = makeButton(PLATE_X, 324, 'Restart', () => this.startMatch());
    const settingsButton = makeButton(PLATE_X, 368, 'Settings', () => this.openSettingsMenu());
    const howToButton = makeButton(PLATE_X, 412, 'How to Play', () => this.openHowTo());
    const finishButton = makeButton(PLATE_X, 456, 'Finish Round', () => this.finishMatch());
    finishButton.setStyle({ backgroundColor: '#4b3640' });

    this.pauseContainer = this.add.container(
      0,
      0,
      import.meta.env.DEV
        ? [buildCard(520, 320), pauseTitle, resumeButton, restartButton, settingsButton, howToButton, finishButton]
        : [buildCard(520, 320), pauseTitle, resumeButton, restartButton, settingsButton, howToButton]
    );
    this.pauseContainer.setVisible(false);

    const settingsTitle = this.add.text(PLATE_X, 160, 'Settings', titleStyle).setOrigin(0.5);
    const leftX = PLATE_X - 150;
    const rightX = PLATE_X + 150;
    const baseY = 210;
    const stepY = 36;

    const assistButton = makeButton(leftX, baseY + stepY * 0, `Aim Assist: ${this.settings.aimAssist}`, () => {
      const sequence: HomerunSettings['aimAssist'][] = ['off', 'low', 'medium'];
      const idx = sequence.indexOf(this.settings.aimAssist);
      this.settings.aimAssist = sequence[(idx + 1) % sequence.length];
      assistButton.setText(`Aim Assist: ${this.settings.aimAssist}`);
    });
    const timingButton = makeButton(leftX, baseY + stepY * 1, `Timing Assist: ${this.settings.timingAssist ? 'On' : 'Off'}`, () => {
      this.settings.timingAssist = !this.settings.timingAssist;
      timingButton.setText(`Timing Assist: ${this.settings.timingAssist ? 'On' : 'Off'}`);
    });
    const tellsButton = makeButton(leftX, baseY + stepY * 2, `Pitch Tells: ${this.settings.pitchTells ? 'On' : 'Off'}`, () => {
      this.settings.pitchTells = !this.settings.pitchTells;
      tellsButton.setText(`Pitch Tells: ${this.settings.pitchTells ? 'On' : 'Off'}`);
    });
    const leftHandButton = makeButton(leftX, baseY + stepY * 3, `One-Handed: ${this.settings.leftHandedHud ? 'Left' : 'Right'}`, () => {
      this.settings.leftHandedHud = !this.settings.leftHandedHud;
      this.hud.setLeftHanded(this.settings.leftHandedHud);
      this.layout();
      leftHandButton.setText(`One-Handed: ${this.settings.leftHandedHud ? 'Left' : 'Right'}`);
    });
    const motionButton = makeButton(leftX, baseY + stepY * 4, `Reduced Motion: ${this.settings.reducedMotion ? 'On' : 'Off'}`, () => {
      this.settings.reducedMotion = !this.settings.reducedMotion;
      motionButton.setText(`Reduced Motion: ${this.settings.reducedMotion ? 'On' : 'Off'}`);
      this.refreshCameraSettings();
    });
    const shakeButton = makeButton(leftX, baseY + stepY * 5, `Reduced Shake: ${this.settings.reducedShake ? 'On' : 'Off'}`, () => {
      this.settings.reducedShake = !this.settings.reducedShake;
      shakeButton.setText(`Reduced Shake: ${this.settings.reducedShake ? 'On' : 'Off'}`);
    });
    const hapticsButton = makeButton(leftX, baseY + stepY * 6, `Haptics: ${this.settings.haptics ? 'On' : 'Off'}`, () => {
      this.settings.haptics = !this.settings.haptics;
      hapticsButton.setText(`Haptics: ${this.settings.haptics ? 'On' : 'Off'}`);
    });
    const sfxButton = makeButton(leftX, baseY + stepY * 7, `SFX: ${this.settings.sfx ? 'On' : 'Off'}`, () => {
      this.settings.sfx = !this.settings.sfx;
      sfxButton.setText(`SFX: ${this.settings.sfx ? 'On' : 'Off'}`);
    });
    const effectsButton = makeButton(rightX, baseY + stepY * 0, `VFX: ${this.settings.effects}`, () => {
      const sequence: HomerunSettings['effects'][] = ['off', 'low', 'high'];
      const idx = sequence.indexOf(this.settings.effects);
      this.settings.effects = sequence[(idx + 1) % sequence.length];
      effectsButton.setText(`VFX: ${this.settings.effects}`);
      this.qualityTuner?.updateFromSettings({ effects: this.settings.effects, dprCap: this.settings.dprCap, autoQuality: this.settings.autoQuality });
    });
    const dprButton = makeButton(rightX, baseY + stepY * 1, `DPR Cap: ${this.settings.dprCap.toFixed(2)}`, () => {
      const steps = [1.25, 1.5, 1.75, 2, 2.25];
      const idx = steps.findIndex((value) => Math.abs(value - this.settings.dprCap) < 0.05);
      const next = steps[(idx + 1) % steps.length];
      this.settings.dprCap = next;
      dprButton.setText(`DPR Cap: ${this.settings.dprCap.toFixed(2)}`);
      this.qualityTuner?.updateFromSettings({ effects: this.settings.effects, dprCap: this.settings.dprCap, autoQuality: this.settings.autoQuality });
    });
    const autoQualityButton = makeButton(rightX, baseY + stepY * 2, `Auto Quality: ${this.settings.autoQuality ? 'On' : 'Off'}`, () => {
      this.settings.autoQuality = !this.settings.autoQuality;
      autoQualityButton.setText(`Auto Quality: ${this.settings.autoQuality ? 'On' : 'Off'}`);
      this.qualityTuner?.updateFromSettings({ effects: this.settings.effects, dprCap: this.settings.dprCap, autoQuality: this.settings.autoQuality });
    });
    const timingMeterButton = makeButton(rightX, baseY + stepY * 3, `Timing Meter: ${this.settings.timingMeter ? 'On' : 'Off'}`, () => {
      this.settings.timingMeter = !this.settings.timingMeter;
      timingMeterButton.setText(`Timing Meter: ${this.settings.timingMeter ? 'On' : 'Off'}`);
    });
    const timingCueButton = makeButton(rightX, baseY + stepY * 4, `Timing Cue: ${this.settings.timingCue ? 'On' : 'Off'}`, () => {
      this.settings.timingCue = !this.settings.timingCue;
      timingCueButton.setText(`Timing Cue: ${this.settings.timingCue ? 'On' : 'Off'}`);
    });
    const timingDeltaButton = makeButton(rightX, baseY + stepY * 5, `Timing Delta: ${this.settings.showTimingDelta ? 'On' : 'Off'}`, () => {
      this.settings.showTimingDelta = !this.settings.showTimingDelta;
      timingDeltaButton.setText(`Timing Delta: ${this.settings.showTimingDelta ? 'On' : 'Off'}`);
    });
    const hitStatsButton = makeButton(rightX, baseY + stepY * 6, `Hit Stats: ${this.settings.showHitStats ? 'On' : 'Off'}`, () => {
      this.settings.showHitStats = !this.settings.showHitStats;
      hitStatsButton.setText(`Hit Stats: ${this.settings.showHitStats ? 'On' : 'Off'}`);
    });
    const dragPreviewButton = makeButton(rightX, baseY + stepY * 7, `Drag Preview: ${this.settings.dragPreview ? 'On' : 'Off'}`, () => {
      this.settings.dragPreview = !this.settings.dragPreview;
      dragPreviewButton.setText(`Drag Preview: ${this.settings.dragPreview ? 'On' : 'Off'}`);
    });
    const cameraButton = makeButton(rightX, baseY + stepY * 8, `Camera Follow: ${this.settings.cameraFollow ? 'On' : 'Off'}`, () => {
      this.settings.cameraFollow = !this.settings.cameraFollow;
      cameraButton.setText(`Camera Follow: ${this.settings.cameraFollow ? 'On' : 'Off'}`);
      this.refreshCameraSettings();
    });
    const cameraIntensityButton = makeButton(rightX, baseY + stepY * 9, `Cam Intensity: ${this.settings.cameraIntensity}`, () => {
      const sequence: HomerunSettings['cameraIntensity'][] = ['low', 'medium', 'high'];
      const idx = sequence.indexOf(this.settings.cameraIntensity);
      this.settings.cameraIntensity = sequence[(idx + 1) % sequence.length];
      cameraIntensityButton.setText(`Cam Intensity: ${this.settings.cameraIntensity}`);
      this.refreshCameraSettings();
    });
    const swingButtonToggle = makeButton(leftX, baseY + stepY * 8, `Swing Button: ${this.settings.swingButton ? 'On' : 'Off'}`, () => {
      this.settings.swingButton = !this.settings.swingButton;
      swingButtonToggle.setText(`Swing Button: ${this.settings.swingButton ? 'On' : 'Off'}`);
      this.layout();
    });
    const perfButton = makeButton(leftX, baseY + stepY * 9, `Perf HUD: ${this.settings.showPerfHud ? 'On' : 'Off'}`, () => {
      this.settings.showPerfHud = !this.settings.showPerfHud;
      perfButton.setText(`Perf HUD: ${this.settings.showPerfHud ? 'On' : 'Off'}`);
    });
    const schemeButton = makeButton(rightX, baseY + stepY * 10, 'Controls: Swipe', () => {
      this.settings.controlScheme = 'drag_release';
      this.inputController.setScheme(this.settings.controlScheme);
      schemeButton.setText('Controls: Swipe');
    });
    const backButton = makeButton(PLATE_X, baseY + stepY * 11 + 4, 'Back', () => this.closeSettingsMenu());
    backButton.setStyle({ backgroundColor: '#2f6e3f' });

    const settingsChildren: Phaser.GameObjects.GameObject[] = [
      buildCard(720, 620),
      settingsTitle,
      assistButton,
      timingButton,
      tellsButton,
      leftHandButton,
      motionButton,
      shakeButton,
      hapticsButton,
      sfxButton,
      effectsButton,
      autoQualityButton,
      timingMeterButton,
      timingCueButton,
      timingDeltaButton,
      hitStatsButton,
      dragPreviewButton,
      cameraButton,
      cameraIntensityButton,
      schemeButton,
      backButton
    ];
    if (import.meta.env.DEV) {
      settingsChildren.splice(10, 0, swingButtonToggle, perfButton, dprButton);
    }
    this.settingsContainer = this.add.container(0, 0, settingsChildren);
    this.settingsContainer.setVisible(false);

    const howToTitle = this.add.text(PLATE_X, 200, 'How to Play', titleStyle).setOrigin(0.5);
    const howToText = this.add
      .text(PLATE_X, 300, (GAME_INSTRUCTIONS['homerun-derby'] ?? []).join('\n'), {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '18px',
        color: '#eaf2ff',
        align: 'center'
      })
      .setOrigin(0.5);
    const howToBack = makeButton(PLATE_X, 420, 'Back', () => this.closeHowTo());
    howToBack.setStyle({ backgroundColor: '#2f6e3f' });
    this.howToContainer = this.add.container(0, 0, [buildCard(560, 320), howToTitle, howToText, howToBack]);
    this.howToContainer.setVisible(false);

    const endTitle = this.add.text(PLATE_X, 238, 'Match Summary', titleStyle).setOrigin(0.5);
    this.endSummaryText = this.add
      .text(PLATE_X, 330, '', {
        fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
        fontSize: '20px',
        color: '#f2f2f2',
        align: 'center'
      })
      .setOrigin(0.5);
    const rematch = makeButton(PLATE_X, 456, 'Rematch', () => this.startMatch());
    rematch.setStyle({ backgroundColor: '#2f6e3f' });
    const back = makeButton(PLATE_X, 500, 'Back to Lobby', () => this.hooks.backToLobby());
    back.setStyle({ backgroundColor: '#4b3640' });

    this.endContainer = this.add.container(0, 0, [buildCard(520, 320), endTitle, this.endSummaryText, rematch, back]);
    this.endContainer.setVisible(false);

    this.menuContainer.setDepth(50);
    this.pauseContainer.setDepth(50);
    this.settingsContainer.setDepth(50);
    this.howToContainer.setDepth(50);
    this.endContainer.setDepth(50);
    this.countdownText.setDepth(45);
    this.tutorialText.setDepth(45);
    this.replayBanner.setDepth(45);
  }

  private spawnCelebration() {
    const effectsLevel = this.resolveEffectsLevel();
    if (effectsLevel === 'off') return;
    const confettiCount = effectsLevel === 'low' ? Math.round(this.tuning.vfx.confettiCount * 0.5) : this.tuning.vfx.confettiCount;
    this.confettiPool.emitBurst(PLATE_X, 120, {
      count: confettiCount,
      color: 0xffd87a,
      speed: 140,
      spread: Math.PI,
      gravity: 120,
      life: 1.2
    });
    this.playCue('crowd');
    this.playCue('fireworks');
  }

  private animateBatSwing(perfect: boolean) {
    const effectsLevel = this.resolveEffectsLevel();
    this.batBlurA.setVisible(effectsLevel !== 'off');
    this.batBlurB.setVisible(effectsLevel === 'high');
    this.batBlurA.setAlpha(perfect ? 0.45 : 0.25);
    this.batBlurB.setAlpha(perfect ? 0.25 : 0.12);
    const targetAngle = perfect ? -0.8 : -0.6;
    this.tweens.add({ targets: [this.batSprite, this.batBlurA, this.batBlurB], angle: Phaser.Math.RadToDeg(targetAngle), duration: 90 });
    this.tweens.add({
      targets: [this.batSprite, this.batBlurA, this.batBlurB],
      scale: perfect ? 1.08 : 1.03,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
    this.tweens.add({
      targets: [this.batSprite, this.batBlurA, this.batBlurB],
      angle: 0,
      duration: 120,
      delay: 90,
      onComplete: () => {
        this.batBlurA.setVisible(false);
        this.batBlurB.setVisible(false);
      }
    });
  }

  private resetBat() {
    this.batSprite.setAngle(0);
    this.batBlurA.setVisible(false);
    this.batBlurB.setVisible(false);
  }

  private motionSuppressed() {
    return this.settings.reducedMotion || prefersReducedMotion();
  }

  private resolveEffectsLevel() {
    if (this.motionSuppressed()) return 'off';
    return this.qualitySnapshot?.effects ?? this.settings.effects;
  }

  private refreshCameraSettings() {
    this.cameraDirector.updateSettings({
      followEnabled: this.settings.cameraFollow && !this.motionSuppressed(),
      intensity: this.settings.cameraIntensity,
      reducedMotion: this.motionSuppressed()
    });
  }

  private applyAimAssist(aimLane: AimLane, pitchLane: AimLane): AimLane {
    if (this.settings.aimAssist === 'off') return aimLane;
    const diff = Math.abs(aimLane - pitchLane);
    if (diff === 0) return aimLane;
    const roll = this.nextRandom();
    const chance = this.settings.aimAssist === 'medium' ? 0.5 : 0.3;
    return roll < chance ? pitchLane : aimLane;
  }

  private randomLane(): AimLane {
    const roll = this.nextRandom();
    if (roll < 0.26) return -1;
    if (roll > 0.74) return 1;
    return 0;
  }

  private nextRandom(): number {
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) >>> 0;
    return this.rngSeed / 0xffffffff;
  }

  private canPlayerSwing(): boolean {
    if (this.menuContainer.visible || this.endContainer.visible || this.localPaused) return false;
    if (this.match.state.kind === 'duel_10' && this.match.state.phase !== 'player') return false;
    return this.activePitch !== null && this.pitchReleasedAtMs > 0;
  }

  private modeLabel(mode: HomerunMode): string {
    if (mode === 'classic_10') return 'Classic (10 pitches)';
    if (mode === 'timed_60') return 'Timed (60s)';
    return 'Duel vs AI';
  }

  private markTutorialSeen() {
    try {
      window.localStorage.setItem(SETTINGS_TUTORIAL_KEY, JSON.stringify({ seen: true }));
    } catch {
      // no-op
    }
  }

  private readTutorialSeen(): boolean {
    try {
      const raw = window.localStorage.getItem(SETTINGS_TUTORIAL_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { seen?: boolean };
      return Boolean(parsed.seen);
    } catch {
      return false;
    }
  }

  private readSeededRunSeed(): number | null {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('seed');
      if (!raw) return null;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed)) return null;
      return parsed >>> 0;
    } catch {
      return null;
    }
  }

  private refreshPerfHud(fps: number) {
    if (!import.meta.env.DEV) return;
    if (!this.perfText) {
      this.perfText = this.add.text(16, 100, '', { color: '#bfe3ff', fontSize: '12px', fontFamily: 'monospace' }).setDepth(30);
    }
    this.perfText.setVisible(this.settings.showPerfHud);
    if (!this.settings.showPerfHud || !this.qualitySnapshot) return;
    const ms = Math.round(1000 / Math.max(1, fps));
    this.perfText.setText(`FPS ${fps.toFixed(1)} | ${ms}ms | DPR ${this.qualitySnapshot.appliedDpr.toFixed(2)} | VFX ${this.qualitySnapshot.effects}`);
  }

  private setupQualityTuner() {
    if (!this.game) return;
    this.qualityTuner = new QualityTuner(
      this.game,
      { effects: this.settings.effects, dprCap: this.settings.dprCap, autoQuality: this.settings.autoQuality },
      (snapshot) => {
        if (this.qualitySnapshot && snapshot.dprCap !== this.qualitySnapshot.dprCap) this.telemetryDprChanges += 1;
        if (this.qualitySnapshot && snapshot.effects !== this.qualitySnapshot.effects) this.telemetryFxChanges += 1;
        if (this.settings.autoQuality && this.qualitySnapshot) {
          const downshift =
            snapshot.dprCap < this.qualitySnapshot.dprCap ||
            (this.qualitySnapshot.effects === 'high' && snapshot.effects !== 'high') ||
            (this.qualitySnapshot.effects === 'low' && snapshot.effects === 'off');
          if (downshift) {
            this.hud.showToast('Auto quality adjusted', 'neutral');
          }
        }
        this.qualitySnapshot = snapshot;
      }
    );

    if (this.fpsSamplerCancel) this.fpsSamplerCancel();
    this.fpsSamplerCancel = createFpsSampler((fps) => {
      this.hooks.reportEvent({ type: 'telemetry', gameId: this.hooks.gameId, event: 'fps_sample', fps: Math.round(fps), dpr: this.qualitySnapshot?.appliedDpr });
    }, 1200);
  }
}
