import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { cameraFlash, cameraShake, triggerHaptic } from '../../systems/gameplayComfort';
import { createHoldReleaseCapture, createSwipeCapture } from './input';
import { playFreethrowSfx } from './audio/sfx';
import { QualityTuner, type QualitySnapshot } from './config/quality';
import { loadSettings, saveSettings, type FreethrowSettings } from './config/settings';
import { DIFFICULTY_PRESETS, HEAT_TUNING, PRESSURE_TUNING, QUALITY_DEFAULTS, SPAWN_TUNING, TIMING_TUNING, clamp } from './config/tuning';
import { computeTimingWindow } from './mechanics/timing';
import { mapInputToShotArc, resolveShotOutcome } from './shotModel';
import { buildCourtArt } from './vfx/court';
import { ParticlePool } from './vfx/particles';
import { TrajectoryPreview } from './vfx/trajectory';
import { FreethrowHud } from './ui/hud';
import { ShotMeter } from './ui/shotMeter';
import {
  applyHorseAnswerShot,
  applyHorseSetChallengeShot,
  applyThreePointShot,
  applyTimedShot,
  computeAccuracy,
  createInitialModeState,
  getThreePointBallValue,
  getThreePointSpot,
  horseLettersForPlayer,
  tickTimedMode
} from './rules';
import {
  buildAdaptiveAiDifficulty,
  createFreethrowAiState,
  pickAiHorseSpot,
  planAiShot,
  type FreethrowAiPersonality,
  type FreethrowAiState
} from './ai';
import {
  SHOT_SPOTS,
  TIMED_SPOT_ORDER,
  type FreethrowDifficulty,
  type FreethrowModeState,
  type FreethrowOptions,
  type FreethrowSensitivity,
  type ShotArcParams,
  type ShotInput,
  type ShotOutcome,
  type ShotSpotId
} from './types';
import { nextHeatLevel } from './feedback';

interface FreethrowSceneConfig {
  hooks: GameRuntimeHooks;
}

interface MenuRow {
  label: () => string;
  onClick: () => void;
}

interface BallState {
  active: boolean;
  phase: 'flight' | 'rebound';
  elapsed: number;
  reboundElapsed: number;
  reboundDuration: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  shooter: 0 | 1;
  spotId: ShotSpotId;
  input: ShotInput | null;
  pressureAtRelease: number;
  arc: ShotArcParams | null;
  outcome: ShotOutcome | null;
}

interface TrailParticle {
  dot: Phaser.GameObjects.Arc;
  life: number;
}

const PROGRESSION_KEY = 'gamegrid.freethrow-frenzy.progression.v1';
const LEADERBOARD_KEY = 'gamegrid.freethrow-frenzy.leaderboard.v1';

interface FreethrowProgression {
  modeCompletions: Record<FreethrowOptions['mode'], number>;
  bestScoreByMode: Record<FreethrowOptions['mode'], number>;
  unlockedChallenges: string[];
}

interface LeaderboardEntry {
  mode: FreethrowOptions['mode'];
  score: number;
  accuracy: number;
  bestStreak: number;
  at: string;
}

interface WeeklyEventMod {
  key: 'clean_release' | 'corner_money' | 'pressure_cooker' | 'calm_day';
  label: string;
  pressureBoost: number;
  timingBonus: number;
  scoreBonus: number;
}

const TUTORIAL_KEY = 'gamegrid.freethrow-frenzy.tutorial.v1';

function loadProgression(): FreethrowProgression {
  const base: FreethrowProgression = {
    modeCompletions: { timed_60: 0, three_point_contest: 0, horse: 0 },
    bestScoreByMode: { timed_60: 0, three_point_contest: 0, horse: 0 },
    unlockedChallenges: []
  };
  try {
    const raw = window.localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<FreethrowProgression>;
    return {
      modeCompletions: { ...base.modeCompletions, ...(parsed.modeCompletions ?? {}) },
      bestScoreByMode: { ...base.bestScoreByMode, ...(parsed.bestScoreByMode ?? {}) },
      unlockedChallenges: Array.isArray(parsed.unlockedChallenges) ? parsed.unlockedChallenges : []
    };
  } catch {
    return base;
  }
}

function saveProgression(value: FreethrowProgression) {
  try {
    window.localStorage.setItem(PROGRESSION_KEY, JSON.stringify(value));
  } catch {
    // Keep gameplay alive when storage fails.
  }
}

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  try {
    window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, 25)));
  } catch {
    // Keep gameplay alive when storage fails.
  }
}

function isoWeekId(date: Date): number {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function resolveWeeklyEvent(now = new Date()): WeeklyEventMod {
  const pool: WeeklyEventMod[] = [
    { key: 'clean_release', label: 'Clean Release Week', pressureBoost: 0, timingBonus: 0.06, scoreBonus: 0 },
    { key: 'corner_money', label: 'Corner Money Week', pressureBoost: 0.05, timingBonus: 0, scoreBonus: 1 },
    { key: 'pressure_cooker', label: 'Pressure Cooker Week', pressureBoost: 0.15, timingBonus: -0.02, scoreBonus: 1 },
    { key: 'calm_day', label: 'Calm Court Week', pressureBoost: -0.08, timingBonus: 0.03, scoreBonus: 0 }
  ];
  const year = now.getUTCFullYear();
  const idx = (isoWeekId(now) + year) % pool.length;
  return pool[idx];
}

function formatTimer(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const safe = Math.max(0, totalSec);
  const min = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const sec = (safe % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}


export class FreethrowFrenzyScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private settings: FreethrowSettings = loadSettings();
  private progression: FreethrowProgression = loadProgression();
  private leaderboard: LeaderboardEntry[] = loadLeaderboard();
  private weeklyEvent: WeeklyEventMod = resolveWeeklyEvent();
  private activeChallengeText = '';

  private modeState: FreethrowModeState = createInitialModeState(this.settings.mode);
  private matchStartedMs = 0;

  private rngSeed = 0.48291;

  private hud!: FreethrowHud;
  private shotMeter!: ShotMeter;
  private trajectoryPreview!: TrajectoryPreview;
  private courtArt!: ReturnType<typeof buildCourtArt>;

  private ballGroup!: Phaser.GameObjects.Container;
  private ballCore!: Phaser.GameObjects.Arc;
  private ballSeam!: Phaser.GameObjects.Graphics;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private trailPool: TrailParticle[] = [];
  private landingIndicator!: Phaser.GameObjects.Arc;

  private sparkPool!: ParticlePool;
  private rimSparkPool!: ParticlePool;

  private menuContainer!: Phaser.GameObjects.Container;
  private pauseContainer!: Phaser.GameObjects.Container;
  private settingsContainer!: Phaser.GameObjects.Container;
  private endContainer!: Phaser.GameObjects.Container;
  private endSummaryText!: Phaser.GameObjects.Text;
  private tutorialContainer!: Phaser.GameObjects.Container;
  private countdownText!: Phaser.GameObjects.Text;

  private spotMarkers: Record<ShotSpotId, Phaser.GameObjects.Arc> = {
    free_throw: null as unknown as Phaser.GameObjects.Arc,
    midrange: null as unknown as Phaser.GameObjects.Arc,
    three_point: null as unknown as Phaser.GameObjects.Arc,
    left_corner: null as unknown as Phaser.GameObjects.Arc,
    left_wing: null as unknown as Phaser.GameObjects.Arc,
    top_arc: null as unknown as Phaser.GameObjects.Arc,
    right_wing: null as unknown as Phaser.GameObjects.Arc,
    right_corner: null as unknown as Phaser.GameObjects.Arc
  };

  private swipeCapture = createSwipeCapture();
  private holdCapture = createHoldReleaseCapture();

  private ball: BallState = {
    active: false,
    phase: 'flight',
    elapsed: 0,
    reboundElapsed: 0,
    reboundDuration: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    shooter: 0,
    spotId: 'free_throw',
    input: null,
    pressureAtRelease: 0,
    arc: null,
    outcome: null
  };

  private selectedTimedSpotIndex = 0;
  private selectedHorseSpot: ShotSpotId = 'free_throw';

  private ended = false;
  private localPaused = false;
  private aiTurnQueued = false;
  private countdownActive = false;
  private countdownValue = 3;
  private countdownStartMs = 0;
  private tutorialSeen = false;
  private tutorialReturnToPause = false;

  private currentStreak = 0;
  private bestStreakAcrossModes = 0;
  private playerAttempts = 0;
  private playerMakes = 0;
  private heatLevel = 0;
  private telemetryShots = 0;
  private telemetryTimingSum = 0;
  private telemetryPowerErrorSum = 0;
  private telemetryPressurePeak = 0;
  private telemetryDprChanges = 0;
  private telemetryFxChanges = 0;
  private telemetryFpsSum = 0;
  private telemetryFpsSamples = 0;
  private sfxLimiter = new Map<string, number>();

  private meterStartMs = 0;
  private lastGreenCue = false;
  private lastShotInputMs = 0;
  private accumulator = 0;

  private aiState: FreethrowAiState = createFreethrowAiState();

  private safeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  private qualityTuner?: QualityTuner;
  private qualitySnapshot?: QualitySnapshot;
  private perfText?: Phaser.GameObjects.Text;
  private fpsSample = 60;
  private fpsTimer = 0;

  private readonly hoopX = 980;
  private readonly hoopY = 250;
  private readonly rimRadius = 34;
  private readonly backboardX = 1060;

  constructor(config: FreethrowSceneConfig) {
    super('freethrow-frenzy-main');
    this.hooks = config.hooks;
  }

  create() {
    this.safeInsets = this.readSafeAreaInsets();
    this.buildCourt();
    this.buildHud();
    this.buildBall();
    this.buildMenu();
    this.buildPauseMenu();
    this.buildPauseSettings();
    this.buildEndScreen();
    this.buildTutorial();
    this.buildSpotMarkers();
    this.refreshSpotHighlights();
    this.refreshMenu();
    this.setupQualityTuner();

    this.hud.onPauseClick(() => this.togglePause());

    this.scale.on('resize', () => this.handleResize());
    this.handleResize();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.canAcceptInput()) return;
      const now = performance.now();
      if (now - this.lastShotInputMs < SPAWN_TUNING.shotCooldownMs) return;
      this.meterStartMs = now;
      this.lastGreenCue = false;

      if (this.settings.controls === 'arc_swipe') {
        this.swipeCapture.pointerDown(pointer.id, pointer.x, pointer.y, this.meterStartMs);
      } else {
        this.holdCapture.pointerDown(pointer.id, pointer.x, this.meterStartMs);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.settings.controls === 'arc_swipe') {
        this.swipeCapture.pointerMove(pointer.id, pointer.x, pointer.y);
      } else {
        this.holdCapture.pointerMove(pointer.id, pointer.x);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.canAcceptInput()) return;
      const now = performance.now();
      const phase = this.currentMeterPhase(now);
      let input: ShotInput | null = null;
      if (this.settings.controls === 'arc_swipe') {
        input = this.swipeCapture.pointerUp(pointer.id, pointer.x, pointer.y, phase, this.settings.sensitivity);
      } else {
        input = this.holdCapture.pointerUp(pointer.id, now, phase);
      }

      if (!input) return;
      if (this.settings.simplifiedControls) {
        input.meterPhase = 0.5;
      }
      this.lastShotInputMs = now;
      this.beginShot(0, this.getCurrentHumanSpot(), input);
    });

    this.startMenuMode();
  }

  update(_time: number, deltaMs: number) {
    const now = performance.now();
    const dt = Math.min(deltaMs / 1000, 0.05);
    this.updateShotMeter(now);
    this.updateTrail(dt);
    this.sparkPool.update(dt);
    this.rimSparkPool.update(dt);
    this.updatePerf(dt);

    if (this.menuContainer.visible || this.endContainer.visible || this.settingsContainer.visible || this.pauseContainer.visible || this.localPaused) {
      this.refreshHud();
      return;
    }

    if (this.countdownActive) {
      this.updateCountdown(now);
      this.refreshHud();
      return;
    }

    this.accumulator += dt;
    const fixed = 1 / 120;

    while (this.accumulator >= fixed) {
      this.fixedStep(fixed);
      this.accumulator -= fixed;
    }

    this.refreshHud();
    this.refreshSpotHighlights();
    this.queueAiTurnIfNeeded();
  }

  private fixedStep(dt: number) {
    if (this.modeState.kind === 'timed_60' && !this.ended) {
      this.modeState = tickTimedMode(this.modeState, dt * 1000);
      if (this.modeState.ended) {
        this.finishMatch();
        return;
      }
    }

    if (!this.ball.active) return;

    if (this.ball.phase === 'flight') {
      this.ball.elapsed += dt;
      const arc = this.ball.arc;
      if (!arc) return;

      const t = Math.min(arc.flightTime, this.ball.elapsed);
      const x = arc.releaseX + arc.velocityX * t;
      const y = arc.releaseY + arc.velocityY * t + 0.5 * arc.gravity * t * t;
      this.ball.x = x;
      this.ball.y = y;
      this.ballGroup.setPosition(x, y);
      this.ballShadow.setPosition(x + 10, 640).setScale(0.5 + (y / 850), 1);
      this.spawnTrail(x, y);

      if (this.ball.elapsed >= arc.flightTime) {
        this.resolveBallOutcome();
      }
      return;
    }

    this.ball.reboundElapsed += dt;
    this.ball.vy += 1100 * dt;
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    if (this.ball.y >= 640) {
      this.ball.y = 640;
      this.ball.vy *= -0.34;
      this.ball.vx *= 0.72;
      this.playCue('bounce');
    }

    this.ballGroup.setPosition(this.ball.x, this.ball.y);
    this.ballShadow.setPosition(this.ball.x + 8, 640);

    if (this.ball.reboundElapsed >= this.ball.reboundDuration) {
      this.finishShotCycle();
    }
  }

  private startMenuMode() {
    this.menuContainer.setVisible(true);
    this.settingsContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.pauseContainer.setVisible(false);
    this.hud.setVisible(false);
    this.shotMeter.setVisible(false);
    this.countdownText.setVisible(false);
    this.tutorialContainer.setVisible(false);
    this.trajectoryPreview.hide();
    this.landingIndicator.setVisible(false);
    this.localPaused = false;
    this.countdownActive = false;
    this.countdownStartMs = 0;
    this.ended = false;
    this.ball.active = false;
    this.currentStreak = 0;
    this.bestStreakAcrossModes = 0;
    this.playerAttempts = 0;
    this.playerMakes = 0;
    this.telemetryShots = 0;
    this.telemetryTimingSum = 0;
    this.telemetryPowerErrorSum = 0;
    this.telemetryPressurePeak = 0;
    this.telemetryDprChanges = 0;
    this.telemetryFxChanges = 0;
    this.telemetryFpsSum = 0;
    this.telemetryFpsSamples = 0;
    this.activeChallengeText = this.readChallengeHint();
    this.refreshHud();
  }

  private startMatch() {
    try {
      this.modeState = createInitialModeState(this.settings.mode);
      this.weeklyEvent = resolveWeeklyEvent();
      if (this.settings.simplifiedControls) {
        this.settings.assist = true;
        this.settings.pressure = false;
        this.settings.controls = 'hold_release';
        this.settings.sensitivity = 'low';
      }
      this.selectedTimedSpotIndex = 0;
      this.selectedHorseSpot = 'free_throw';
      this.currentStreak = 0;
      this.bestStreakAcrossModes = 0;
      this.playerAttempts = 0;
      this.playerMakes = 0;
      this.telemetryShots = 0;
      this.telemetryTimingSum = 0;
      this.telemetryPowerErrorSum = 0;
      this.telemetryPressurePeak = 0;
      this.telemetryDprChanges = 0;
      this.telemetryFxChanges = 0;
      this.telemetryFpsSum = 0;
      this.telemetryFpsSamples = 0;
      this.sfxLimiter.clear();
      this.aiTurnQueued = false;
      this.ended = false;
      this.localPaused = false;
      this.ball.active = false;
      this.countdownActive = true;
      this.countdownValue = 3;
      this.countdownStartMs = 0;
      this.countdownText.setText('3').setVisible(false);
      this.menuContainer.setVisible(false);
      this.settingsContainer.setVisible(false);
      this.pauseContainer.setVisible(false);
      this.endContainer.setVisible(false);
      this.hud.setVisible(true);
      this.shotMeter.setVisible(true);
      this.refreshSpotHighlights();
      this.activeChallengeText = this.readChallengeHint();
      saveSettings(this.settings);
      this.qualityTuner?.updateFromSettings(this.settings);

      if (!this.tutorialSeen) {
        this.showTutorialOverlay();
      } else {
        this.startCountdown();
      }

      this.hooks.reportEvent({
        type: 'game_start',
        gameId: this.hooks.gameId,
        mode: this.settings.mode,
        difficulty: this.settings.difficulty,
        controls: this.settings.controls,
        options: {
          timingMeter: this.settings.timingMeter,
          pressure: this.settings.pressure,
          assist: this.settings.assist,
          sensitivity: this.settings.sensitivity,
          opponent: this.settings.opponent,
          moneyRack: this.settings.moneyRack,
          deepRange: this.settings.deepRange,
          overtime: this.settings.overtime,
          simplifiedControls: this.settings.simplifiedControls,
          aiPersonality: this.settings.aiPersonality,
          effects: this.settings.effects,
          dprCap: this.settings.dprCap,
          autoQuality: this.settings.autoQuality,
          haptics: this.settings.haptics,
          sfx: this.settings.sfx,
          event: this.weeklyEvent.key
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start Freethrow Frenzy';
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private canHumanShoot(): boolean {
    if (this.ended) return false;
    if (this.countdownActive) return false;

    if (this.modeState.kind === 'timed_60' || this.modeState.kind === 'three_point_contest') {
      return true;
    }

    if (this.settings.opponent === 'local') return true;

    if (this.modeState.phase === 'set_challenge') {
      return this.modeState.shooter === 0;
    }

    return this.modeState.responder === 0;
  }

  private isAiTurn(): boolean {
    if (this.settings.opponent !== 'ai') return false;
    if (this.ended || this.ball.active || this.countdownActive || this.menuContainer.visible || this.endContainer.visible || this.settingsContainer.visible || this.pauseContainer.visible) return false;
    if (this.modeState.kind !== 'horse') return false;

    if (this.modeState.phase === 'set_challenge') return this.modeState.shooter === 1;
    if (this.modeState.phase === 'answer') return this.modeState.responder === 1;
    return false;
  }

  private queueAiTurnIfNeeded() {
    if (!this.isAiTurn() || this.aiTurnQueued) return;

    this.aiTurnQueued = true;
    this.time.delayedCall(340, () => {
      this.aiTurnQueued = false;
      if (!this.isAiTurn()) return;

      if (this.modeState.kind !== 'horse') return;

      let spotId: ShotSpotId;
      if (this.modeState.phase === 'set_challenge') {
        const random = this.nextRandom();
        spotId = pickAiHorseSpot(this.settings.difficulty, random);
      } else {
        spotId = this.modeState.challengeSpot ?? 'free_throw';
      }

      const scoreDelta = this.modeState.makes[0] - this.modeState.makes[1];
      const adaptiveDifficulty = buildAdaptiveAiDifficulty(
        this.settings.difficulty,
        this.settings.aiPersonality,
        scoreDelta,
        computeAccuracy(this.playerAttempts, this.playerMakes)
      );
      const planned = planAiShot(
        this.aiState,
        spotId,
        adaptiveDifficulty,
        this.settings.controls,
        this.settings.timingMeter,
        this.settings.aiPersonality
      );
      this.aiState = planned.state;
      this.beginShot(1, spotId, planned.input);
    });
  }

  private beginShot(shooter: 0 | 1, spotId: ShotSpotId, input: ShotInput) {
    try {
      const pressure = this.computePressureLevel();
      const adjustedInput: ShotInput = this.settings.simplifiedControls
        ? {
            ...input,
            meterPhase: this.settings.timingMeter ? 0.5 : input.meterPhase,
            aim: clamp(input.aim, -0.72, 0.72)
          }
        : input;
      const context = this.buildShotContext(spotId, pressure);
      const arc = mapInputToShotArc(adjustedInput, context);
      arc.timingWindow = clamp(arc.timingWindow + this.weeklyEvent.timingBonus, 0.05, 0.26);
      const outcome = resolveShotOutcome(arc, context, this.nextRandom(), this.nextRandom());

      this.ball.active = true;
      this.ball.phase = 'flight';
      this.ball.elapsed = 0;
      this.ball.reboundElapsed = 0;
      this.ball.reboundDuration = SPAWN_TUNING.reboundQuickMs;
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.ball.x = arc.releaseX;
      this.ball.y = arc.releaseY;
      this.ball.shooter = shooter;
      this.ball.spotId = spotId;
      this.ball.input = adjustedInput;
      this.ball.pressureAtRelease = context.pressure;
      this.ball.arc = arc;
      this.ball.outcome = outcome;

      this.trajectoryPreview.hide();
      this.landingIndicator.setVisible(false);

      this.ballGroup.setPosition(this.ball.x, this.ball.y).setVisible(true);
      this.ballShadow.setVisible(true).setPosition(this.ball.x + 8, 640);
      this.playCue('spawn');
      this.telemetryShots += 1;
      this.telemetryTimingSum += arc.timingQuality;
      this.telemetryPowerErrorSum += Math.abs(adjustedInput.power - SHOT_SPOTS[spotId].targetPower);
      this.telemetryPressurePeak = Math.max(this.telemetryPressurePeak, context.pressure);

      this.hooks.reportEvent({
        type: 'shot_release',
        gameId: this.hooks.gameId,
        mode: this.settings.mode,
        difficulty: this.settings.difficulty,
        timingBucket: arc.timingBucket ?? 'good',
        timingQuality: arc.timingQuality,
        power: adjustedInput.power,
        aim: adjustedInput.aim,
        pressure: context.pressure,
        heat: this.heatLevel,
        streak: this.currentStreak
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Shot simulation failure';
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private resolveBallOutcome() {
    const outcome = this.ball.outcome;
    const spotId = this.ball.spotId;
    const shooter = this.ball.shooter;
    if (!outcome) {
      this.finishShotCycle();
      return;
    }

    this.ball.phase = 'rebound';
    this.ball.reboundElapsed = 0;

    this.ball.x = outcome.finalX;
    this.ball.y = outcome.finalY;
    this.ballGroup.setPosition(this.ball.x, this.ball.y);

    if (outcome.made) {
      this.playCue(outcome.swish ? 'swish' : 'net');
      if (this.settings.haptics) triggerHaptic(outcome.swish ? [8, 18, 12] : 10);
      if (!this.settings.reducedMotionPlus) cameraFlash(this, 42, 255, 255, 210);
      this.courtArt.net.setAlpha(1);
      this.tweens.add({ targets: this.courtArt.net, alpha: 0.72, duration: 110, yoyo: true });
      if (this.getEffectsLevel() !== 'off') {
        this.sparkPool.spawnBurst(this.hoopX, this.hoopY + 10, outcome.swish ? 10 : 6, 110, 0.4);
      }
      this.ball.vx = outcome.swish ? -38 : 45;
      this.ball.vy = 180;
      this.ball.reboundDuration = SPAWN_TUNING.reboundQuickMs;
    } else if (outcome.backboardHit) {
      this.playCue('backboard');
      if (this.getEffectsLevel() !== 'off') {
        this.rimSparkPool.spawnBurst(this.backboardX - 6, this.hoopY - 12, 6, 80, 0.35, Math.PI);
      }
      if (!this.settings.reducedMotionPlus) cameraShake(this, 70, 0.0018 + this.heatLevel * 0.00008);
      this.ball.vx = -220;
      this.ball.vy = 90;
      this.ball.reboundDuration = SPAWN_TUNING.reboundLongMs;
    } else if (outcome.rimHit) {
      this.playCue('rim');
      if (this.getEffectsLevel() !== 'off') {
        this.rimSparkPool.spawnBurst(outcome.finalX, this.hoopY + 2, 6, 90, 0.35, Math.PI);
      }
      if (!this.settings.reducedMotionPlus) cameraShake(this, 80, 0.002 + this.heatLevel * 0.00008);
      this.ball.vx = outcome.finalX < this.hoopX ? -180 : 180;
      this.ball.vy = -110;
      this.ball.reboundDuration = SPAWN_TUNING.reboundLongMs;
    } else {
      this.playCue('miss');
      if (!this.settings.reducedMotionPlus) cameraShake(this, 50, 0.0015);
      this.ball.vx = 0;
      this.ball.vy = 120;
      this.ball.reboundDuration = SPAWN_TUNING.reboundQuickMs;
    }

    this.applyOutcomeToRules(shooter, spotId, outcome);
  }

  private applyOutcomeToRules(shooter: 0 | 1, spotId: ShotSpotId, outcome: ShotOutcome) {
    const humanShot = this.settings.opponent === 'local' || shooter === 0;
    const deepRangeBonus = this.settings.deepRange && spotId !== 'free_throw' && spotId !== 'midrange' ? 1 : 0;
    const eventScoreBonus = this.weeklyEvent.scoreBonus;
    const basePoints = SHOT_SPOTS[spotId].basePoints + deepRangeBonus + (outcome.made ? eventScoreBonus : 0);
    const heatMultiplier = 1 + this.heatLevel * HEAT_TUNING.scoreMultiplierStep;
    const shotPoints = outcome.made ? Math.max(1, Math.round(basePoints * heatMultiplier)) : 0;

    if (humanShot) {
      this.playerAttempts += 1;
      if (outcome.made) this.playerMakes += 1;

      this.currentStreak = outcome.made ? this.currentStreak + 1 : 0;
      this.heatLevel = nextHeatLevel(this.heatLevel, outcome.made, outcome.swish);
      if (this.currentStreak > this.bestStreakAcrossModes) {
        this.bestStreakAcrossModes = this.currentStreak;
      }
      const feedback = this.buildCoachFeedback(spotId, outcome);
      this.hud.showToast(feedback.text, feedback.tone);
      if (!outcome.made && this.settings.haptics) triggerHaptic(6);
    }

    this.reportShotOutcome(outcome, spotId);

    if (this.modeState.kind === 'timed_60') {
      this.modeState = applyTimedShot(this.modeState, {
        made: outcome.made,
        points: shotPoints
      });
      return;
    }

    if (this.modeState.kind === 'three_point_contest') {
      this.modeState = applyThreePointShot(this.modeState, outcome.made);
      if (outcome.made && this.heatLevel > 0) {
        this.modeState.score += Math.round((heatMultiplier - 1) * basePoints);
      }
      if (outcome.made && this.settings.moneyRack && this.modeState.ballInRack === 0) {
        this.modeState.score += 1;
      }
      if (outcome.made && this.settings.deepRange && (spotId === 'top_arc' || spotId === 'three_point')) {
        this.modeState.score += 1;
      }
      if (this.modeState.ended) {
        if (this.settings.overtime && this.modeState.score === 30) {
          this.modeState.ended = false;
          this.modeState.totalBallsShot = Math.max(0, this.modeState.totalBallsShot - 1);
        } else {
          this.finishMatch();
        }
      }
      return;
    }

    if (this.modeState.phase === 'set_challenge') {
      this.modeState = applyHorseSetChallengeShot(this.modeState, spotId, outcome.made);
    } else {
      this.modeState = applyHorseAnswerShot(this.modeState, outcome.made);
    }

    if (this.modeState.ended) {
      this.finishMatch();
    }
  }

  private buildCoachFeedback(spotId: ShotSpotId, outcome: ShotOutcome): { text: string; tone: 'good' | 'bad' | 'neutral' } {
    const input = this.ball.input;
    const arc = this.ball.arc;
    if (outcome.made) {
      const call = outcome.swish ? 'Swish!' : 'Bucket';
      if (arc && arc.timingQuality >= 0.9) return { text: `${call} Perfect release.`, tone: 'good' };
      return { text: `${call} Nice rhythm.`, tone: 'good' };
    }
    if (arc?.timingBucket === 'early') return { text: 'Early release', tone: 'bad' };
    if (arc?.timingBucket === 'late') return { text: 'Late release', tone: 'bad' };
    if (input && input.power > SHOT_SPOTS[spotId].targetPower + 0.14) return { text: 'Too much power', tone: 'bad' };
    if (input && input.power < SHOT_SPOTS[spotId].targetPower - 0.12) return { text: 'Came up short', tone: 'bad' };
    if (input && Math.abs(input.aim) > 0.45) return { text: input.aim > 0 ? 'Pulled right' : 'Pulled left', tone: 'bad' };
    if (outcome.backboardHit) return { text: 'Backboard miss', tone: 'bad' };
    return { text: `Missed ${SHOT_SPOTS[spotId].label}`, tone: 'neutral' };
  }

  private finishShotCycle() {
    this.ball.active = false;
    this.ball.input = null;
    this.ball.arc = null;
    this.ball.outcome = null;
    this.ballGroup.setVisible(false);
    this.ballShadow.setVisible(false);

    if (this.modeState.kind === 'timed_60' && this.modeState.ended) {
      this.finishMatch();
    }

    if (this.modeState.kind === 'three_point_contest' && this.modeState.ended) {
      this.finishMatch();
    }
  }

  private getCurrentHumanSpot(): ShotSpotId {
    if (this.modeState.kind === 'timed_60') {
      return TIMED_SPOT_ORDER[this.selectedTimedSpotIndex % TIMED_SPOT_ORDER.length];
    }

    if (this.modeState.kind === 'three_point_contest') {
      return getThreePointSpot(this.modeState);
    }

    if (this.modeState.phase === 'answer') {
      return this.modeState.challengeSpot ?? this.selectedHorseSpot;
    }

    return this.selectedHorseSpot;
  }

  private computePressureLevel(): number {
    if (!this.settings.pressure) return 0;
    const preset = DIFFICULTY_PRESETS[this.settings.difficulty];
    const difficultyBase =
      this.settings.difficulty === 'easy'
        ? PRESSURE_TUNING.baseEasy
        : this.settings.difficulty === 'medium'
          ? PRESSURE_TUNING.baseMedium
          : this.settings.difficulty === 'hard'
            ? PRESSURE_TUNING.baseHard
            : PRESSURE_TUNING.basePro;

    if (this.modeState.kind === 'timed_60') {
      const timeFactor = 1 - this.modeState.timeRemainingMs / 60_000;
      return clamp(
        difficultyBase +
          this.modeState.streak * PRESSURE_TUNING.streakBoost * preset.pressureScale +
          timeFactor * PRESSURE_TUNING.timeBoost * preset.pressureScale +
          this.weeklyEvent.pressureBoost,
        PRESSURE_TUNING.clampMin,
        PRESSURE_TUNING.clampMax
      );
    }

    if (this.modeState.kind === 'three_point_contest') {
      return clamp(
        difficultyBase +
          (this.modeState.totalBallsShot / 30) * preset.pressureScale +
          this.weeklyEvent.pressureBoost,
        PRESSURE_TUNING.clampMin,
        PRESSURE_TUNING.clampMax
      );
    }

    const letters = this.modeState.playerLetters[0] + this.modeState.playerLetters[1];
    return clamp(
      difficultyBase + letters * 0.08 * preset.pressureScale + this.weeklyEvent.pressureBoost,
      PRESSURE_TUNING.clampMin,
      PRESSURE_TUNING.clampMax
    );
  }

  private currentMeterPhase(nowMs: number): number {
    if (!this.settings.timingMeter) return 0.5;
    const elapsed = nowMs - this.meterStartMs;
    return (elapsed / TIMING_TUNING.periodMs) % 1;
  }

  private startCountdown() {
    this.countdownActive = true;
    this.countdownValue = 3;
    this.countdownStartMs = performance.now();
    this.countdownText.setText('3').setVisible(true);
  }

  private updateCountdown(nowMs: number) {
    if (!this.countdownActive) return;
    if (this.countdownStartMs <= 0) return;
    const elapsed = nowMs - this.countdownStartMs;
    const remaining = 3 - Math.floor(elapsed / 1000);

    if (remaining !== this.countdownValue && remaining >= 0) {
      this.countdownValue = remaining;
      this.playCue('countdown');
      this.countdownText.setText(remaining > 0 ? String(remaining) : 'GO!');
      if (this.settings.haptics) triggerHaptic(10);
    }

    if (elapsed >= 3200) {
      this.countdownActive = false;
      this.countdownText.setVisible(false);
      this.beginLiveMatch();
    }
  }

  private beginLiveMatch() {
    this.matchStartedMs = performance.now();
    this.hud.showToast('Go!', 'good');
  }

  private togglePause() {
    if (this.menuContainer.visible || this.endContainer.visible || this.settingsContainer.visible) return;
    this.localPaused = !this.localPaused;
    if (this.localPaused) {
      this.pauseContainer.setVisible(true);
      this.settingsContainer.setVisible(false);
      this.accumulator = 0;
    } else {
      this.pauseContainer.setVisible(false);
    }
    this.playCue('ui');
  }

  private canAcceptInput(): boolean {
    if (this.menuContainer.visible || this.endContainer.visible || this.settingsContainer.visible || this.pauseContainer.visible) return false;
    if (this.localPaused || this.countdownActive || this.ball.active) return false;
    return this.canHumanShoot();
  }

  private readSafeAreaInsets() {
    if (typeof window === 'undefined') {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }
    const style = getComputedStyle(document.documentElement);
    const read = (name: string) => {
      const value = style.getPropertyValue(name);
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return {
      top: read('--safe-area-top'),
      right: read('--safe-area-right'),
      bottom: read('--safe-area-bottom'),
      left: read('--safe-area-left')
    };
  }

  private handleResize() {
    this.safeInsets = this.readSafeAreaInsets();
    const width = this.scale.width;
    const height = this.scale.height;
    this.hud.setLeftHanded(this.settings.leftHandedHud);
    this.shotMeter.setLeftHanded(this.settings.leftHandedHud);
    this.hud.layout(width, height, this.safeInsets);
    this.shotMeter.layout(width, height, this.safeInsets);
    this.countdownText.setPosition(width / 2, height / 2 - 20);
    this.tutorialContainer.setPosition(width / 2, height / 2);
    if (this.perfText) {
      this.perfText.setPosition(20 + this.safeInsets.left, 100 + this.safeInsets.top);
    }
  }

  private setupQualityTuner() {
    if (!this.game) return;
    this.qualityTuner = new QualityTuner(
      this.game,
      { effects: this.settings.effects, dprCap: this.settings.dprCap, autoQuality: this.settings.autoQuality },
      (snapshot) => {
        if (this.qualitySnapshot) {
          if (snapshot.dprCap !== this.qualitySnapshot.dprCap) this.telemetryDprChanges += 1;
          if (snapshot.effects !== this.qualitySnapshot.effects) this.telemetryFxChanges += 1;
          if (
            snapshot.dprCap !== this.qualitySnapshot.dprCap ||
            snapshot.effects !== this.qualitySnapshot.effects ||
            snapshot.appliedDpr !== this.qualitySnapshot.appliedDpr
          ) {
            this.hooks.reportEvent({
              type: 'quality_change',
              gameId: this.hooks.gameId,
              effects: snapshot.effects,
              dprCap: snapshot.dprCap,
              appliedDpr: snapshot.appliedDpr
            });
          }
        }
        this.qualitySnapshot = snapshot;
      }
    );

    if (import.meta.env.DEV) {
      this.perfText = this.add.text(20, 100, '', { color: '#bfe3ff', fontSize: '12px', fontFamily: 'monospace' }).setDepth(30);
    }
  }

  private updatePerf(dt: number) {
    if (this.qualityTuner) {
      const fps = this.game.loop.actualFps ?? 60;
      this.qualityTuner.sampleFps(fps, dt);
      this.telemetryFpsSum += fps;
      this.telemetryFpsSamples += 1;
    }
    if (!this.perfText || !import.meta.env.DEV) return;
    this.perfText.setVisible(this.settings.showPerfHud);
    if (!this.settings.showPerfHud) return;
    this.fpsTimer += dt;
    if (this.fpsTimer < 0.4) return;
    this.fpsTimer = 0;
    const fps = this.game.loop.actualFps ?? 60;
    this.fpsSample = fps;
    const dpr = this.qualitySnapshot?.appliedDpr ?? window.devicePixelRatio ?? 1;
    const effects = this.getEffectsLevel();
    this.perfText.setText(`FPS ${fps.toFixed(1)} | DPR ${dpr.toFixed(2)} | VFX ${effects.toUpperCase()}`);
  }

  private getEffectsLevel() {
    return this.qualitySnapshot?.effects ?? this.settings.effects ?? QUALITY_DEFAULTS.effects;
  }

  private getSwipeAimPreview(): number {
    const preview = this.swipeCapture.getPreview();
    const sensitivityScale = this.settings.sensitivity === 'low' ? 1.2 : this.settings.sensitivity === 'high' ? 0.82 : 1;
    return clamp((preview.dx / 220) * sensitivityScale, -1, 1);
  }

  private getPreviewInput(phase: number, aim: number, charge: number): ShotInput | null {
    const meterPhase = this.settings.simplifiedControls ? 0.5 : phase;
    if (this.holdCapture.isActive()) {
      return { aim, power: clamp(charge, 0.08, 1), meterPhase, controlScheme: 'hold_release' };
    }
    if (this.swipeCapture.isActive()) {
      const preview = this.swipeCapture.getPreview();
      const sensitivityScale = this.settings.sensitivity === 'low' ? 1.2 : this.settings.sensitivity === 'high' ? 0.82 : 1;
      const power = clamp((-preview.dy / (250 * sensitivityScale)) + (Math.abs(preview.dx) / 700), 0.08, 1);
      const aimPreview = clamp((preview.dx / 220) * sensitivityScale, -1, 1);
      return { aim: aimPreview, power, meterPhase, controlScheme: 'arc_swipe' };
    }
    return null;
  }

  private buildShotContext(spotId: ShotSpotId, pressureOverride?: number) {
    const spot = SHOT_SPOTS[spotId];
    return {
      spot,
      difficulty: this.settings.difficulty,
      timingMeter: this.settings.timingMeter,
      pressureEnabled: this.settings.pressure,
      pressure: pressureOverride ?? this.computePressureLevel(),
      assist: this.settings.assist,
      hoopX: this.hoopX,
      hoopY: this.hoopY,
      rimRadius: this.rimRadius,
      backboardX: this.backboardX
    };
  }

  private showTutorialOverlay() {
    this.tutorialReturnToPause = this.pauseContainer.visible;
    this.tutorialContainer.setVisible(true);
    this.pauseContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.localPaused = true;
  }

  private shareResult() {
    const score = this.modeState.kind === 'timed_60' || this.modeState.kind === 'three_point_contest' ? this.modeState.score : this.modeState.makes[0];
    const text = `Freethrow Frenzy: ${score} points in ${this.settings.mode}.`;
    if (navigator.share) {
      void navigator.share({ text });
    } else {
      void navigator.clipboard?.writeText(text);
      this.hud.showToast('Result copied', 'neutral');
    }
  }

  private reportShotOutcome(outcome: ShotOutcome, spotId: ShotSpotId) {
    const arc = this.ball.arc;
    this.hooks.reportEvent({
      type: 'shot_result',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      spot: spotId,
      result: outcome.contact,
      made: outcome.made,
      timingBucket: arc?.timingBucket ?? 'good',
      timingQuality: arc?.timingQuality ?? 0,
      pressure: this.ball.pressureAtRelease,
      heat: this.heatLevel,
      streak: this.currentStreak
    });
  }

  private finishMatch() {
    if (this.ended) return;
    this.ended = true;
    this.countdownActive = false;

    const durationMs = Math.max(0, performance.now() - this.matchStartedMs);

    let score = 0;
    if (this.modeState.kind === 'timed_60' || this.modeState.kind === 'three_point_contest') {
      score = this.modeState.score;
    } else {
      score = this.modeState.makes[0];
    }

    const accuracy = computeAccuracy(this.playerAttempts, this.playerMakes);
    const bestStreak = this.modeState.kind === 'timed_60' ? this.modeState.bestStreak : this.bestStreakAcrossModes;
    const unlockSummary = this.updateProgressionAndLeaderboard(score, accuracy, bestStreak);

    this.endSummaryText.setText(`${this.buildEndSummary(score, accuracy, bestStreak)}${unlockSummary ? `\n${unlockSummary}` : ''}`);
    this.endContainer.setVisible(true);
    this.pauseContainer.setVisible(false);
    this.settingsContainer.setVisible(false);
    this.localPaused = false;
    this.countdownText.setVisible(false);

    this.playCue('buzzer');

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      score,
      accuracy,
      bestStreak,
      event: this.weeklyEvent.key,
      telemetryShots: this.telemetryShots,
      avgTimingQuality: this.telemetryShots > 0 ? this.telemetryTimingSum / this.telemetryShots : 0,
      avgPowerError: this.telemetryShots > 0 ? this.telemetryPowerErrorSum / this.telemetryShots : 0,
      pressurePeak: this.telemetryPressurePeak,
      dprChanges: this.telemetryDprChanges,
      fxChanges: this.telemetryFxChanges,
      avgFps: this.telemetryFpsSamples > 0 ? this.telemetryFpsSum / this.telemetryFpsSamples : 0,
      appliedDpr: this.qualitySnapshot?.appliedDpr ?? 1,
      durationMs
    });
  }

  private readChallengeHint(): string {
    const mode = this.settings.mode;
    if (mode === 'timed_60') return 'Challenge: score 45+ in Timed 60s.';
    if (mode === 'three_point_contest') return 'Challenge: clear contest above 70% accuracy.';
    return 'Challenge: win HORSE with 60%+ accuracy.';
  }

  private updateProgressionAndLeaderboard(score: number, accuracy: number, bestStreak: number): string {
    const mode = this.settings.mode;
    this.progression.modeCompletions[mode] += 1;
    this.progression.bestScoreByMode[mode] = Math.max(this.progression.bestScoreByMode[mode], score);

    const unlocked: string[] = [];
    const maybeUnlock = (id: string, condition: boolean) => {
      if (!condition || this.progression.unlockedChallenges.includes(id)) return;
      this.progression.unlockedChallenges.push(id);
      unlocked.push(id);
    };

    maybeUnlock('timed_45', mode === 'timed_60' && score >= 45);
    maybeUnlock('contest_70', mode === 'three_point_contest' && accuracy >= 0.7);
    maybeUnlock('horse_clutch', mode === 'horse' && this.modeState.kind === 'horse' && this.modeState.winner === 0 && accuracy >= 0.6);
    maybeUnlock('clean_release_week', this.weeklyEvent.key === 'clean_release' && accuracy >= 0.72);

    const entry: LeaderboardEntry = { mode, score, accuracy, bestStreak, at: new Date().toISOString() };
    this.leaderboard = [...this.leaderboard, entry]
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, 25);

    saveProgression(this.progression);
    saveLeaderboard(this.leaderboard);
    return unlocked.length > 0 ? `Unlocked: ${unlocked.join(', ')}` : '';
  }

  private buildEndSummary(score: number, accuracy: number, bestStreak: number): string {
    const pb = this.progression.bestScoreByMode[this.settings.mode] ?? 0;
    const bestRow = this.leaderboard.find((entry) => entry.mode === this.settings.mode);
    if (this.modeState.kind === 'horse') {
      const winner = this.modeState.winner === 0 ? 'Player 1' : this.modeState.winner === 1 ? (this.settings.opponent === 'ai' ? 'AI' : 'Player 2') : 'None';
      return `Winner: ${winner}\nP1: ${horseLettersForPlayer(this.modeState, 0) || '-'}\n${this.settings.opponent === 'ai' ? 'AI' : 'P2'}: ${horseLettersForPlayer(this.modeState, 1) || '-'}\nAccuracy: ${(accuracy * 100).toFixed(1)}%\nBest Streak: ${bestStreak}\nPB: ${pb}\nTop Board: ${bestRow ? `${bestRow.score} (${(bestRow.accuracy * 100).toFixed(0)}%)` : 'None yet'}`;
    }

    return `Score: ${score}\nAccuracy: ${(accuracy * 100).toFixed(1)}%\nBest Streak: ${bestStreak}\nPB: ${pb}\nTop Board: ${bestRow ? `${bestRow.score} (${(bestRow.accuracy * 100).toFixed(0)}%)` : 'None yet'}`;
  }

  private updateShotMeter(nowMs: number) {
    if (
      !this.settings.timingMeter ||
      this.menuContainer.visible ||
      this.endContainer.visible ||
      this.settingsContainer.visible ||
      this.pauseContainer.visible ||
      this.localPaused ||
      this.countdownActive
    ) {
      this.shotMeter.update(0.5, { green: 0.1, yellow: 0.2 }, 0, 0, false, this.settings.colorblindMeter);
      this.trajectoryPreview.hide();
      this.landingIndicator.setVisible(false);
      return;
    }

    const phase = this.currentMeterPhase(nowMs);
    const active = this.holdCapture.isActive() || this.swipeCapture.isActive();
    const aim = this.holdCapture.isActive() ? this.holdCapture.getAim() : this.getSwipeAimPreview();
    const charge = this.holdCapture.isActive() ? this.holdCapture.getCharge(nowMs) : 0.7;

    const preset = DIFFICULTY_PRESETS[this.settings.difficulty];
    const pressure = this.computePressureLevel();
    const window = computeTimingWindow(TIMING_TUNING, preset.timingScale, pressure);

    this.shotMeter.update(phase, window, aim, charge, active, this.settings.colorblindMeter);

    const inGreen = Math.abs(phase - 0.5) <= window.green * 0.5;
    if (active && inGreen && !this.lastGreenCue) {
      this.lastGreenCue = true;
      if (this.settings.haptics) triggerHaptic(8);
      this.playCue('ui');
    }
    if (!inGreen) this.lastGreenCue = false;

    if (active && this.getEffectsLevel() !== 'off' && !this.settings.reducedMotionPlus) {
      const previewInput = this.getPreviewInput(phase, aim, charge);
      if (previewInput) {
        const context = this.buildShotContext(this.getCurrentHumanSpot());
        const arc = mapInputToShotArc(previewInput, context);
        this.trajectoryPreview.drawArc(arc, this.getEffectsLevel() === 'low' ? 0.5 : 0.75);
        this.landingIndicator.setPosition(arc.targetX, arc.targetY).setVisible(true);
      }
    } else {
      this.trajectoryPreview.hide();
      this.landingIndicator.setVisible(false);
    }
  }

  private buildCourt() {
    this.courtArt = buildCourtArt(this, this.hoopX, this.hoopY, this.rimRadius, this.backboardX);
    this.courtArt.net.setAlpha(0.9);
    this.landingIndicator = this.add.circle(this.hoopX, this.hoopY + 8, 10, 0x96c8ff, 0.25).setVisible(false);
    this.sparkPool = new ParticlePool(this, 20, 3, 0xf8d08b);
    this.rimSparkPool = new ParticlePool(this, 16, 3, 0xffb38a);
  }

  private buildHud() {
    this.hud = new FreethrowHud(this);
    this.hud.setLeftHanded(this.settings.leftHandedHud);
    this.hud.onModeBadgeClick(() => {
      if (this.modeState.kind === 'timed_60') {
        this.selectedTimedSpotIndex = (this.selectedTimedSpotIndex + 1) % TIMED_SPOT_ORDER.length;
        this.playCue('ui');
      } else if (this.modeState.kind === 'horse' && this.modeState.phase === 'set_challenge') {
        const order: ShotSpotId[] = ['free_throw', 'midrange', 'three_point'];
        const idx = order.indexOf(this.selectedHorseSpot);
        this.selectedHorseSpot = order[(idx + 1) % order.length];
        this.playCue('ui');
      }
    });

    this.shotMeter = new ShotMeter(this);
    this.shotMeter.setLeftHanded(this.settings.leftHandedHud);
    this.trajectoryPreview = new TrajectoryPreview(this, 18);
    this.countdownText = this.add.text(640, 360, '3', { color: '#f8fbff', fontSize: '64px' }).setOrigin(0.5).setVisible(false);
  }

  private buildBall() {
    this.ballShadow = this.add.ellipse(0, 640, 30, 10, 0x000000, 0.3).setVisible(false);
    this.ballCore = this.add.circle(0, 0, 14, 0xe88736).setStrokeStyle(2, 0x7a3a12);
    this.ballSeam = this.add.graphics();
    this.ballSeam.lineStyle(2, 0x8b4717, 0.8);
    this.ballSeam.beginPath();
    this.ballSeam.arc(0, 0, 10, 0.2, Math.PI - 0.2, false);
    this.ballSeam.strokePath();
    this.ballSeam.beginPath();
    this.ballSeam.arc(0, 0, 10, Math.PI + 0.2, 2 * Math.PI - 0.2, false);
    this.ballSeam.strokePath();
    this.ballGroup = this.add.container(0, 0, [this.ballCore, this.ballSeam]).setVisible(false);

    for (let i = 0; i < 10; i += 1) {
      const dot = this.add.circle(0, 0, 4, 0xf2b66b, 0.45).setVisible(false);
      this.trailPool.push({ dot, life: 0 });
    }
  }

  private buildSpotMarkers() {
    const entries = Object.values(SHOT_SPOTS);
    for (let i = 0; i < entries.length; i += 1) {
      const spot = entries[i];
      const marker = this.add.circle(spot.releaseX, spot.releaseY, 8, 0x2b4e6b, 0.35).setStrokeStyle(2, 0x8dc4ff, 0.7);
      this.spotMarkers[spot.id] = marker;
    }
  }

  private refreshSpotHighlights() {
    const activeSpot = this.getCurrentHumanSpot();
    const entries = Object.values(SHOT_SPOTS);

    for (let i = 0; i < entries.length; i += 1) {
      const spot = entries[i];
      const marker = this.spotMarkers[spot.id];
      if (!marker) continue;
      const active = activeSpot === spot.id;
      marker.setFillStyle(active ? 0x6ad18c : 0x29455f, active ? 0.85 : 0.32);
      marker.setScale(active ? 1.25 : 1);
    }
  }

  private buildMenu() {
    const rows: MenuRow[] = [
      {
        label: () => `Mode: ${this.settings.mode === 'timed_60' ? 'Timed 60s' : this.settings.mode === 'three_point_contest' ? '3-Point Contest' : 'HORSE'}`,
        onClick: () => {
          const order: FreethrowSettings['mode'][] = ['timed_60', 'three_point_contest', 'horse'];
          const idx = order.indexOf(this.settings.mode);
          this.settings.mode = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Difficulty: ${this.settings.difficulty}`,
        onClick: () => {
          const order: FreethrowDifficulty[] = ['easy', 'medium', 'hard', 'pro'];
          const idx = order.indexOf(this.settings.difficulty);
          this.settings.difficulty = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Controls: ${this.settings.controls === 'arc_swipe' ? 'Arc Swipe' : 'Hold & Release'}`,
        onClick: () => {
          this.settings.controls = this.settings.controls === 'arc_swipe' ? 'hold_release' : 'arc_swipe';
          this.refreshMenu();
        }
      },
      {
        label: () => `Swipe Sensitivity: ${this.settings.sensitivity}`,
        onClick: () => {
          const order: FreethrowSensitivity[] = ['low', 'medium', 'high'];
          const idx = order.indexOf(this.settings.sensitivity);
          this.settings.sensitivity = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Timing Meter: ${this.settings.timingMeter ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.timingMeter = !this.settings.timingMeter;
          this.refreshMenu();
        }
      },
      {
        label: () => `Pressure: ${this.settings.pressure ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.pressure = !this.settings.pressure;
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
        label: () => `SFX: ${this.settings.sfx ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.sfx = !this.settings.sfx;
          this.refreshMenu();
        }
      },
      {
        label: () => `Haptics: ${this.settings.haptics ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.haptics = !this.settings.haptics;
          this.refreshMenu();
        }
      },
      {
        label: () => `VFX: ${this.settings.effects}`,
        onClick: () => {
          const order: Array<typeof this.settings.effects> = ['high', 'low', 'off'];
          const idx = order.indexOf(this.settings.effects);
          this.settings.effects = order[(idx + 1) % order.length];
          this.qualityTuner?.updateFromSettings(this.settings);
          this.refreshMenu();
        }
      },
      {
        label: () => `DPR Cap: ${this.settings.dprCap.toFixed(2)}`,
        onClick: () => {
          const options = [1.25, 1.5, 1.75, 2, 2.25];
          const idx = options.findIndex((value) => Math.abs(value - this.settings.dprCap) < 0.01);
          this.settings.dprCap = options[(idx + 1) % options.length];
          this.refreshMenu();
          this.qualityTuner?.updateFromSettings(this.settings);
        }
      },
      {
        label: () => `Auto Quality: ${this.settings.autoQuality ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.autoQuality = !this.settings.autoQuality;
          this.refreshMenu();
          this.qualityTuner?.updateFromSettings(this.settings);
        }
      },
      {
        label: () => `Opponent: ${this.settings.opponent === 'ai' ? 'Vs AI' : 'Local Hotseat'}`,
        onClick: () => {
          this.settings.opponent = this.settings.opponent === 'ai' ? 'local' : 'ai';
          this.refreshMenu();
        }
      },
      {
        label: () => `AI Personality: ${this.settings.aiPersonality}`,
        onClick: () => {
          const order: FreethrowAiPersonality[] = ['balanced', 'clutch', 'streaky', 'conservative'];
          const idx = order.indexOf(this.settings.aiPersonality);
          this.settings.aiPersonality = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Money Rack: ${this.settings.moneyRack ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.moneyRack = !this.settings.moneyRack;
          this.refreshMenu();
        }
      },
      {
        label: () => `Deep Range +1: ${this.settings.deepRange ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.deepRange = !this.settings.deepRange;
          this.refreshMenu();
        }
      },
      {
        label: () => `Contest Overtime: ${this.settings.overtime ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.overtime = !this.settings.overtime;
          this.refreshMenu();
        }
      },
      {
        label: () => `Simplified Controls: ${this.settings.simplifiedControls ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.simplifiedControls = !this.settings.simplifiedControls;
          this.refreshMenu();
        }
      },
      {
        label: () => `Colorblind Meter: ${this.settings.colorblindMeter ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.colorblindMeter = !this.settings.colorblindMeter;
          this.refreshMenu();
        }
      },
      {
        label: () => `Left-Handed HUD: ${this.settings.leftHandedHud ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.leftHandedHud = !this.settings.leftHandedHud;
          this.hud.setLeftHanded(this.settings.leftHandedHud);
          this.shotMeter.setLeftHanded(this.settings.leftHandedHud);
          this.handleResize();
          this.refreshMenu();
        }
      },
      {
        label: () => `Reduced Motion+: ${this.settings.reducedMotionPlus ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.reducedMotionPlus = !this.settings.reducedMotionPlus;
          this.refreshMenu();
        }
      }
    ];

    const panel = this.add.rectangle(640, 360, 760, 660, 0x0a1729, 0.95).setStrokeStyle(2, 0x355b84);
    const title = this.add.text(640, 128, 'Freethrow Frenzy', { color: '#f4f7ff', fontSize: '38px' }).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [panel, title];

    for (let i = 0; i < rows.length; i += 1) {
      const y = 176 + i * 30;
      const button = this.add
        .text(640, y, '', { color: '#dbefff', fontSize: '19px', backgroundColor: '#1f3e5f' })
        .setOrigin(0.5)
        .setPadding(10, 4, 10, 4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          rows[i].onClick();
          this.playCue('ui');
        });
      button.setData('labelFn', rows[i].label);
      children.push(button);
    }

    const start = this.add
      .text(640, 602, 'Start Match', { color: '#112131', fontSize: '30px', backgroundColor: '#8fdc92' })
      .setOrigin(0.5)
      .setPadding(14, 8, 14, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startMatch());

    const help = this.add
      .text(640, 638, 'Hold to charge, drag to aim, release on green. Swipe mode available in settings.', {
        color: '#9ec3ea',
        fontSize: '15px'
      })
      .setOrigin(0.5);

    children.push(start, help);

    this.menuContainer = this.add.container(0, 0, children);
  }

  private refreshMenu() {
    for (let i = 0; i < this.menuContainer.list.length; i += 1) {
      const item = this.menuContainer.list[i];
      if (!(item instanceof Phaser.GameObjects.Text)) continue;
      const labelFn = item.getData('labelFn') as (() => string) | undefined;
      if (!labelFn) continue;
      item.setText(labelFn());
    }
  }

  private buildPauseMenu() {
    const panel = this.add.rectangle(640, 360, 520, 420, 0x0a1627, 0.96).setStrokeStyle(2, 0x355980);
    const title = this.add.text(640, 220, 'Paused', { color: '#f4f7ff', fontSize: '32px' }).setOrigin(0.5);

    const makeButton = (y: number, label: string, onClick: () => void, primary = false) =>
      this.add
        .text(640, y, label, {
          color: primary ? '#102132' : '#dbefff',
          fontSize: primary ? '24px' : '20px',
          backgroundColor: primary ? '#8fdc92' : '#214261'
        })
        .setOrigin(0.5)
        .setPadding(12, 6, 12, 6)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.playCue('ui');
          onClick();
        });

    const resume = makeButton(290, 'Resume', () => this.togglePause(), true);
    const restart = makeButton(332, 'Restart', () => this.startMatch());
    const settings = makeButton(374, 'Settings', () => {
      this.pauseContainer.setVisible(false);
      this.settingsContainer.setVisible(true);
    });
    const howTo = makeButton(416, 'How to Play', () => this.showTutorialOverlay());
    const finish = makeButton(458, 'Finish Round', () => this.finishMatch());

    this.pauseContainer = this.add.container(0, 0, [panel, title, resume, restart, settings, howTo, finish]);
    this.pauseContainer.setVisible(false).setDepth(20);
  }

  private buildPauseSettings() {
    const panel = this.add.rectangle(640, 360, 640, 520, 0x0b1627, 0.95).setStrokeStyle(2, 0x355980);
    const title = this.add.text(640, 160, 'Settings', { color: '#f4f7ff', fontSize: '30px' }).setOrigin(0.5);

    const items: Phaser.GameObjects.GameObject[] = [panel, title];
    const rowTexts: Phaser.GameObjects.Text[] = [];
    const rows: MenuRow[] = [];

    const syncTexts = () => {
      rowTexts.forEach((row, idx) => row.setText(rows[idx].label()));
    };

    rows.push(
      {
        label: () => `Controls: ${this.settings.controls === 'arc_swipe' ? 'Arc Swipe' : 'Hold & Release'}`,
        onClick: () => {
          this.settings.controls = this.settings.controls === 'arc_swipe' ? 'hold_release' : 'arc_swipe';
          syncTexts();
        }
      },
      {
        label: () => `Aim Sensitivity: ${this.settings.sensitivity}`,
        onClick: () => {
          const order: FreethrowSensitivity[] = ['low', 'medium', 'high'];
          const idx = order.indexOf(this.settings.sensitivity);
          this.settings.sensitivity = order[(idx + 1) % order.length];
          syncTexts();
        }
      },
      {
        label: () => `Timing Meter: ${this.settings.timingMeter ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.timingMeter = !this.settings.timingMeter;
          syncTexts();
        }
      },
      {
        label: () => `Pressure: ${this.settings.pressure ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.pressure = !this.settings.pressure;
          syncTexts();
        }
      },
      {
        label: () => `Assist: ${this.settings.assist ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.assist = !this.settings.assist;
          syncTexts();
        }
      },
      {
        label: () => `SFX: ${this.settings.sfx ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.sfx = !this.settings.sfx;
          syncTexts();
        }
      },
      {
        label: () => `Haptics: ${this.settings.haptics ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.haptics = !this.settings.haptics;
          syncTexts();
        }
      },
      {
        label: () => `VFX: ${this.settings.effects}`,
        onClick: () => {
          const order: Array<typeof this.settings.effects> = ['high', 'low', 'off'];
          const idx = order.indexOf(this.settings.effects);
          this.settings.effects = order[(idx + 1) % order.length];
          this.qualityTuner?.updateFromSettings(this.settings);
          syncTexts();
        }
      },
      {
        label: () => `DPR Cap: ${this.settings.dprCap.toFixed(2)}`,
        onClick: () => {
          const options = [1.25, 1.5, 1.75, 2, 2.25];
          const idx = options.findIndex((value) => Math.abs(value - this.settings.dprCap) < 0.01);
          this.settings.dprCap = options[(idx + 1) % options.length];
          this.qualityTuner?.updateFromSettings(this.settings);
          syncTexts();
        }
      },
      {
        label: () => `Auto Quality: ${this.settings.autoQuality ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.autoQuality = !this.settings.autoQuality;
          this.qualityTuner?.updateFromSettings(this.settings);
          syncTexts();
        }
      },
      {
        label: () => `Left-Handed HUD: ${this.settings.leftHandedHud ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.leftHandedHud = !this.settings.leftHandedHud;
          this.hud.setLeftHanded(this.settings.leftHandedHud);
          this.shotMeter.setLeftHanded(this.settings.leftHandedHud);
          this.handleResize();
          syncTexts();
        }
      },
      {
        label: () => `Reduced Motion+: ${this.settings.reducedMotionPlus ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.reducedMotionPlus = !this.settings.reducedMotionPlus;
          syncTexts();
        }
      }
    );

    if (import.meta.env.DEV) {
      rows.push({
        label: () => `Perf HUD: ${this.settings.showPerfHud ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.showPerfHud = !this.settings.showPerfHud;
          syncTexts();
        }
      });
    }

    for (let i = 0; i < rows.length; i += 1) {
      const y = 210 + i * 28;
      const row = this.add
        .text(640, y, '', { color: '#dbefff', fontSize: '18px', backgroundColor: '#1f3e5f' })
        .setOrigin(0.5)
        .setPadding(10, 4, 10, 4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          rows[i].onClick();
          this.playCue('ui');
        });
      rowTexts.push(row);
      items.push(row);
    }

    const back = this.add
      .text(640, 520, 'Back', { color: '#102132', fontSize: '22px', backgroundColor: '#8fdc92' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.settingsContainer.setVisible(false);
        this.pauseContainer.setVisible(true);
        saveSettings(this.settings);
      });

    items.push(back);
    syncTexts();

    this.settingsContainer = this.add.container(0, 0, items);
    this.settingsContainer.setVisible(false).setDepth(21);
  }

  private buildEndScreen() {
    const panel = this.add.rectangle(640, 360, 560, 380, 0x08121f, 0.95).setStrokeStyle(2, 0x365980);
    const title = this.add.text(640, 220, 'Match Complete', { color: '#f4f7ff', fontSize: '34px' }).setOrigin(0.5);
    this.endSummaryText = this.add.text(640, 305, '', { color: '#dcecff', fontSize: '22px', align: 'center' }).setOrigin(0.5);

    const rematch = this.add
      .text(640, 422, 'Try Again', { color: '#112131', fontSize: '24px', backgroundColor: '#8fdc92' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startMatch());

    const share = this.add
      .text(640, 466, 'Share', { color: '#dcecff', fontSize: '20px', backgroundColor: '#214261' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.shareResult());

    const settings = this.add
      .text(640, 510, 'Change Settings', { color: '#dcecff', fontSize: '20px', backgroundColor: '#214261' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.endContainer.setVisible(false);
        this.menuContainer.setVisible(true);
        this.ended = false;
      });

    const back = this.add
      .text(640, 552, 'Back to Lobby', { color: '#dcecff', fontSize: '20px', backgroundColor: '#214261' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.endContainer = this.add.container(0, 0, [panel, title, this.endSummaryText, rematch, share, settings, back]);
    this.endContainer.setVisible(false).setDepth(22);
  }

  private buildTutorial() {
    this.tutorialSeen = window.localStorage.getItem(TUTORIAL_KEY) === '1';
    const panel = this.add.rectangle(0, 0, 600, 320, 0x0b1828, 0.96).setStrokeStyle(2, 0x355980).setOrigin(0.5);
    const title = this.add.text(0, -120, 'How to Play', { color: '#f4f7ff', fontSize: '28px' }).setOrigin(0.5);
    const body = this.add.text(
      0,
      -40,
      'Hold to charge.\nDrag left/right to aim.\nRelease on green for a clean swish.\nStreaks build Heat for bigger points.',
      { color: '#cfe6ff', fontSize: '18px', align: 'center' }
    ).setOrigin(0.5);
    const ok = this.add
      .text(0, 110, 'Got it', { color: '#102132', fontSize: '22px', backgroundColor: '#8fdc92' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.tutorialContainer.setVisible(false);
        if (this.tutorialReturnToPause) {
          this.pauseContainer.setVisible(true);
          this.localPaused = true;
        } else {
          this.localPaused = false;
        }
        this.tutorialSeen = true;
        window.localStorage.setItem(TUTORIAL_KEY, '1');
        if (this.countdownStartMs <= 0 && !this.tutorialReturnToPause) this.startCountdown();
        this.tutorialReturnToPause = false;
      });

    this.tutorialContainer = this.add.container(0, 0, [panel, title, body, ok]);
    this.tutorialContainer.setVisible(false).setDepth(25);
  }

  private updateTrail(dt: number) {
    if (this.settings.reducedMotionPlus || this.getEffectsLevel() === 'off') {
      for (let i = 0; i < this.trailPool.length; i += 1) {
        this.trailPool[i].life = 0;
        this.trailPool[i].dot.setVisible(false);
      }
      return;
    }
    for (let i = 0; i < this.trailPool.length; i += 1) {
      const particle = this.trailPool[i];
      if (particle.life <= 0) continue;
      particle.life -= dt;
      const alpha = clamp(particle.life / 0.18, 0, 1);
      particle.dot.setAlpha(alpha);
      if (particle.life <= 0) {
        particle.dot.setVisible(false);
      }
    }
  }

  private spawnTrail(x: number, y: number) {
    if (this.settings.reducedMotionPlus || this.getEffectsLevel() === 'off') return;
    const limit = this.getEffectsLevel() === 'low' ? 4 : this.trailPool.length;
    for (let i = 0; i < this.trailPool.length; i += 1) {
      if (i >= limit) return;
      const particle = this.trailPool[i];
      if (particle.life > 0) continue;
      particle.life = 0.18;
      particle.dot.setPosition(x, y).setVisible(true).setAlpha(0.5);
      return;
    }
  }

  private refreshHud() {
    const score = this.modeState.kind === 'timed_60' || this.modeState.kind === 'three_point_contest' ? this.modeState.score : this.modeState.makes[0];
    const accuracy = computeAccuracy(this.playerAttempts, this.playerMakes);
    let timerLabel = '';
    let comboLabel = '';
    let modeLabel = '';
    let spotLabel = '';

    if (this.modeState.kind === 'timed_60') {
      timerLabel = formatTimer(this.modeState.timeRemainingMs);
      comboLabel = `Streak x${this.modeState.multiplier}`;
      modeLabel = 'Timed 60s';
      spotLabel = SHOT_SPOTS[this.getCurrentHumanSpot()].label;
    } else if (this.modeState.kind === 'three_point_contest') {
      const spot = getThreePointSpot(this.modeState);
      const ballValue = getThreePointBallValue(this.modeState);
      const shotNum = this.modeState.totalBallsShot + 1;
      timerLabel = `Ball ${Math.min(shotNum, 25)}/25`;
      comboLabel = `Rack x${ballValue}`;
      modeLabel = '3PT Contest';
      spotLabel = SHOT_SPOTS[spot].label;
    } else {
      const rightLabel = this.settings.opponent === 'ai' ? 'AI' : 'P2';
      const p1 = horseLettersForPlayer(this.modeState, 0) || '-';
      const p2 = horseLettersForPlayer(this.modeState, 1) || '-';
      timerLabel = `P1 ${p1} | ${rightLabel} ${p2}`;
      comboLabel = this.modeState.challengeSpot ? `Challenge ${SHOT_SPOTS[this.modeState.challengeSpot].label}` : 'Pick a spot';
      modeLabel = 'HORSE';
      spotLabel = this.modeState.phase === 'set_challenge' ? 'Set challenge' : 'Answer challenge';
    }

    const ghost = this.progression.bestScoreByMode[this.settings.mode] ?? 0;
    const delta = score - ghost;

    this.hud.update({
      score,
      timerLabel,
      comboLabel,
      modeLabel: `${modeLabel} • ${this.weeklyEvent.label}`,
      spotLabel,
      accuracyLabel: `Accuracy ${(accuracy * 100).toFixed(1)}%`,
      pressure: this.computePressureLevel(),
      heatLevel: this.heatLevel,
      ghostLabel: `Ghost ${ghost} (${delta >= 0 ? '+' : ''}${delta})`,
      challengeLabel: this.activeChallengeText,
      paused: this.localPaused
    });
  }

  private playCue(cue: 'ui' | 'bounce' | 'swish' | 'rim' | 'backboard' | 'net' | 'buzzer' | 'countdown' | 'spawn' | 'miss') {
    playFreethrowSfx(cue, {
      gameId: this.hooks.gameId,
      enabled: this.settings.sfx,
      heatLevel: this.heatLevel,
      limiter: this.sfxLimiter
    });
  }

  private nextRandom(): number {
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) % 4294967296;
    return this.rngSeed / 4294967296;
  }
}
