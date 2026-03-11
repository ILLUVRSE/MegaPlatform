import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { triggerHaptic } from '../../systems/gameplayComfort';
import { createGoalieDivePlan, canGoalieSave } from './goalieAI';
import { createSwipeCapture, createTapTargetCapture } from './input';
import { applyShotToMatch, computeAccuracy, createInitialMatchState } from './rules';
import { mapInputToShotPlan, resolveShotResult } from './shotModel';
import {
  type GoalRect,
  type MatchState,
  type PenaltyControls,
  type PenaltyDifficulty,
  type PenaltyMode,
  type PenaltySensitivity,
  type PenaltySetup,
  type ShotInput,
  type ShotResolution
} from './types';

interface PenaltySceneConfig {
  hooks: GameRuntimeHooks;
}

interface StoredSettings {
  mode: PenaltyMode;
  difficulty: PenaltyDifficulty;
  controls: PenaltyControls;
  spinEnabled: boolean;
  assistEnabled: boolean;
  sensitivity: PenaltySensitivity;
  tapSpin: number;
}

interface BallFlightState {
  active: boolean;
  elapsed: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  peakY: number;
  curve: number;
  resolution: ShotResolution | null;
}

interface KeeperState {
  centerX: number;
  x: number;
  targetX: number;
  reactionDelayMs: number;
  diveDurationMs: number;
  reachPx: number;
  elapsedMs: number;
  diving: boolean;
}

interface TrailParticle {
  dot: Phaser.GameObjects.Arc;
  life: number;
}

const SETTINGS_KEY = 'gamegrid.penalty-kick-showdown.settings.v1';

const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'classic_5',
  difficulty: 'medium',
  controls: 'swipe',
  spinEnabled: false,
  assistEnabled: true,
  sensitivity: 'medium',
  tapSpin: 0
};

const GOAL: GoalRect = {
  left: 360,
  right: 920,
  top: 132,
  bottom: 330,
  crossbarY: 132
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cycleMode(mode: PenaltyMode): PenaltyMode {
  if (mode === 'classic_5') return 'sudden_death';
  if (mode === 'sudden_death') return 'pressure_ladder';
  if (mode === 'pressure_ladder') return 'classic_5';
  return 'classic_5';
}

function cycleDifficulty(value: PenaltyDifficulty): PenaltyDifficulty {
  if (value === 'easy') return 'medium';
  if (value === 'medium') return 'hard';
  return 'easy';
}

function cycleControls(value: PenaltyControls): PenaltyControls {
  return value === 'swipe' ? 'tap_target' : 'swipe';
}

function cycleSensitivity(value: PenaltySensitivity): PenaltySensitivity {
  if (value === 'low') return 'medium';
  if (value === 'medium') return 'high';
  return 'low';
}

function prettyMode(mode: PenaltyMode): string {
  if (mode === 'classic_5') return 'Classic 5';
  if (mode === 'sudden_death') return 'Sudden Death';
  if (mode === 'pressure_ladder') return 'Pressure Ladder';
  return 'Practice';
}

function prettyDifficulty(value: PenaltyDifficulty): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function prettyControls(value: PenaltyControls): string {
  return value === 'swipe' ? 'Swipe Shot' : 'Tap Target';
}

function loadSettings(): StoredSettings {
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

function saveSettings(settings: StoredSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage write failures.
  }
}


export class PenaltyKickShowdownScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private settings: StoredSettings = loadSettings();

  private matchState: MatchState = createInitialMatchState({
    mode: this.settings.mode,
    difficulty: this.settings.difficulty,
    controls: this.settings.controls,
    options: {
      spinEnabled: this.settings.spinEnabled,
      assistEnabled: this.settings.assistEnabled,
      sensitivity: this.settings.sensitivity
    }
  });

  private menuContainer!: Phaser.GameObjects.Container;
  private endContainer!: Phaser.GameObjects.Container;
  private endSummaryText!: Phaser.GameObjects.Text;

  private hudTop!: Phaser.GameObjects.Text;
  private hudInfo!: Phaser.GameObjects.Text;
  private hudInput!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private spinSliderText!: Phaser.GameObjects.Text;

  private fieldGraphics!: Phaser.GameObjects.Graphics;
  private keeperHitbox!: Phaser.GameObjects.Rectangle;
  private reticle!: Phaser.GameObjects.Arc;

  private ball!: Phaser.GameObjects.Arc;
  private ballShadow!: Phaser.GameObjects.Ellipse;
  private keeperBody!: Phaser.GameObjects.Rectangle;
  private keeperArms!: Phaser.GameObjects.Rectangle;

  private tapPowerMeterBg!: Phaser.GameObjects.Rectangle;
  private tapPowerMeterFill!: Phaser.GameObjects.Rectangle;
  private shootButton!: Phaser.GameObjects.Text;

  private modeButton!: Phaser.GameObjects.Text;
  private difficultyButton!: Phaser.GameObjects.Text;
  private controlsButton!: Phaser.GameObjects.Text;
  private spinButton!: Phaser.GameObjects.Text;
  private assistButton!: Phaser.GameObjects.Text;
  private sensitivityButton!: Phaser.GameObjects.Text;

  private localPaused = false;
  private ended = false;
  private matchStartedMs = 0;

  private ballState: BallFlightState = {
    active: false,
    elapsed: 0,
    duration: 0,
    startX: 640,
    startY: 598,
    endX: 640,
    endY: 260,
    peakY: 300,
    curve: 0,
    resolution: null
  };

  private keeperState: KeeperState = {
    centerX: (GOAL.left + GOAL.right) * 0.5,
    x: (GOAL.left + GOAL.right) * 0.5,
    targetX: (GOAL.left + GOAL.right) * 0.5,
    reactionDelayMs: 200,
    diveDurationMs: 320,
    reachPx: 100,
    elapsedMs: 0,
    diving: false
  };

  private swipeCapture = createSwipeCapture();
  private tapCapture = createTapTargetCapture();

  private rngSeed = 0.812341;

  private trailPool: TrailParticle[] = [];
  private trailIndex = 0;

  constructor(config: PenaltySceneConfig) {
    super('penalty-kick-showdown-main');
    this.hooks = config.hooks;
  }

  create() {
    this.buildPitch();
    this.buildGameObjects();
    this.buildHud();
    this.buildMenu();
    this.buildEndScreen();
    this.buildTrailPool();
    this.refreshMenuLabels();
    this.refreshHud();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.menuContainer.visible || this.endContainer.visible || this.ended || this.localPaused) return;
      if (this.ballState.active) return;

      if (this.settings.controls === 'swipe') {
        const distance = Math.hypot(pointer.x - this.ballState.startX, pointer.y - this.ballState.startY);
        if (distance <= 84) {
          this.swipeCapture.pointerDown(pointer.id, pointer.x, pointer.y);
        }
        return;
      }

      if (pointer.y >= GOAL.top && pointer.y <= GOAL.bottom && pointer.x >= GOAL.left && pointer.x <= GOAL.right) {
        this.tapCapture.setTargetFromGoalPoint(pointer.x, pointer.y, GOAL);
        const target = this.tapCapture.getTarget();
        this.reticle.setVisible(true);
        this.reticle.setPosition(
          GOAL.left + target.x * (GOAL.right - GOAL.left),
          GOAL.bottom - target.y * (GOAL.bottom - GOAL.top)
        );
      }

      if (pointer.y >= 662 && pointer.y <= 698 && pointer.x >= 468 && pointer.x <= 812) {
        this.tapCapture.setPowerFromMeter(pointer.x, 470, 340);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.settings.controls !== 'swipe') return;
      this.swipeCapture.pointerMove(pointer.id, pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.menuContainer.visible || this.endContainer.visible || this.ended || this.localPaused) return;
      if (this.ballState.active) return;
      if (this.settings.controls !== 'swipe') return;

      const shot = this.swipeCapture.pointerUp(
        pointer.id,
        pointer.x,
        pointer.y,
        this.computePressure(),
        this.settings.sensitivity
      );
      if (!shot) return;
      this.takeShot(shot);
    });
  }

  update(_time: number, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.updateTrail(dt);

    if (this.menuContainer.visible || this.endContainer.visible || this.localPaused) {
      this.refreshHud();
      this.refreshTapControls();
      return;
    }

    if (this.ballState.active) {
      this.stepBall(dt);
      this.stepKeeper(dt * 1000);
    }

    this.refreshHud();
    this.refreshTapControls();
  }

  private buildPitch() {
    this.fieldGraphics = this.add.graphics();

    this.fieldGraphics.fillStyle(0x0b2f14, 1);
    this.fieldGraphics.fillRect(0, 0, 1280, 720);

    this.fieldGraphics.fillStyle(0x124a21, 1);
    this.fieldGraphics.fillRect(0, 430, 1280, 290);

    this.fieldGraphics.lineStyle(4, 0x89d08f, 0.75);
    this.fieldGraphics.strokeCircle(640, 520, 132);

    this.fieldGraphics.fillStyle(0x1f6c30, 1);
    this.fieldGraphics.fillRect(GOAL.left - 24, GOAL.top - 12, GOAL.right - GOAL.left + 48, GOAL.bottom - GOAL.top + 24);

    this.fieldGraphics.lineStyle(8, 0xffffff, 1);
    this.fieldGraphics.strokeRect(GOAL.left, GOAL.top, GOAL.right - GOAL.left, GOAL.bottom - GOAL.top);

    this.fieldGraphics.lineStyle(2, 0xffffff, 0.3);
    const third = (GOAL.right - GOAL.left) / 3;
    const row = (GOAL.bottom - GOAL.top) / 3;
    this.fieldGraphics.lineBetween(GOAL.left + third, GOAL.top, GOAL.left + third, GOAL.bottom);
    this.fieldGraphics.lineBetween(GOAL.left + third * 2, GOAL.top, GOAL.left + third * 2, GOAL.bottom);
    this.fieldGraphics.lineBetween(GOAL.left, GOAL.top + row, GOAL.right, GOAL.top + row);
    this.fieldGraphics.lineBetween(GOAL.left, GOAL.top + row * 2, GOAL.right, GOAL.top + row * 2);

    this.fieldGraphics.fillStyle(0x0f3b1a, 1);
    this.fieldGraphics.fillRect(0, 610, 1280, 110);

    this.add.text(28, 683, 'ESC pause (portal) | Tap Pause for local tactical pause', {
      fontSize: '16px',
      color: '#cbe7ce'
    });
  }

  private buildGameObjects() {
    this.ballShadow = this.add.ellipse(this.ballState.startX + 10, 622, 40, 14, 0x091f0d, 0.52);
    this.ball = this.add.circle(this.ballState.startX, this.ballState.startY, 15, 0xffffff, 1);

    this.keeperBody = this.add.rectangle(this.keeperState.centerX, 260, 110, 28, 0x376ed2, 1);
    this.keeperArms = this.add.rectangle(this.keeperState.centerX, 258, 164, 16, 0x87b2ff, 1);
    this.keeperHitbox = this.add.rectangle(this.keeperState.centerX, 258, 180, 44, 0x84c6ff, 0.14);
    this.keeperHitbox.setStrokeStyle(2, 0xa1d5ff, 0.55);

    this.reticle = this.add.circle(640, 220, 14, 0xffde7a, 0.1).setStrokeStyle(2, 0xffde7a, 0.9).setVisible(false);
  }

  private buildTrailPool() {
    for (let i = 0; i < 18; i += 1) {
      const dot = this.add.circle(-50, -50, 3, 0xe6f4ff, 0).setVisible(false);
      this.trailPool.push({ dot, life: 0 });
    }
  }

  private spawnTrail(x: number, y: number) {
    const particle = this.trailPool[this.trailIndex];
    this.trailIndex = (this.trailIndex + 1) % this.trailPool.length;
    particle.life = 0.24;
    particle.dot.setVisible(true);
    particle.dot.setPosition(x, y);
    particle.dot.setScale(1);
    particle.dot.setFillStyle(0xe6f4ff, 0.65);
  }

  private updateTrail(dt: number) {
    for (let i = 0; i < this.trailPool.length; i += 1) {
      const particle = this.trailPool[i];
      if (particle.life <= 0) continue;
      particle.life = Math.max(0, particle.life - dt);
      if (particle.life <= 0) {
        particle.dot.setVisible(false);
        continue;
      }
      const alpha = particle.life / 0.24;
      particle.dot.setFillStyle(0xe6f4ff, alpha * 0.6);
      particle.dot.setScale(0.4 + alpha * 0.8);
    }
  }

  private buildHud() {
    this.hudTop = this.add.text(20, 14, '', { fontSize: '28px', color: '#f2fff4' });
    this.hudInfo = this.add.text(20, 50, '', { fontSize: '20px', color: '#cce8d2' });
    this.hudInput = this.add.text(20, 80, '', { fontSize: '18px', color: '#f7dc8f' });

    this.pauseButton = this.add
      .text(1160, 16, 'Pause', {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#1f3a78',
        padding: { x: 12, y: 6 }
      })
      .setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerup', () => {
      this.localPaused = !this.localPaused;
      this.pauseButton.setText(this.localPaused ? 'Resume' : 'Pause');
      this.playCue('ui');
    });

    this.tapPowerMeterBg = this.add.rectangle(640, 680, 340, 14, 0x102c17, 0.95).setVisible(false);
    this.tapPowerMeterFill = this.add.rectangle(470, 680, 1, 14, 0xffbf59, 1).setOrigin(0, 0.5).setVisible(false);

    this.spinSliderText = this.add
      .text(884, 664, 'Spin: 0%', {
        fontSize: '18px',
        color: '#ecfbff',
        backgroundColor: '#123048',
        padding: { x: 8, y: 4 }
      })
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.spinSliderText.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.settings.spinEnabled || this.settings.controls !== 'tap_target' || this.menuContainer.visible || this.endContainer.visible) {
        return;
      }
      const localX = clamp(pointer.x - this.spinSliderText.x, 0, 160);
      const ratio = clamp(localX / 160, 0, 1);
      const spin = ratio * 2 - 1;
      this.settings.tapSpin = spin;
      this.tapCapture.setSpin(spin);
      this.playCue('ui');
    });

    this.shootButton = this.add
      .text(1080, 660, 'Shoot', {
        fontSize: '28px',
        color: '#101810',
        backgroundColor: '#ffd96c',
        padding: { x: 16, y: 8 }
      })
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.shootButton.on('pointerup', () => {
      if (this.settings.controls !== 'tap_target') return;
      if (this.menuContainer.visible || this.endContainer.visible || this.localPaused || this.ended || this.ballState.active) return;
      const shot = this.tapCapture.buildShot(this.computePressure());
      this.takeShot(shot);
    });
  }

  private buildMenu() {
    const panel = this.add.rectangle(640, 360, 700, 510, 0x0b1d13, 0.92);
    panel.setStrokeStyle(3, 0x89d08f, 0.7);

    const title = this.add.text(640, 132, 'Penalty Kick Showdown', {
      fontSize: '44px',
      color: '#f4ffe8'
    });
    title.setOrigin(0.5, 0.5);

    this.modeButton = this.buildMenuButton(640, 210, () => {
      this.settings.mode = cycleMode(this.settings.mode);
      this.playCue('ui');
      this.refreshMenuLabels();
    });

    this.difficultyButton = this.buildMenuButton(640, 258, () => {
      this.settings.difficulty = cycleDifficulty(this.settings.difficulty);
      this.playCue('ui');
      this.refreshMenuLabels();
    });

    this.controlsButton = this.buildMenuButton(640, 306, () => {
      this.settings.controls = cycleControls(this.settings.controls);
      this.playCue('ui');
      this.refreshMenuLabels();
    });

    this.spinButton = this.buildMenuButton(640, 354, () => {
      this.settings.spinEnabled = !this.settings.spinEnabled;
      this.playCue('ui');
      this.refreshMenuLabels();
    });

    this.assistButton = this.buildMenuButton(640, 402, () => {
      this.settings.assistEnabled = !this.settings.assistEnabled;
      this.playCue('ui');
      this.refreshMenuLabels();
    });

    this.sensitivityButton = this.buildMenuButton(640, 450, () => {
      this.settings.sensitivity = cycleSensitivity(this.settings.sensitivity);
      this.playCue('ui');
      this.refreshMenuLabels();
    });

    const start = this.add
      .text(640, 520, 'Start Match', {
        fontSize: '30px',
        color: '#10210f',
        backgroundColor: '#a4eb8b',
        padding: { x: 18, y: 10 }
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    start.on('pointerup', () => {
      this.startMatch(this.settings.mode);
    });

    const practice = this.add
      .text(640, 568, 'Practice Mode', {
        fontSize: '24px',
        color: '#ffecc2',
        backgroundColor: '#27472a',
        padding: { x: 16, y: 8 }
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    practice.on('pointerup', () => {
      this.startMatch('practice');
    });

    this.menuContainer = this.add.container(0, 0, [
      panel,
      title,
      this.modeButton,
      this.difficultyButton,
      this.controlsButton,
      this.spinButton,
      this.assistButton,
      this.sensitivityButton,
      start,
      practice
    ]);
  }

  private buildMenuButton(x: number, y: number, onClick: () => void): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, '', {
        fontSize: '24px',
        color: '#edf8f0',
        backgroundColor: '#204b2a',
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerup', onClick);
    return btn;
  }

  private buildEndScreen() {
    const panel = this.add.rectangle(640, 360, 620, 360, 0x0a1a12, 0.94);
    panel.setStrokeStyle(3, 0xb6efae, 0.7);

    const title = this.add.text(640, 236, 'Match Complete', {
      fontSize: '40px',
      color: '#f4ffe8'
    });
    title.setOrigin(0.5, 0.5);

    this.endSummaryText = this.add.text(640, 340, '', {
      fontSize: '22px',
      color: '#d9f0dc',
      align: 'center'
    });
    this.endSummaryText.setOrigin(0.5, 0.5);

    const rematch = this.add
      .text(640, 468, 'Rematch', {
        fontSize: '28px',
        color: '#0f2010',
        backgroundColor: '#b9ef96',
        padding: { x: 18, y: 8 }
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    rematch.on('pointerup', () => {
      this.playCue('ui');
      this.startMatch(this.matchState.mode);
    });

    const settings = this.add
      .text(640, 516, 'Change Settings', {
        fontSize: '22px',
        color: '#ecf8ef',
        backgroundColor: '#244229',
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    settings.on('pointerup', () => {
      this.playCue('ui');
      this.endContainer.setVisible(false);
      this.menuContainer.setVisible(true);
      this.ended = false;
      this.refreshMenuLabels();
    });

    const back = this.add
      .text(640, 562, 'Back To Lobby', {
        fontSize: '20px',
        color: '#ecf8ef',
        backgroundColor: '#3b2a24',
        padding: { x: 14, y: 8 }
      })
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });

    back.on('pointerup', () => {
      this.playCue('ui');
      this.hooks.backToLobby();
    });

    this.endContainer = this.add.container(0, 0, [panel, title, this.endSummaryText, rematch, settings, back]);
    this.endContainer.setVisible(false);
  }

  private refreshMenuLabels() {
    this.modeButton.setText(`Mode: ${prettyMode(this.settings.mode)}`);
    this.difficultyButton.setText(`Difficulty: ${prettyDifficulty(this.settings.difficulty)}`);
    this.controlsButton.setText(`Controls: ${prettyControls(this.settings.controls)}`);
    this.spinButton.setText(`Spin: ${this.settings.spinEnabled ? 'On' : 'Off'}`);
    this.assistButton.setText(`Assist: ${this.settings.assistEnabled ? 'On' : 'Off'}`);
    this.sensitivityButton.setText(`Sensitivity: ${this.settings.sensitivity}`);
  }

  private refreshTapControls() {
    const tapMode = this.settings.controls === 'tap_target' && !this.menuContainer.visible && !this.endContainer.visible;
    this.tapPowerMeterBg.setVisible(tapMode);
    this.tapPowerMeterFill.setVisible(tapMode);
    this.shootButton.setVisible(tapMode);
    this.spinSliderText.setVisible(tapMode && this.settings.spinEnabled);

    if (tapMode) {
      const power = this.tapCapture.getPower();
      this.tapPowerMeterFill.width = 340 * power;
      this.spinSliderText.setText(`Spin: ${Math.round(this.tapCapture.getSpin() * 100)}%`);
    }
  }

  private startMatch(mode: PenaltyMode) {
    try {
      this.settings.mode = mode === 'practice' ? this.settings.mode : mode;
      saveSettings(this.settings);

      const setup: PenaltySetup = {
        mode,
        difficulty: this.settings.difficulty,
        controls: this.settings.controls,
        options: {
          spinEnabled: this.settings.spinEnabled,
          assistEnabled: this.settings.assistEnabled,
          sensitivity: this.settings.sensitivity
        }
      };

      this.matchState = createInitialMatchState(setup);
      this.matchStartedMs = performance.now();
      this.ended = false;
      this.localPaused = false;
      this.pauseButton.setText('Pause');

      this.ballState.active = false;
      this.ballState.elapsed = 0;
      this.ballState.resolution = null;
      this.ball.setVisible(true).setPosition(this.ballState.startX, this.ballState.startY).setScale(1);
      this.ballShadow.setVisible(true).setPosition(this.ballState.startX + 10, 622);

      this.keeperState.x = this.keeperState.centerX;
      this.keeperState.targetX = this.keeperState.centerX;
      this.keeperState.elapsedMs = 0;
      this.keeperState.diving = false;
      this.syncKeeperVisuals();

      this.tapCapture.setSpin(this.settings.tapSpin);
      this.reticle.setVisible(this.settings.controls === 'tap_target');

      this.menuContainer.setVisible(false);
      this.endContainer.setVisible(false);

      this.playCue('whistle');

      this.hooks.reportEvent({
        type: 'game_start',
        gameId: this.hooks.gameId,
        mode,
        difficulty: this.matchState.effectiveDifficulty,
        controls: this.settings.controls,
        options: {
          spin: this.settings.spinEnabled,
          assist: this.settings.assistEnabled,
          sensitivity: this.settings.sensitivity
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start Penalty Kick Showdown';
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private computePressure(): number {
    if (this.matchState.mode === 'practice') return 0;

    const shotProgress =
      this.matchState.mode === 'classic_5'
        ? this.matchState.shotsTaken / 5
        : this.matchState.mode === 'pressure_ladder'
          ? this.matchState.shotsTaken / 10
          : clamp(this.matchState.streak / 8, 0, 1);

    const difficultyBase =
      this.matchState.effectiveDifficulty === 'hard' ? 0.35 : this.matchState.effectiveDifficulty === 'medium' ? 0.22 : 0.12;

    return clamp(difficultyBase + shotProgress * 0.45, 0, 1);
  }

  private takeShot(input: ShotInput) {
    try {
      const randomA = this.nextRandom();
      const randomB = this.nextRandom();
      const plan = mapInputToShotPlan(
        input,
        {
          goal: GOAL,
          difficulty: this.matchState.effectiveDifficulty,
          assistEnabled: this.settings.assistEnabled,
          sensitivity: this.settings.sensitivity,
          spinEnabled: this.settings.spinEnabled
        },
        randomA,
        randomB
      );

      const divePlan = createGoalieDivePlan(
        {
          difficulty: this.matchState.effectiveDifficulty,
          readAimX: plan.aimX,
          readAimY: plan.aimY,
          shotPower: plan.power,
          reactionJitter: input.pressure,
          randomness: this.nextRandom()
        },
        GOAL
      );

      const shotDuration = clamp(0.6 + (1 - plan.power) * 0.35, 0.52, 0.96);
      const interceptMs = shotDuration * 1000 * 0.82;

      const keeperXAtIntercept =
        interceptMs <= divePlan.reactionDelayMs
          ? this.keeperState.centerX
          : this.keeperState.centerX +
            (divePlan.targetX - this.keeperState.centerX) *
              clamp((interceptMs - divePlan.reactionDelayMs) / divePlan.diveDurationMs, 0, 1);

      const keeperSaved = canGoalieSave({
        shotX: plan.finalX,
        shotY: plan.finalY,
        goal: GOAL,
        plan: divePlan,
        keeperXAtIntercept
      });

      const resolution = resolveShotResult(plan, GOAL, keeperSaved);

      this.ballState.active = true;
      this.ballState.elapsed = 0;
      this.ballState.duration = shotDuration;
      this.ballState.endX = resolution.finalX;
      this.ballState.endY = resolution.finalY;
      this.ballState.curve = plan.curve;
      this.ballState.peakY = Math.min(this.ballState.startY - 160 - plan.power * 160, this.ballState.endY - 20);
      this.ballState.resolution = resolution;

      this.keeperState.targetX = divePlan.targetX;
      this.keeperState.reactionDelayMs = divePlan.reactionDelayMs;
      this.keeperState.diveDurationMs = divePlan.diveDurationMs;
      this.keeperState.reachPx = divePlan.reachPx;
      this.keeperState.elapsedMs = 0;
      this.keeperState.diving = true;
      this.keeperHitbox.width = divePlan.reachPx * 2;

      this.playCue('kick');
      triggerHaptic(8);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Shot simulation failure';
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private stepBall(dt: number) {
    if (!this.ballState.active) return;

    this.ballState.elapsed += dt;
    const t = clamp(this.ballState.elapsed / this.ballState.duration, 0, 1);
    const inv = 1 - t;

    const xBase = this.ballState.startX + (this.ballState.endX - this.ballState.startX) * t;
    const curve = this.ballState.curve * t * inv;
    const x = xBase + curve;

    const y =
      inv * inv * this.ballState.startY +
      2 * inv * t * this.ballState.peakY +
      t * t * this.ballState.endY;

    this.ball.setPosition(x, y);
    this.ball.setScale(1 - t * 0.45);
    this.ballShadow.setPosition(x + 8, 622 - t * 10).setScale(1 - t * 0.25, 1 - t * 0.35);
    this.spawnTrail(x, y);

    if (t >= 1) {
      this.finishShot();
    }
  }

  private stepKeeper(deltaMs: number) {
    if (!this.keeperState.diving) return;

    this.keeperState.elapsedMs += deltaMs;
    if (this.keeperState.elapsedMs <= this.keeperState.reactionDelayMs) {
      this.keeperState.x = this.keeperState.centerX;
      this.syncKeeperVisuals();
      return;
    }

    const progress = clamp(
      (this.keeperState.elapsedMs - this.keeperState.reactionDelayMs) / this.keeperState.diveDurationMs,
      0,
      1
    );

    const eased = 1 - (1 - progress) * (1 - progress);
    this.keeperState.x = this.keeperState.centerX + (this.keeperState.targetX - this.keeperState.centerX) * eased;
    this.syncKeeperVisuals();

    if (progress >= 1) {
      this.keeperState.diving = false;
    }
  }

  private syncKeeperVisuals() {
    this.keeperBody.setX(this.keeperState.x);
    this.keeperArms.setX(this.keeperState.x);
    this.keeperHitbox.setX(this.keeperState.x);
  }

  private finishShot() {
    const resolution = this.ballState.resolution;
    this.ballState.active = false;

    if (!resolution) return;

    if (resolution.result === 'goal') {
      this.playCue('net');
      triggerHaptic([10, 16, 18]);
    } else if (resolution.result === 'saved') {
      this.playCue('save');
      triggerHaptic(10);
    } else if (resolution.result === 'post') {
      this.playCue('post');
    } else {
      this.playCue('whistle');
    }

    this.matchState = applyShotToMatch(this.matchState, resolution);

    if (this.matchState.ended) {
      this.finishMatch();
    }
  }

  private finishMatch() {
    if (this.ended) return;
    this.ended = true;

    const accuracy = computeAccuracy(this.matchState);
    const durationMs = Math.max(0, performance.now() - this.matchStartedMs);

    this.endSummaryText.setText(
      [
        `Mode: ${prettyMode(this.matchState.mode)}`,
        `Score: ${this.matchState.score}`,
        `Goals: ${this.matchState.stats.goals}/${this.matchState.stats.totalShots}`,
        `Best Streak: ${this.matchState.bestStreak}`,
        `Accuracy: ${(accuracy * 100).toFixed(1)}%`,
        `Saved Against: ${this.matchState.stats.savesAgainst}`,
        `Misses (Wide/High/Post): ${this.matchState.stats.missesWide}/${this.matchState.stats.missesHigh}/${this.matchState.stats.postHits}`
      ].join('\n')
    );

    this.endContainer.setVisible(true);

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.matchState.mode,
      score: this.matchState.score,
      stats: {
        ...this.matchState.stats,
        accuracy
      },
      durationMs
    });
  }

  private refreshHud() {
    const modeLabel = prettyMode(this.matchState.mode);

    if (this.menuContainer.visible) {
      this.hudTop.setText('Set match options and start');
      this.hudInfo.setText('Swipe or tap controls available. Spin and assist are optional.');
      this.hudInput.setText('');
      return;
    }

    const roundLabel = this.matchState.mode === 'practice' ? `Shots: ${this.matchState.shotsTaken}` : `Round: ${this.matchState.round}`;
    const remainingLabel = Number.isFinite(this.matchState.shotsRemaining)
      ? ` | Remaining: ${this.matchState.shotsRemaining}`
      : '';

    this.hudTop.setText(`${modeLabel} | Score: ${this.matchState.score} | Streak: ${this.matchState.streak}`);
    this.hudInfo.setText(
      `${roundLabel}${remainingLabel} | Goals: ${this.matchState.stats.goals} | Saves: ${this.matchState.stats.savesAgainst}`
    );

    if (this.settings.controls === 'swipe') {
      const preview = this.swipeCapture.preview();
      const ready = this.swipeCapture.isActive() ? `Swipe dx:${preview.dx.toFixed(0)} dy:${preview.dy.toFixed(0)}` : 'Swipe up from ball to shoot';
      this.hudInput.setText(ready);
    } else {
      const target = this.tapCapture.getTarget();
      this.hudInput.setText(
        `Tap target in goal, set power bar, then Shoot | Target: ${(target.x * 100).toFixed(0)}%, ${(target.y * 100).toFixed(0)}%`
      );
    }
  }

  private nextRandom(): number {
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) % 4294967296;
    return this.rngSeed / 4294967296;
  }

  private playCue(kind: 'kick' | 'net' | 'save' | 'post' | 'whistle' | 'ui') {
    if (this.sound.mute) return;
    const manager = this.sound as unknown as { context?: AudioContext };
    const ctx = manager.context;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'net' ? 'triangle' : 'sine';

      if (kind === 'kick') osc.frequency.value = 180;
      else if (kind === 'net') osc.frequency.value = 240;
      else if (kind === 'save') osc.frequency.value = 150;
      else if (kind === 'post') osc.frequency.value = 420;
      else if (kind === 'whistle') osc.frequency.value = 560;
      else osc.frequency.value = 300;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {
      // no-op
    }
  }
}
