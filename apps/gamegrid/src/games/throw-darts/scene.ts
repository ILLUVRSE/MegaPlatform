import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { cameraFlash, cameraShake, triggerHaptic } from '../../systems/gameplayComfort';
import { createAimSmoother, computeFlickAim, computePullbackAim, applyAimAssist, type AimSample } from './input';
import { scoreDartboardHit } from './scoring';
import { applyThrowDartsHit, createInitialThrowDartsState, getAveragePerThree } from './rules';
import { createThrowDartsAiState, planAiThrow, type ThrowDartsAiState } from './ai';
import { formatTurnSummary, nextHotStreak, throwFeedbackMessage } from './feedback';
import { loadThrowDartsSettings, loadThrowDartsTuning, saveThrowDartsSettings, type ThrowDartsSettings, type ThrowDartsTuning } from './config';
import { createThrowDartsVfx, spawnBustVfx, spawnHitVfx, updateThrowDartsVfx, type ThrowDartsVfxState } from './vfx/effects';
import { QualityTuner, type QualitySnapshot } from './quality';
import { ThrowDartsAudio } from './audio';
import { suggestCheckout } from './checkout';
import type { DartHit, ThrowDartsDifficulty, ThrowDartsMatchState, ThrowDartsMatchType, ThrowDartsMode, ThrowDartsOptions, ThrowDartsSensitivity } from './types';
import { GAME_INSTRUCTIONS } from '../../content/howToPlay';

interface ThrowDartsSceneConfig {
  hooks: GameRuntimeHooks;
}

interface MatchEndSummary {
  winner: string;
  turns: number;
  averagePerThree: number;
  bulls: number;
}

interface MenuRow {
  label: () => string;
  onClick: () => void;
}

interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gaussianPair(u1: number, u2: number): { a: number; b: number } {
  const mag = Math.sqrt(-2 * Math.log(Math.max(0.0001, u1)));
  const theta = Math.PI * 2 * u2;
  return {
    a: mag * Math.cos(theta),
    b: mag * Math.sin(theta)
  };
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

function computeScale(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
}

export class ThrowDartsScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private settings: ThrowDartsSettings = loadThrowDartsSettings();
  private tuning: ThrowDartsTuning = loadThrowDartsTuning();
  private options!: ThrowDartsOptions;
  private state!: ThrowDartsMatchState;
  private aiState: ThrowDartsAiState = createThrowDartsAiState();

  private boardCenterX = 640;
  private boardCenterY = 360;
  private boardRadius = 250;

  private background!: Phaser.GameObjects.Image;
  private vignette!: Phaser.GameObjects.Image;
  private spotlight!: Phaser.GameObjects.Image;
  private boardBacker!: Phaser.GameObjects.Graphics;
  private boardGfx!: Phaser.GameObjects.Graphics;
  private boardNoise!: Phaser.GameObjects.TileSprite;
  private practiceGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private meterGfx!: Phaser.GameObjects.Graphics;
  private hudGfx!: Phaser.GameObjects.Graphics;

  private hudTurn!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudDarts!: Phaser.GameObjects.Text;
  private hudMode!: Phaser.GameObjects.Text;
  private hudSummary!: Phaser.GameObjects.Text;
  private hudCoach!: Phaser.GameObjects.Text;
  private hudCheckout!: Phaser.GameObjects.Text;
  private practiceCycleButton!: Phaser.GameObjects.Text;
  private menuButton!: Phaser.GameObjects.Text;

  private menuContainer!: Phaser.GameObjects.Container;
  private settingsContainer!: Phaser.GameObjects.Container;
  private howToContainer!: Phaser.GameObjects.Container;
  private tutorialContainer!: Phaser.GameObjects.Container;
  private tutorialText!: Phaser.GameObjects.Text;
  private tutorialIndex = 0;
  private endContainer!: Phaser.GameObjects.Container;
  private endText!: Phaser.GameObjects.Text;

  private vfx!: ThrowDartsVfxState;
  private audio!: ThrowDartsAudio;
  private qualityTuner?: QualityTuner;
  private qualitySnapshot?: QualitySnapshot;
  private perfText?: Phaser.GameObjects.Text;
  private showPerfHud = false;

  private highlightHit: DartHit | null = null;

  private aimSmoother = createAimSmoother(this.tuning);
  private aimPreview: AimSample | null = null;
  private pointerState: { id: number; startX: number; startY: number; lastX: number; lastY: number; startMs: number; lastMs: number } | null = null;

  private isThrowAnimating = false;
  private meterStartMs = 0;
  private aiThrowQueued = false;
  private ended = false;
  private hotStreak = 0;
  private lastWasBust = false;
  private coachUntilMs = 0;
  private lastPower = 0;

  private practiceTargets: Array<{ label: string; x: number; y: number }> = [];
  private practiceTargetIndex = 0;

  private dartPool: Array<{ container: Phaser.GameObjects.Container; shadow: Phaser.GameObjects.Image; body: Phaser.GameObjects.Image }> = [];
  private dartCursor = 0;
  private tutorialSeen = false;
  private lockedAim: { x: number; y: number } | null = null;
  private numberLabels: Phaser.GameObjects.Text[] = [];

  constructor(config: ThrowDartsSceneConfig) {
    super('throw-darts-main');
    this.hooks = config.hooks;
  }

  create() {
    this.tuning = loadThrowDartsTuning();
    this.aimSmoother = createAimSmoother(this.tuning);
    this.tutorialSeen = this.readTutorialSeen();

    this.createBackground();

    this.boardBacker = this.add.graphics();
    this.boardGfx = this.add.graphics();
    this.boardNoise = this.add
      .tileSprite(this.boardCenterX, this.boardCenterY, this.boardRadius * 2, this.boardRadius * 2, 'throw-darts-noise')
      .setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.practiceGfx = this.add.graphics();
    this.aimGfx = this.add.graphics();
    this.meterGfx = this.add.graphics();
    this.hudGfx = this.add.graphics();

    this.vfx = createThrowDartsVfx(this);

    this.boardBacker.setDepth(2);
    this.boardGfx.setDepth(2);
    this.boardNoise.setDepth(3);
    this.practiceGfx.setDepth(3);
    this.vfx.gfx.setDepth(4);
    this.aimGfx.setDepth(5);
    this.meterGfx.setDepth(5);
    this.hudGfx.setDepth(6);

    this.hudTurn = this.add.text(0, 0, '', { color: '#cfe3ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '18px' });
    this.hudScore = this.add.text(0, 0, '', { color: '#f8f4e8', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '42px', fontStyle: '700' });
    this.hudDarts = this.add.text(0, 0, '', { color: '#9ad6ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '16px' });
    this.hudMode = this.add.text(0, 0, '', { color: '#f6d18a', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '14px' });
    this.hudSummary = this.add.text(0, 0, '', { color: '#d9f8e6', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '16px' });
    this.hudCoach = this.add.text(0, 0, '', { color: '#e9f0ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '16px', backgroundColor: '#1b2433' }).setPadding(12, 8, 12, 8);
    this.hudCheckout = this.add.text(0, 0, '', { color: '#ffdb8f', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '14px' });

    this.hudTurn.setDepth(6);
    this.hudScore.setDepth(6);
    this.hudDarts.setDepth(6);
    this.hudMode.setDepth(6);
    this.hudSummary.setDepth(6);
    this.hudCoach.setDepth(6);
    this.hudCheckout.setDepth(6);

    this.practiceCycleButton = this.add
      .text(0, 0, 'Target', { color: '#dbeaff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '14px', backgroundColor: '#253146' })
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.options?.mode !== 'practice') return;
        this.practiceTargetIndex = (this.practiceTargetIndex + 1) % this.practiceTargets.length;
        this.renderPracticeTarget();
      });
    this.practiceCycleButton.setDepth(6);

    this.menuButton = this.add
      .text(0, 0, 'MENU', { color: '#f5f2ea', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '14px', backgroundColor: '#1f2b3d' })
      .setPadding(10, 8, 10, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setMenuVisible(true));
    this.menuButton.setDepth(6);

    this.buildMenu();
    this.buildEndScreen();
    this.buildPracticeTargets();
    this.buildDartPool();

    this.audio = new ThrowDartsAudio(this.hooks.gameId);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.menuContainer.visible || this.endContainer.visible || this.isThrowAnimating || this.ended) return;
      if (!this.canCurrentPlayerThrowHuman()) return;
      this.pointerState = {
        id: pointer.id,
        startX: pointer.x,
        startY: pointer.y,
        lastX: pointer.x,
        lastY: pointer.y,
        startMs: performance.now(),
        lastMs: performance.now()
      };
      this.meterStartMs = performance.now();
      this.aimPreview = null;
      this.aimSmoother.reset(this.boardCenterX, this.boardCenterY, 0.5, performance.now());
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerState || this.pointerState.id !== pointer.id) return;
      this.pointerState.lastX = pointer.x;
      this.pointerState.lastY = pointer.y;
      this.pointerState.lastMs = performance.now();
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.pointerState || this.pointerState.id !== pointer.id) return;
      const now = performance.now();
      const dx = this.pointerState.lastX - this.pointerState.startX;
      const dy = this.pointerState.lastY - this.pointerState.startY;
      const distance = Math.hypot(dx, dy);
      const duration = now - this.pointerState.startMs;
      const tap = distance < 10 && duration < 260;
      const aim = this.computeAimSample(this.pointerState, now);
      this.pointerState = null;
      if (tap) {
        if (this.isInsideBoard(pointer.x, pointer.y)) {
          this.lockedAim = this.clampToBoard(pointer.x, pointer.y);
        } else {
          this.lockedAim = null;
        }
        return;
      }
      if (!aim) return;
      this.throwFromAim(aim, false);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (!this.options) return;
      this.setMenuVisible(!this.menuContainer.visible);
    });

    this.scale.on('resize', () => this.layoutScene());

    this.layoutScene();
    this.renderBoard();
    this.setMenuVisible(true);

    this.qualityTuner = new QualityTuner(
      this.game,
      { vfxLevel: this.settings.vfxLevel, dprCap: this.settings.dprCap, autoQuality: this.settings.autoQuality },
      (snapshot) => {
        this.qualitySnapshot = snapshot;
        this.hooks.reportEvent({ type: 'quality_update', gameId: this.hooks.gameId, effects: snapshot.vfxLevel, dpr: snapshot.appliedDpr });
      }
    );

    this.showPerfHud = this.readPerfHudSetting();
    this.hooks.reportEvent({ type: 'telemetry', gameId: this.hooks.gameId, event: 'session_start' });
  }

  update(_: number, delta: number) {
    const dtSec = delta / 1000;

    if (this.pointerState && this.options) {
      const aim = this.computeAimSample(this.pointerState, performance.now());
      this.aimPreview = aim;
    } else {
      this.aimPreview = null;
    }

    this.drawAimPreview();
    this.drawPowerMeter();

    if (this.options?.mode === 'practice') {
      this.renderPracticeTarget();
      this.practiceCycleButton.setVisible(true);
    } else {
      this.practiceCycleButton.setVisible(false);
      this.practiceGfx.clear();
    }

    this.updateHud();
    this.queueAiTurnIfNeeded();

    const vfxLevel = this.qualitySnapshot?.vfxLevel ?? this.options?.vfxLevel ?? 'low';
    updateThrowDartsVfx(this.vfx, dtSec, vfxLevel);

    const fps = this.game.loop.actualFps ?? 60;
    this.qualityTuner?.sampleFps(fps, dtSec);
    this.updatePerfHud(fps, dtSec);
  }

  private computeAimSample(state: { startX: number; startY: number; lastX: number; lastY: number; startMs: number; lastMs: number }, nowMs: number): AimSample | null {
    if (!this.options) return null;
    if (this.options.aimMode === 'pullback') {
      const dy = state.lastY - state.startY;
      if (dy < 14) return null;
      const raw = computePullbackAim(state.startX, state.startY, state.lastX, state.lastY, this.options, this.boardCenterX, this.boardCenterY, this.tuning);
      if (this.lockedAim) {
        raw.targetX = this.lockedAim.x;
        raw.targetY = this.lockedAim.y;
      }
      const smoothed = this.aimSmoother.update(raw.targetX, raw.targetY, raw.power, nowMs);
      return { targetX: smoothed.x, targetY: smoothed.y, power: smoothed.power, spread: raw.spread };
    }

    const dx = state.lastX - state.startX;
    const dy = state.lastY - state.startY;
    const duration = Math.max(40, state.lastMs - state.startMs);
    if (Math.hypot(dx, dy) < 16 || dy > -6) return null;
    const raw = computeFlickAim(state.startX, state.startY, state.lastX, state.lastY, duration, this.options, this.boardCenterX, this.boardCenterY, this.tuning);
    if (this.lockedAim) {
      raw.targetX = this.lockedAim.x;
      raw.targetY = this.lockedAim.y;
    }
    const smoothed = this.aimSmoother.update(raw.targetX, raw.targetY, raw.power, nowMs);
    return { targetX: smoothed.x, targetY: smoothed.y, power: smoothed.power, spread: raw.spread };
  }

  private throwFromAim(aim: AimSample, ai: boolean) {
    if (this.isThrowAnimating || this.ended) return;
    if (!this.options) return;

    const timingQuality = this.options.timingMeter ? this.currentMeterPhase() : 1;
    const timingPenalty = this.options.timingMeter ? 1 - timingQuality : 0;

    const assistStrength = this.options.assistLevel === 'low' ? this.tuning.aimAssistStrength : 0;
    const assisted = applyAimAssist(aim.targetX, aim.targetY, assistStrength, this.boardCenterX, this.boardCenterY, this.boardRadius);

    const randomnessScale = this.options.reducedRandomness ? 0.5 : 1;
    const spread = aim.spread * this.boardRadius * (1 + timingPenalty * 0.3) * randomnessScale;
    const gaussian = gaussianPair(Math.random(), Math.random());

    const finalX = assisted.x + gaussian.a * spread;
    const finalY = assisted.y + gaussian.b * spread;

    this.lastPower = aim.power;

    this.throwFromResolution({ boardX: finalX, boardY: finalY, timingQuality }, ai);
  }

  private currentMeterPhase(): number {
    if (!this.options?.timingMeter) return 1;
    const elapsed = performance.now() - this.meterStartMs;
    return ((elapsed / 1200) * 2) % 1;
  }

  private buildPracticeTargets() {
    this.practiceTargets = [
      { label: 'T20', x: this.boardCenterX, y: this.boardCenterY - this.boardRadius * 0.605 },
      { label: 'D20', x: this.boardCenterX, y: this.boardCenterY - this.boardRadius * 0.975 },
      { label: 'Bull', x: this.boardCenterX, y: this.boardCenterY },
      { label: 'T19', x: this.boardCenterX + this.boardRadius * 0.2, y: this.boardCenterY - this.boardRadius * 0.56 }
    ];
  }

  private buildMenu() {
    const panel = this.add.rectangle(640, 360, 560, 520, 0x0b1220, 0.96).setStrokeStyle(2, 0x314a67);
    const title = this.add.text(640, 144, 'Throw Darts', { color: '#f3f7ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '34px' }).setOrigin(0.5);

    const rows: MenuRow[] = [
      {
        label: () => (this.options ? 'Resume' : 'Start Match'),
        onClick: () => {
          if (this.options) this.setMenuVisible(false);
          else this.startMatch();
        }
      },
      {
        label: () => 'Restart Match',
        onClick: () => this.startMatch()
      },
      {
        label: () => 'Finish Round',
        onClick: () => this.finishMatch(true)
      },
      {
        label: () => 'Settings',
        onClick: () => this.toggleSettings(true)
      },
      {
        label: () => 'System Settings',
        onClick: () => this.openGlobalSettings()
      },
      {
        label: () => 'Tutorial',
        onClick: () => this.openTutorial()
      },
      {
        label: () => 'How to Play',
        onClick: () => this.toggleHowTo(true)
      }
    ];

    const menuButtons: Phaser.GameObjects.GameObject[] = [panel, title];

    rows.forEach((row, i) => {
      const y = 230 + i * 52;
      const button = this.add
        .text(640, y, row.label(), {
          color: '#d8e8ff',
          fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
          fontSize: '22px',
          backgroundColor: '#1e2c44'
        })
        .setOrigin(0.5)
        .setPadding(14, 8, 14, 8)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => row.onClick());
      button.setData('labelFn', row.label);
      menuButtons.push(button);
    });

    this.menuContainer = this.add.container(0, 0, menuButtons);
    this.menuContainer.setDepth(8);

    this.settingsContainer = this.buildSettingsPanel();
    this.howToContainer = this.buildHowToPanel();
    this.tutorialContainer = this.buildTutorialPanel();

    this.menuContainer.add(this.settingsContainer);
    this.menuContainer.add(this.howToContainer);
    this.menuContainer.add(this.tutorialContainer);

    this.toggleSettings(false);
    this.toggleHowTo(false);
    this.tutorialContainer.setVisible(false);
  }

  private buildSettingsPanel(): Phaser.GameObjects.Container {
    const panel = this.add.rectangle(640, 360, 560, 520, 0x0b1220, 0.96).setStrokeStyle(2, 0x314a67);
    const title = this.add.text(640, 144, 'Settings', { color: '#f3f7ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '30px' }).setOrigin(0.5);

    const rows: MenuRow[] = [
      {
        label: () => `Mode: ${this.settings.mode.toUpperCase()}`,
        onClick: () => {
          const order: ThrowDartsSettings['mode'][] = ['301', '501', 'cricket'];
          const idx = order.indexOf(this.settings.mode);
          this.settings.mode = order[(idx + 1) % order.length];
          this.refreshSettings();
        }
      },
      {
        label: () =>
          `Match: ${
            this.settings.matchType === 'vs_ai' ? 'Vs AI' : this.settings.matchType === 'local' ? 'Hotseat' : 'Practice'
          }`,
        onClick: () => {
          const order: ThrowDartsMatchType[] = ['vs_ai', 'local', 'practice'];
          const idx = order.indexOf(this.settings.matchType);
          this.settings.matchType = order[(idx + 1) % order.length];
          this.refreshSettings();
        }
      },
      {
        label: () => `Aim Mode: ${this.settings.aimMode === 'pullback' ? 'Pull-back' : 'Flick'}`,
        onClick: () => {
          this.settings.aimMode = this.settings.aimMode === 'pullback' ? 'flick' : 'pullback';
          this.refreshSettings();
        }
      },
      {
        label: () => `Assist: ${this.settings.assistLevel === 'low' ? 'Low' : 'Off'}`,
        onClick: () => {
          this.settings.assistLevel = this.settings.assistLevel === 'low' ? 'off' : 'low';
          this.refreshSettings();
        }
      },
      {
        label: () => `Reduced Randomness: ${this.settings.reducedRandomness ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.reducedRandomness = !this.settings.reducedRandomness;
          this.refreshSettings();
        }
      },
      {
        label: () => `Timing Meter: ${this.settings.timingMeter ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.timingMeter = !this.settings.timingMeter;
          this.refreshSettings();
        }
      },
      {
        label: () => `Difficulty: ${this.settings.difficulty}`,
        onClick: () => {
          const order: ThrowDartsDifficulty[] = ['easy', 'medium', 'hard', 'pro'];
          const idx = order.indexOf(this.settings.difficulty);
          this.settings.difficulty = order[(idx + 1) % order.length];
          this.refreshSettings();
        }
      },
      {
        label: () => `Sensitivity: ${this.settings.sensitivity}`,
        onClick: () => {
          const order: ThrowDartsSensitivity[] = ['low', 'medium', 'high'];
          const idx = order.indexOf(this.settings.sensitivity);
          this.settings.sensitivity = order[(idx + 1) % order.length];
          this.refreshSettings();
        }
      },
      {
        label: () => `Double Out: ${this.settings.doubleOut ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.doubleOut = !this.settings.doubleOut;
          this.refreshSettings();
        }
      },
      {
        label: () => `Show Checkout: ${this.settings.showCheckout ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.showCheckout = !this.settings.showCheckout;
          this.refreshSettings();
        }
      },
      {
        label: () => `Show Coach: ${this.settings.showCoach ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.showCoach = !this.settings.showCoach;
          this.refreshSettings();
        }
      },
      {
        label: () => `Haptics: ${this.settings.haptics ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.haptics = !this.settings.haptics;
          this.refreshSettings();
        }
      },
      {
        label: () => `SFX: ${this.settings.sfx ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.sfx = !this.settings.sfx;
          this.refreshSettings();
        }
      },
      {
        label: () => `Handedness: ${this.settings.handedness === 'right' ? 'Right' : 'Left'}`,
        onClick: () => {
          this.settings.handedness = this.settings.handedness === 'right' ? 'left' : 'right';
          this.refreshSettings();
          this.layoutScene();
        }
      },
      {
        label: () => `VFX: ${this.settings.vfxLevel}`,
        onClick: () => {
          const order: ThrowDartsSettings['vfxLevel'][] = ['high', 'low', 'off'];
          const idx = order.indexOf(this.settings.vfxLevel);
          this.settings.vfxLevel = order[(idx + 1) % order.length];
          this.refreshSettings();
        }
      },
      {
        label: () => `DPR Cap: ${this.settings.dprCap.toFixed(2)}`,
        onClick: () => {
          const next = this.settings.dprCap >= 2 ? 1.25 : this.settings.dprCap + 0.25;
          this.settings.dprCap = Number(next.toFixed(2));
          this.refreshSettings();
        }
      },
      {
        label: () => `Auto Quality: ${this.settings.autoQuality ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.autoQuality = !this.settings.autoQuality;
          this.refreshSettings();
        }
      }
    ];

    const buttons: Phaser.GameObjects.GameObject[] = [panel, title];

    rows.forEach((row, i) => {
      const y = 210 + i * 32;
      const button = this.add
        .text(640, y, row.label(), {
          color: '#d8e8ff',
          fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
          fontSize: '16px',
          backgroundColor: '#1e2c44'
        })
        .setOrigin(0.5)
        .setPadding(10, 6, 10, 6)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => row.onClick());
      button.setData('labelFn', row.label);
      buttons.push(button);
    });

    const back = this.add
      .text(640, 600, 'Back', { color: '#f0f4ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '20px', backgroundColor: '#2b3f5c' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleSettings(false));

    buttons.push(back);

    return this.add.container(0, 0, buttons);
  }

  private buildHowToPanel(): Phaser.GameObjects.Container {
    const panel = this.add.rectangle(640, 360, 560, 520, 0x0b1220, 0.96).setStrokeStyle(2, 0x314a67);
    const title = this.add.text(640, 144, 'How to Play', { color: '#f3f7ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '30px' }).setOrigin(0.5);

    const lines = GAME_INSTRUCTIONS['throw-darts'] ?? [];
    const body = this.add.text(640, 300, lines.join('\n'), {
      color: '#d8e8ff',
      fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
      fontSize: '18px',
      align: 'center',
      wordWrap: { width: 480 }
    }).setOrigin(0.5);

    const back = this.add
      .text(640, 600, 'Back', { color: '#f0f4ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '20px', backgroundColor: '#2b3f5c' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleHowTo(false));

    return this.add.container(0, 0, [panel, title, body, back]);
  }

  private buildTutorialPanel(): Phaser.GameObjects.Container {
    const panel = this.add.rectangle(640, 360, 580, 520, 0x0b1220, 0.98).setStrokeStyle(2, 0x314a67);
    const title = this.add.text(640, 144, 'Quick Tutorial', { color: '#f3f7ff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '30px' }).setOrigin(0.5);

    this.tutorialText = this.add.text(640, 290, '', {
      color: '#d8e8ff',
      fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
      fontSize: '18px',
      align: 'center',
      wordWrap: { width: 480 }
    }).setOrigin(0.5);

    const prev = this.add
      .text(470, 520, 'Prev', { color: '#dbeaff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '18px', backgroundColor: '#244260' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.stepTutorial(-1));

    const next = this.add
      .text(640, 520, 'Next', { color: '#0d1b2e', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '18px', backgroundColor: '#93db87' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.stepTutorial(1));

    const done = this.add
      .text(820, 520, 'Done', { color: '#dbeaff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '18px', backgroundColor: '#244260' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.closeTutorial(true));

    return this.add.container(0, 0, [panel, title, this.tutorialText, prev, next, done]);
  }

  private refreshSettings() {
    for (const item of this.settingsContainer.list) {
      if (!(item instanceof Phaser.GameObjects.Text)) continue;
      const labelFn = item.getData('labelFn') as (() => string) | undefined;
      if (labelFn) item.setText(labelFn());
    }
    this.audio?.play('ui');
    saveThrowDartsSettings(this.settings);
    if (this.options) {
      this.options = {
        ...this.options,
        difficulty: this.settings.difficulty,
        sensitivity: this.settings.sensitivity,
        aimMode: this.settings.aimMode,
        timingMeter: this.settings.timingMeter,
        assistLevel: this.settings.assistLevel,
        reducedRandomness: this.settings.reducedRandomness,
        doubleOut: this.settings.doubleOut,
        haptics: this.settings.haptics,
        sfx: this.settings.sfx,
        handedness: this.settings.handedness,
        showCheckout: this.settings.showCheckout,
        showCoach: this.settings.showCoach,
        vfxLevel: this.settings.vfxLevel,
        dprCap: this.settings.dprCap,
        autoQuality: this.settings.autoQuality
      };
      this.audio.setEnabled(this.options.sfx);
      this.qualityTuner?.updateFromOptions({ vfxLevel: this.options.vfxLevel, dprCap: this.options.dprCap, autoQuality: this.options.autoQuality });
    }
  }

  private refreshMenu() {
    for (const item of this.menuContainer.list) {
      if (!(item instanceof Phaser.GameObjects.Text)) continue;
      const labelFn = item.getData('labelFn') as (() => string) | undefined;
      if (labelFn) item.setText(labelFn());
    }
  }

  private openTutorial() {
    this.tutorialIndex = 0;
    this.updateTutorialText();
    this.tutorialContainer.setVisible(true);
    this.toggleSettings(false);
    this.toggleHowTo(false);
  }

  private stepTutorial(direction: 1 | -1) {
    const steps = this.getTutorialSteps();
    this.tutorialIndex = clamp(this.tutorialIndex + direction, 0, steps.length - 1);
    this.updateTutorialText();
  }

  private updateTutorialText() {
    const steps = this.getTutorialSteps();
    const text = steps[this.tutorialIndex] ?? steps[0];
    this.tutorialText.setText(text);
  }

  private closeTutorial(markSeen: boolean) {
    this.tutorialContainer.setVisible(false);
    if (markSeen) this.writeTutorialSeen();
  }

  private getTutorialSteps(): string[] {
    return [
      'Tap a spot on the board to lock your reticle, then pull back to set power and release.',
      'Flick mode: quick upward flick sets velocity. Higher speed = more power.',
      'Use the reticle + spread ring to read accuracy. Spread shrinks with steady pulls.',
      'Double Out requires a double to finish (toggle in settings). Bust resets to turn start.'
    ];
  }

  private readTutorialSeen(): boolean {
    try {
      return window.localStorage.getItem('gamegrid.throw-darts.tutorial.v1') === '1';
    } catch {
      return false;
    }
  }

  private writeTutorialSeen(): void {
    try {
      window.localStorage.setItem('gamegrid.throw-darts.tutorial.v1', '1');
      this.tutorialSeen = true;
    } catch {
      // ignore storage errors
    }
  }

  private openGlobalSettings() {
    try {
      window.dispatchEvent(new CustomEvent('gamegrid:open-settings'));
    } catch {
      // no-op
    }
  }

  private toggleSettings(show: boolean) {
    this.settingsContainer.setVisible(show);
    if (show) this.tutorialContainer.setVisible(false);
  }

  private toggleHowTo(show: boolean) {
    this.howToContainer.setVisible(show);
    if (show) this.tutorialContainer.setVisible(false);
  }

  private buildEndScreen() {
    const panel = this.add.rectangle(640, 360, 560, 380, 0x08121f, 0.96).setStrokeStyle(2, 0x3a5a7f);
    const title = this.add.text(640, 220, 'Match Complete', { color: '#ffffff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '34px' }).setOrigin(0.5);
    this.endText = this.add.text(640, 300, '', { color: '#dcecff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '20px', align: 'center' }).setOrigin(0.5);

    const rematch = this.add
      .text(640, 420, 'Rematch', { color: '#0d1b2e', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '24px', backgroundColor: '#93db87' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startMatch());

    const settings = this.add
      .text(640, 470, 'Settings', { color: '#dbeaff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '20px', backgroundColor: '#244260' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.endContainer.setVisible(false);
        this.setMenuVisible(true);
        this.toggleSettings(true);
      });

    const back = this.add
      .text(640, 518, 'Back to Lobby', { color: '#dbeaff', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '20px', backgroundColor: '#244260' })
      .setOrigin(0.5)
      .setPadding(12, 6, 12, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.endContainer = this.add.container(0, 0, [panel, title, this.endText, rematch, settings, back]);
    this.endContainer.setDepth(9);
    this.endContainer.setVisible(false);
  }

  private startMatch() {
    const mode: ThrowDartsMode = this.settings.matchType === 'practice' ? 'practice' : this.settings.mode;
    this.options = {
      mode,
      matchType: this.settings.matchType,
      difficulty: this.settings.difficulty,
      sensitivity: this.settings.sensitivity,
      aimMode: this.settings.aimMode,
      timingMeter: this.settings.timingMeter,
      assistLevel: this.settings.assistLevel,
      reducedRandomness: this.settings.reducedRandomness,
      doubleOut: this.settings.doubleOut,
      haptics: this.settings.haptics,
      sfx: this.settings.sfx,
      handedness: this.settings.handedness,
      showCheckout: this.settings.showCheckout,
      showCoach: this.settings.showCoach,
      vfxLevel: this.settings.vfxLevel,
      dprCap: this.settings.dprCap,
      autoQuality: this.settings.autoQuality
    };

    this.state = createInitialThrowDartsState(this.options);
    this.aiState = createThrowDartsAiState(0.391);
    this.highlightHit = null;
    this.aimPreview = null;
    this.ended = false;
    this.hotStreak = 0;
    this.lastWasBust = false;
    this.coachUntilMs = performance.now() + this.tuning.coachFadeMs;
    this.aiThrowQueued = false;

    this.audio.setEnabled(this.options.sfx);

    saveThrowDartsSettings(this.settings);

    this.setMenuVisible(false);
    this.endContainer.setVisible(false);

    this.clearDarts();

    this.renderBoard();

    this.qualityTuner?.updateFromOptions({ vfxLevel: this.options.vfxLevel, dprCap: this.options.dprCap, autoQuality: this.options.autoQuality });

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.options.mode,
      difficulty: this.options.difficulty,
      options: {
        timingMeter: this.options.timingMeter,
        assistLevel: this.options.assistLevel,
        sensitivity: this.options.sensitivity,
        doubleOut: this.options.doubleOut,
        matchType: this.options.matchType,
        aimMode: this.options.aimMode
      }
    });

    if (!this.tutorialSeen) {
      this.openTutorial();
    }
  }

  private canCurrentPlayerThrowHuman(): boolean {
    if (this.options.mode === 'practice') return true;
    if (this.state.kind === 'practice') return true;
    if (this.options.matchType === 'local') return true;
    return this.state.kind !== 'practice' && this.state.currentPlayer === 0;
  }

  private queueAiTurnIfNeeded() {
    if (!this.options || this.ended || this.menuContainer.visible || this.endContainer.visible || this.isThrowAnimating) return;
    if (this.options.mode === 'practice') return;
    if (this.options.matchType !== 'vs_ai') return;
    if (this.state.kind === 'practice') return;
    if (this.state.currentPlayer !== 1) return;
    if (this.aiThrowQueued) return;

    this.aiThrowQueued = true;
    this.time.delayedCall(340, () => {
      this.aiThrowQueued = false;
      if (this.ended || this.isThrowAnimating || this.state.kind === 'practice') return;
      const planned = planAiThrow(this.state, this.options, this.boardCenterX, this.boardCenterY, this.boardRadius, this.aiState, this.tuning);
      this.aiState = planned.aiState;
      this.throwFromResolution(planned.resolution, true);
    });
  }

  private throwFromResolution(resolution: { boardX: number; boardY: number; timingQuality: number }, ai: boolean) {
    if (this.isThrowAnimating || this.ended) return;
    this.isThrowAnimating = true;

    const startX = this.boardCenterX;
    const startY = ai ? 110 : 670;
    const endX = resolution.boardX;
    const endY = resolution.boardY;

    this.playCue('throw');

    const dart = this.spawnDart(startX, startY);
    const rotation = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
    dart.container.setRotation(rotation);

    this.tweens.add({
      targets: dart.container,
      x: endX,
      y: endY,
      duration: 160,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.isThrowAnimating = false;
        dart.container.setScale(0.9);
        this.tweens.add({
          targets: dart.container,
          scale: 1,
          duration: 90,
          ease: 'Back.easeOut'
        });
        this.resolveBoardImpact(endX, endY, resolution.timingQuality);
      }
    });
  }

  private resolveBoardImpact(x: number, y: number, timingQuality: number) {
    try {
      const hit = scoreDartboardHit(x, y, {
        centerX: this.boardCenterX,
        centerY: this.boardCenterY,
        radius: this.boardRadius
      });

      this.highlightHit = hit;
      this.renderBoard();

      if (hit.isBull) {
        this.playCue('bull');
        if (this.options.haptics) triggerHaptic(16);
        this.hotStreak = nextHotStreak(this.hotStreak, hit, false);
        cameraFlash(this, 60, 255, 234, 180);
      } else if (hit.score > 0) {
        this.playCue(hit.ring === 'double' || hit.ring === 'triple' ? 'wire' : 'board_hit');
        if (this.options.haptics) triggerHaptic(8);
        this.hotStreak = nextHotStreak(this.hotStreak, hit, false);
      } else {
        this.hotStreak = nextHotStreak(this.hotStreak, hit, false);
      }

      const vfxLevel = this.qualitySnapshot?.vfxLevel ?? this.options.vfxLevel;
      spawnHitVfx(this.vfx, x, y, hit, vfxLevel);

      const previous = this.state;
      this.state = applyThrowDartsHit(previous, hit, this.options);

      if (this.options.mode === 'practice') {
        return;
      }

      if (this.state.kind !== 'practice' && previous.kind !== 'practice') {
        this.lastWasBust = this.detectBust(previous, hit);
        if (this.lastWasBust) {
          this.playCue('bust');
          if (this.options.haptics) triggerHaptic(12);
          this.hotStreak = nextHotStreak(this.hotStreak, hit, true);
          cameraShake(this, 90, 0.002);
          const vfxLevel = this.qualitySnapshot?.vfxLevel ?? this.options.vfxLevel;
          spawnBustVfx(this.vfx, this.boardCenterX, this.boardCenterY, vfxLevel);
        } else {
          this.lastWasBust = false;
        }

        if (this.state.winner !== null) {
          this.finishMatch(false);
        }
      }

      this.coachUntilMs = performance.now() + this.tuning.coachFadeMs;
      this.hooks.reportEvent({
        type: 'telemetry',
        gameId: this.hooks.gameId,
        event: 'dart_thrown',
        aimMode: this.options.aimMode,
        powerBucket: Math.round(this.lastPower * 10) / 10,
        ring: hit.ring,
        number: hit.number,
        score: hit.score,
        bust: this.lastWasBust
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown throw resolution error';
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private detectBust(previous: ThrowDartsMatchState, hit: DartHit): boolean {
    if (previous.kind !== 'x01') return false;
    const current = previous.players[previous.currentPlayer];
    const nextRemaining = current.remaining - hit.score;
    if (nextRemaining < 0) return true;
    if (this.options.doubleOut && nextRemaining === 1) return true;
    if (nextRemaining === 0 && this.options.doubleOut && !hit.isDouble) return true;
    return false;
  }

  private finishMatch(forceEnd: boolean) {
    if (!this.options || this.ended || this.state.kind === 'practice') return;

    this.ended = true;
    let summary: MatchEndSummary;
    let scoreValue = 0;

    if (this.state.kind === 'x01') {
      const winner = this.state.winner ?? 0;
      const winnerState = this.state.players[winner];
      scoreValue = winnerState.stats.totalScored;
      summary = {
        winner: this.state.winner === null ? 'No winner' : winner === 0 ? 'Player 1' : this.options.matchType === 'vs_ai' ? 'AI' : 'Player 2',
        turns: winnerState.stats.turns,
        averagePerThree: getAveragePerThree(winnerState.stats.totalScored, winnerState.stats.turns),
        bulls: winnerState.stats.bulls
      };
    } else {
      const winner = this.state.winner ?? 0;
      const winnerState = this.state.players[winner];
      scoreValue = winnerState.stats.totalScored;
      summary = {
        winner: this.state.winner === null ? 'No winner' : winner === 0 ? 'Player 1' : this.options.matchType === 'vs_ai' ? 'AI' : 'Player 2',
        turns: winnerState.stats.turns,
        averagePerThree: getAveragePerThree(winnerState.stats.totalScored, winnerState.stats.turns),
        bulls: winnerState.stats.bulls
      };
    }

    this.playCue('win');
    if (this.options.haptics) triggerHaptic([20, 35, 20]);

    this.endText.setText(
      `Winner: ${summary.winner}\nTurns: ${summary.turns}\nAverage / 3 darts: ${summary.averagePerThree.toFixed(1)}\nBulls: ${summary.bulls}`
    );
    this.setMenuVisible(false);
    this.endContainer.setVisible(true);

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      winner: summary.winner,
      mode: this.options.mode,
      score: scoreValue,
      outcome: forceEnd ? 'forced_end' : 'completed',
      finalStateSummary: summary
    });
  }

  private renderPracticeTarget() {
    const g = this.practiceGfx;
    g.clear();
    g.lineStyle(2, 0x5fffd0, 1);
    const target = this.practiceTargets[this.practiceTargetIndex % this.practiceTargets.length];
    g.strokeCircle(target.x, target.y, 16);
    g.strokeCircle(target.x, target.y, 6);
  }

  private renderBoard() {
    const g = this.boardGfx;
    g.clear();

    this.boardBacker.clear();
    this.boardBacker.fillStyle(0x0b111a, 0.9);
    this.boardBacker.fillRoundedRect(this.boardCenterX - this.boardRadius * 1.08, this.boardCenterY - this.boardRadius * 1.08, this.boardRadius * 2.16, this.boardRadius * 2.16, 18);
    this.boardBacker.lineStyle(2, 0x2f3f57, 0.8);
    this.boardBacker.strokeRoundedRect(this.boardCenterX - this.boardRadius * 1.08, this.boardCenterY - this.boardRadius * 1.08, this.boardRadius * 2.16, this.boardRadius * 2.16, 18);

    g.fillStyle(0x0c1118, 1);
    g.fillCircle(this.boardCenterX, this.boardCenterY, this.boardRadius + 12);

    g.fillStyle(0x1a232f, 1);
    g.fillCircle(this.boardCenterX, this.boardCenterY, this.boardRadius * 1.02);

    const segment = (Math.PI * 2) / 20;
    for (let i = 0; i < 20; i += 1) {
      const theta0 = i * segment - Math.PI / 2;
      const theta1 = (i + 1) * segment - Math.PI / 2;
      const color = i % 2 === 0 ? 0xe8d3ad : 0x1f252e;

      g.fillStyle(color, 1);
      g.slice(this.boardCenterX, this.boardCenterY, this.boardRadius * 0.95, theta0, theta1, false);
      g.lineTo(this.boardCenterX, this.boardCenterY);
      g.closePath();
      g.fillPath();

      const ringColor = i % 2 === 0 ? 0xb63c44 : 0x2f9d57;
      g.lineStyle(this.boardRadius * 0.05, ringColor, 1);
      g.beginPath();
      g.arc(this.boardCenterX, this.boardCenterY, this.boardRadius * 0.61, theta0, theta1, false);
      g.strokePath();
      g.beginPath();
      g.arc(this.boardCenterX, this.boardCenterY, this.boardRadius * 0.975, theta0, theta1, false);
      g.strokePath();
    }

    g.fillStyle(0x2f9d57, 1);
    g.fillCircle(this.boardCenterX, this.boardCenterY, this.boardRadius * 0.0935);
    g.fillStyle(0xb42f39, 1);
    g.fillCircle(this.boardCenterX, this.boardCenterY, this.boardRadius * 0.0375);

    g.lineStyle(4, 0xbac4d6, 0.9);
    g.strokeCircle(this.boardCenterX, this.boardCenterY, this.boardRadius * 1.02);
    g.lineStyle(2, 0x5f6b7a, 0.6);
    g.strokeCircle(this.boardCenterX, this.boardCenterY, this.boardRadius * 1.06);

    g.fillStyle(0x000000, 0.15);
    g.fillCircle(this.boardCenterX + this.boardRadius * 0.04, this.boardCenterY + this.boardRadius * 0.04, this.boardRadius * 0.96);

    this.drawLastHitHighlight();
    this.layoutNumberLabels();
  }

  private drawLastHitHighlight() {
    const hit = this.highlightHit;
    if (!hit || hit.ring === 'miss') return;

    const g = this.boardGfx;
    g.fillStyle(0xffef7a, 0.22);

    if (hit.isBull) {
      const radius = hit.ring === 'inner_bull' ? this.boardRadius * 0.0375 : this.boardRadius * 0.0935;
      g.fillCircle(this.boardCenterX, this.boardCenterY, radius);
      return;
    }

    if (!hit.number) return;

    const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    const idx = order.indexOf(hit.number);
    if (idx < 0) return;

    const seg = (Math.PI * 2) / 20;
    const theta0 = idx * seg - Math.PI / 2;
    const theta1 = (idx + 1) * seg - Math.PI / 2;

    let inner = this.boardRadius * 0.0935;
    let outer = this.boardRadius * 0.95;

    if (hit.ring === 'triple') {
      inner = this.boardRadius * 0.582;
      outer = this.boardRadius * 0.629;
    } else if (hit.ring === 'double') {
      inner = this.boardRadius * 0.953;
      outer = this.boardRadius;
    }

    g.beginPath();
    g.arc(this.boardCenterX, this.boardCenterY, outer, theta0, theta1, false);
    g.arc(this.boardCenterX, this.boardCenterY, inner, theta1, theta0, true);
    g.closePath();
    g.fillPath();
  }

  private updateHud() {
    if (!this.options) {
      this.hudTurn.setText('Tap MENU to start.');
      this.hudScore.setText('');
      this.hudDarts.setText('');
      this.hudMode.setText('');
      this.hudSummary.setText('');
      this.hudCoach.setVisible(false);
      this.hudCheckout.setText('');
      return;
    }

    if (this.state.kind === 'practice') {
      const last = this.state.state.lastHit;
      this.hudTurn.setText('Practice Mode');
      this.hudScore.setText(`Throws ${this.state.state.throws}`);
      this.hudDarts.setText('Darts: INF');
      const targetLabel = this.practiceTargets[this.practiceTargetIndex].label;
      this.hudMode.setText(`Target ${targetLabel}`);
      this.practiceCycleButton.setText(`Target ${targetLabel}`);
      this.hudSummary.setText(last ? `Last ${last.ring} ${last.number ?? ''} (${last.score})` : '');
      this.hudCheckout.setText('');
    } else {
      const currentLabel =
        this.state.currentPlayer === 0 ? 'Player 1' : this.options.matchType === 'vs_ai' ? 'AI' : 'Player 2';
      this.hudTurn.setText(`Turn ${currentLabel}`);

      if (this.state.kind === 'x01') {
        const current = this.state.players[this.state.currentPlayer];
        this.hudScore.setText(`${current.remaining}`);
        this.hudDarts.setText(`Darts ${this.state.dartsRemaining}`);
        this.hudMode.setText(`${this.state.startScore} ${this.options.doubleOut ? '• Double Out' : ''}`.trim());

        const summaryHits = current.turnDarts.length ? current.turnDarts : current.lastTurnDarts;
        const summaryTotal = current.turnDarts.length ? current.turnAccumulated : current.lastTurnTotal;
        this.hudSummary.setText(formatTurnSummary(summaryHits, summaryTotal, this.lastWasBust));
        this.hudSummary.setColor(this.lastWasBust ? '#ffb8b0' : '#d9f8e6');

        const checkout = this.options.showCheckout ? suggestCheckout(current.remaining) : null;
        this.hudCheckout.setText(checkout ? `Checkout: ${checkout}` : '');
      } else {
        const current = this.state.players[this.state.currentPlayer];
        this.hudScore.setText(`${current.points}`);
        this.hudDarts.setText(`Darts ${this.state.dartsRemaining}`);
        this.hudMode.setText('Cricket');
        const summaryHits = current.turnDarts.length ? current.turnDarts : current.lastTurnDarts;
        const summaryTotal = current.turnDarts.length ? current.turnAccumulated : current.lastTurnTotal;
        this.hudSummary.setText(formatTurnSummary(summaryHits, summaryTotal, this.lastWasBust));
        this.hudSummary.setColor(this.lastWasBust ? '#ffb8b0' : '#d9f8e6');
        this.hudCheckout.setText('');
      }
    }

    if (this.options.showCoach) {
      const now = performance.now();
      const alpha = clamp((this.coachUntilMs - now) / this.tuning.coachFadeMs, 0, 1);
      this.hudCoach.setVisible(alpha > 0.02);
      this.hudCoach.setAlpha(alpha);
      if (this.highlightHit) {
        this.hudCoach.setText(throwFeedbackMessage(this.highlightHit, this.lastWasBust));
      } else {
        this.hudCoach.setText(
          this.options.aimMode === 'pullback'
            ? 'Tap to lock aim, pull back for power, release to throw.'
            : 'Tap to lock aim, flick upward to throw with speed.'
        );
      }
    } else {
      this.hudCoach.setVisible(false);
    }
  }

  private drawAimPreview() {
    const g = this.aimGfx;
    g.clear();

    if (this.menuContainer.visible || this.endContainer.visible) return;
    const preview = this.aimPreview ?? (this.lockedAim ? { targetX: this.lockedAim.x, targetY: this.lockedAim.y, power: 0.6, spread: 0.03 } : null);
    if (!preview) return;

    const pulse = 0.7 + Math.sin(this.time.now * 0.006) * 0.3;
    const spreadRadius = preview.spread * this.boardRadius * 1.3;
    g.lineStyle(2, 0xffffff, 0.28);
    g.strokeCircle(preview.targetX, preview.targetY, spreadRadius);

    g.lineStyle(2, 0x7fdcff, 0.7 + 0.3 * pulse);
    g.strokeCircle(preview.targetX, preview.targetY, 8 + pulse * 2);
    g.beginPath();
    g.moveTo(preview.targetX - 12, preview.targetY);
    g.lineTo(preview.targetX + 12, preview.targetY);
    g.moveTo(preview.targetX, preview.targetY - 12);
    g.lineTo(preview.targetX, preview.targetY + 12);
    g.strokePath();
  }

  private drawPowerMeter() {
    this.meterGfx.clear();
    if (!this.options || this.menuContainer.visible || this.endContainer.visible) return;

    const safe = this.getSafeInsetsScaled();
    const meterHeight = 180;
    const meterWidth = 16;
    const padding = 26;
    const sideX = this.options.handedness === 'right' ? BASE_WIDTH - safe.right - padding : safe.left + padding;
    const baseY = BASE_HEIGHT - safe.bottom - 90;

    const power = clamp(this.aimPreview?.power ?? 0, 0, 1.1);

    this.meterGfx.fillStyle(0x0f1a28, 0.9);
    this.meterGfx.fillRoundedRect(sideX - meterWidth / 2, baseY - meterHeight, meterWidth, meterHeight, 6);
    this.meterGfx.fillStyle(0x7fdcff, 0.9);
    this.meterGfx.fillRoundedRect(sideX - meterWidth / 2, baseY - power * meterHeight, meterWidth, power * meterHeight, 6);

    if (this.options.timingMeter && this.pointerState) {
      const phase = this.currentMeterPhase();
      const y = baseY - meterHeight + phase * meterHeight;
      this.meterGfx.fillStyle(0xffd16a, 0.9);
      this.meterGfx.fillRect(sideX - meterWidth, y - 2, meterWidth * 2, 4);
    }

    if (this.aimPreview && this.aimPreview.spread > this.tuning.randomnessMin * 1.2) {
      const spreadWidth = clamp(this.aimPreview.spread * 120, 10, 40);
      this.meterGfx.fillStyle(0xffd16a, 0.7);
      this.meterGfx.fillRect(sideX - spreadWidth / 2, baseY + 8, spreadWidth, 3);
    }
  }

  private layoutScene() {
    const safePx = readSafeArea();
    const scale = computeScale();
    const safe = {
      top: safePx.top / scale,
      right: safePx.right / scale,
      bottom: safePx.bottom / scale,
      left: safePx.left / scale
    };

    const topBarHeight = 96;
    const boardAvailableHeight = BASE_HEIGHT - safe.top - safe.bottom - topBarHeight - 80;
    const boardAvailableWidth = BASE_WIDTH - safe.left - safe.right - 80;
    const radius = Math.min(boardAvailableHeight / 2, boardAvailableWidth / 2, 280);

    this.boardRadius = radius;
    this.boardCenterX = safe.left + (BASE_WIDTH - safe.left - safe.right) * 0.5;
    this.boardCenterY = safe.top + topBarHeight + boardAvailableHeight * 0.5 + 10;

    this.boardNoise.setPosition(this.boardCenterX, this.boardCenterY);
    this.boardNoise.setSize(this.boardRadius * 2.1, this.boardRadius * 2.1);

    this.spotlight.setPosition(this.boardCenterX, this.boardCenterY - this.boardRadius * 0.2);
    this.spotlight.setDisplaySize(this.boardRadius * 3.2, this.boardRadius * 3.2);

    this.renderBoard();
    this.buildPracticeTargets();
    this.clearDarts();

    const left = safe.left + 24;
    const right = BASE_WIDTH - safe.right - 24;
    const top = safe.top + 16;

    this.hudGfx.clear();
    this.hudGfx.fillStyle(0x0f1926, 0.75);
    this.hudGfx.fillRoundedRect(left, top, right - left, topBarHeight - 18, 16);
    this.hudGfx.lineStyle(1, 0x3b4c62, 0.6);
    this.hudGfx.strokeRoundedRect(left, top, right - left, topBarHeight - 18, 16);

    this.hudTurn.setPosition(left + 16, top + 10);
    this.hudScore.setPosition(left + 16, top + 30);

    this.hudDarts.setOrigin(1, 0);
    this.hudDarts.setPosition(right - 16, top + 10);
    this.hudMode.setOrigin(1, 0);
    this.hudMode.setPosition(right - 16, top + 32);

    this.hudSummary.setPosition(left + 16, top + topBarHeight - 10);
    this.hudCheckout.setPosition(left + 16, top + topBarHeight + 12);

    this.practiceCycleButton.setPosition(left + 16, top + topBarHeight + 38);

    this.hudCoach.setPosition(left + 16, top + topBarHeight + 72);

    const handedness = this.options?.handedness ?? this.settings.handedness;
    const menuX = handedness === 'right' ? right - 12 : left + 12;
    this.menuButton.setOrigin(handedness === 'right' ? 1 : 0, 0);
    this.menuButton.setPosition(menuX, top + 10);

    this.layoutPerfHud(safe);
  }

  private layoutNumberLabels() {
    const order = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    const seg = (Math.PI * 2) / 20;
    const radius = this.boardRadius * 1.035;
    const fontSize = Math.max(14, Math.round(this.boardRadius * 0.075));

    if (this.numberLabels.length === 0) {
      for (let i = 0; i < order.length; i += 1) {
        const label = this.add.text(0, 0, String(order[i]), {
          color: '#f4efe3',
          fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif",
          fontSize: `${fontSize}px`
        });
        label.setOrigin(0.5, 0.5);
        label.setDepth(3.5);
        this.numberLabels.push(label);
      }
    }

    for (let i = 0; i < order.length; i += 1) {
      const theta = (i + 0.5) * seg - Math.PI / 2;
      const x = this.boardCenterX + Math.cos(theta) * radius;
      const y = this.boardCenterY + Math.sin(theta) * radius;
      const label = this.numberLabels[i];
      label.setPosition(x, y);
      label.setFontSize(fontSize);
      label.setRotation(theta + Math.PI / 2);
    }
  }

  private isInsideBoard(x: number, y: number): boolean {
    const dx = x - this.boardCenterX;
    const dy = y - this.boardCenterY;
    return Math.hypot(dx, dy) <= this.boardRadius;
  }

  private clampToBoard(x: number, y: number): { x: number; y: number } {
    const dx = x - this.boardCenterX;
    const dy = y - this.boardCenterY;
    const radial = Math.hypot(dx, dy);
    const limit = this.boardRadius * 0.98;
    if (radial <= limit) return { x, y };
    const scale = limit / Math.max(0.001, radial);
    return { x: this.boardCenterX + dx * scale, y: this.boardCenterY + dy * scale };
  }

  private layoutPerfHud(safe: SafeInsets) {
    if (!this.perfText) return;
    this.perfText.setPosition(safe.left + 12, BASE_HEIGHT - safe.bottom - 22);
  }

  private getSafeInsetsScaled(): SafeInsets {
    const safePx = readSafeArea();
    const scale = computeScale();
    return {
      top: safePx.top / scale,
      right: safePx.right / scale,
      bottom: safePx.bottom / scale,
      left: safePx.left / scale
    };
  }

  private createBackground() {
    if (!this.textures.exists('throw-darts-bg')) {
      const canvas = this.textures.createCanvas('throw-darts-bg', 1280, 720);
      const ctx = canvas.context;
      const gradient = ctx.createLinearGradient(0, 0, 0, 720);
      gradient.addColorStop(0, '#101822');
      gradient.addColorStop(0.6, '#0b1118');
      gradient.addColorStop(1, '#06080c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1280, 720);
      canvas.refresh();
    }

    if (!this.textures.exists('throw-darts-vignette')) {
      const canvas = this.textures.createCanvas('throw-darts-vignette', 512, 512);
      const ctx = canvas.context;
      const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      canvas.refresh();
    }

    if (!this.textures.exists('throw-darts-spotlight')) {
      const canvas = this.textures.createCanvas('throw-darts-spotlight', 512, 512);
      const ctx = canvas.context;
      const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(255,240,220,0.45)');
      gradient.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      canvas.refresh();
    }

    if (!this.textures.exists('throw-darts-noise')) {
      const canvas = this.textures.createCanvas('throw-darts-noise', 64, 64);
      const ctx = canvas.context;
      const img = ctx.createImageData(64, 64);
      for (let i = 0; i < img.data.length; i += 4) {
        const value = 150 + Math.random() * 90;
        img.data[i] = value;
        img.data[i + 1] = value;
        img.data[i + 2] = value;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      canvas.refresh();
    }

    this.background = this.add.image(640, 360, 'throw-darts-bg').setDepth(-10);
    this.spotlight = this.add.image(640, 360, 'throw-darts-spotlight').setAlpha(0.9).setDepth(-2);
    this.vignette = this.add.image(640, 360, 'throw-darts-vignette').setAlpha(0.55).setDepth(1);

    this.background.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
    this.vignette.setDisplaySize(BASE_WIDTH, BASE_HEIGHT);
  }

  private buildDartPool() {
    if (!this.textures.exists('throw-darts-dart')) {
      const g = this.add.graphics();
      g.fillStyle(0xf1f5ff, 1);
      g.fillTriangle(8, 0, 16, 22, 0, 22);
      g.fillStyle(0x4b5563, 1);
      g.fillRect(6, 22, 4, 18);
      g.fillStyle(0x0f172a, 1);
      g.fillRect(5, 40, 6, 6);
      g.generateTexture('throw-darts-dart', 16, 46);
      g.destroy();
    }

    if (!this.textures.exists('throw-darts-dart-shadow')) {
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(8, 24, 12, 40);
      g.generateTexture('throw-darts-dart-shadow', 16, 46);
      g.destroy();
    }

    const max = this.tuning.maxStuckDarts;
    for (let i = 0; i < max; i += 1) {
      const shadow = this.add.image(0, 0, 'throw-darts-dart-shadow');
      const body = this.add.image(0, 0, 'throw-darts-dart');
      const container = this.add.container(0, 0, [shadow, body]);
      shadow.setPosition(0, 2);
      container.setDepth(4.5);
      container.setVisible(false);
      this.dartPool.push({ container, shadow, body });
    }
  }

  private spawnDart(x: number, y: number) {
    const dart = this.dartPool[this.dartCursor % this.dartPool.length];
    this.dartCursor = (this.dartCursor + 1) % this.dartPool.length;
    dart.container.setVisible(true);
    dart.container.setPosition(x, y);
    dart.container.setScale(0.8);
    return dart;
  }

  private clearDarts() {
    for (const dart of this.dartPool) {
      dart.container.setVisible(false);
    }
  }

  private updatePerfHud(fps: number, dtSec: number) {
    if (!this.showPerfHud) {
      this.perfText?.setVisible(false);
      return;
    }

    if (!this.perfText) {
      this.perfText = this.add.text(0, 0, '', { color: '#f8e9c8', fontFamily: "'Trebuchet MS','Avenir Next','Segoe UI',sans-serif", fontSize: '12px' });
      this.layoutPerfHud(this.getSafeInsetsScaled());
    }

    this.perfText.setVisible(true);
    const dpr = this.qualitySnapshot?.appliedDpr ?? window.devicePixelRatio;
    const vfx = this.qualitySnapshot?.vfxLevel ?? this.options?.vfxLevel ?? 'low';
    const ms = Math.round(1000 / Math.max(1, fps));
    this.perfText.setText(`FPS ${Math.round(fps)} | ${ms}ms | DPR ${dpr.toFixed(2)} | VFX ${vfx}`);

    if (Math.random() < dtSec * 0.5) {
      this.hooks.reportEvent({ type: 'telemetry', gameId: this.hooks.gameId, event: 'fps_sample', fps: Math.round(fps), dpr });
    }
  }

  private readPerfHudSetting(): boolean {
    try {
      const raw = window.localStorage.getItem('gamegrid.settings.v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { perfDiagnostics?: boolean };
      return Boolean(parsed?.perfDiagnostics);
    } catch {
      return false;
    }
  }

  private setMenuVisible(show: boolean) {
    this.menuContainer.setVisible(show);
    if (show) {
      this.toggleSettings(false);
      this.toggleHowTo(false);
      this.tutorialContainer.setVisible(false);
      this.refreshMenu();
    }
    this.audio?.play('ui');
  }

  private playCue(cue: 'throw' | 'board_hit' | 'wire' | 'bull' | 'bust' | 'win') {
    this.audio?.play(cue);
  }
}
