import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { triggerHaptic } from '../../systems/gameplayComfort';
import { createSeededRng, generateAiRelease } from './ai';
import { evaluateChallenge, loadBowlingChallenges, loadChallengeProgress, saveChallengeProgress } from './challenges';
import { beginSwipe, cancelSwipe, completeSwipe, createSwipeCapture, updateSwipe } from './input';
import { createBallFromRelease, createLaneModel, stepBall } from './physics';
import { countStandingPins, createRack, pinsSettled, resetRackToStanding, standingPinIds, stepPinPhysics } from './pins';
import { computeScoreCard } from './scoring';
import { applyClassicRoll, applyTimedBlitzRoll, createClassicState, createTimedBlitzState, tickTimedBlitz } from './rules';
import { BowlingVfxPool } from './vfx';
import type {
  BallState,
  BowlingChallenge,
  BowlingChallengeCatalog,
  BowlingDifficulty,
  BowlingMode,
  BowlingOptions,
  BowlingStats,
  BowlerSide,
  ChallengeProgress,
  ChallengeRuntimeStats,
  ClassicState,
  LaneModel,
  PinState,
  Sensitivity,
  TimedBlitzState
} from './types';

interface AlleyBowlingBlitzSceneConfig {
  hooks: GameRuntimeHooks;
}

type ScenePhase = 'menu' | 'playing' | 'ended';

interface StoredSettings {
  mode: BowlingMode;
  difficulty: BowlingDifficulty;
  spinAssist: boolean;
  showGuide: boolean;
  sensitivity: Sensitivity;
  vsAi: boolean;
  challengeIndex: number;
}

interface ClassicRuntime {
  player: ClassicState;
  ai: ClassicState;
  currentBowler: BowlerSide;
  playerStats: BowlingStats;
  aiStats: BowlingStats;
}

interface TimedRuntime {
  state: TimedBlitzState;
  stats: BowlingStats;
}

interface ChallengeRuntime {
  challenge: BowlingChallenge;
  state: ChallengeRuntimeStats;
  frameRoll: 1 | 2;
  firstRollPins: number;
  strikeRun: number;
  stats: BowlingStats;
}

const SETTINGS_KEY = 'gamegrid.alley-bowling-blitz.settings.v1';

const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'classic',
  difficulty: 'medium',
  spinAssist: true,
  showGuide: true,
  sensitivity: 'medium',
  vsAi: true,
  challengeIndex: 0
};

const MODE_ORDER: readonly BowlingMode[] = ['classic', 'timed_blitz', 'challenges'] as const;
const DIFFICULTY_ORDER: readonly BowlingDifficulty[] = ['easy', 'medium', 'hard'] as const;
const SENSITIVITY_ORDER: readonly Sensitivity[] = ['low', 'medium', 'high'] as const;

const FULL_PIN_SET = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function createEmptyStats(): BowlingStats {
  return {
    strikes: 0,
    spares: 0,
    gutters: 0,
    bestFrame: 0,
    pinsKnocked: 0
  };
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

function saveSettings(settings: StoredSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}

function modeLabel(mode: BowlingMode): string {
  if (mode === 'classic') return 'Classic 10 Frames';
  if (mode === 'timed_blitz') return 'Timed Blitz 60s';
  return 'Challenge Ladder';
}

function sensitivityLabel(value: Sensitivity): string {
  if (value === 'low') return 'Low';
  if (value === 'high') return 'High';
  return 'Medium';
}

function difficultyLabel(value: BowlingDifficulty): string {
  if (value === 'easy') return 'Easy';
  if (value === 'hard') return 'Hard';
  return 'Medium';
}

function boolLabel(value: boolean): string {
  return value ? 'On' : 'Off';
}

function frameComplete(before: ClassicState, after: ClassicState): boolean {
  if (after.ended) return true;
  return after.frame > before.frame;
}

function emitHaptic(pattern: number | number[]): void {
  triggerHaptic(pattern);
}

export class AlleyBowlingBlitzScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private readonly rng = createSeededRng(918273);

  private lane!: LaneModel;
  private ball: BallState | null = null;
  private pins: PinState[] = [];
  private standingPins: number[] = [...FULL_PIN_SET];

  private settings: StoredSettings = loadSettings();
  private options: BowlingOptions = {
    spinAssist: this.settings.spinAssist,
    showGuide: this.settings.showGuide,
    sensitivity: this.settings.sensitivity,
    vsAi: this.settings.vsAi
  };

  private phase: ScenePhase = 'menu';
  private fatal = false;
  private localPaused = false;
  private matchStartMs = 0;
  private aiDelayMs = 0;

  private menuContainer!: Phaser.GameObjects.Container;
  private menuRows: Phaser.GameObjects.Text[] = [];
  private endContainer!: Phaser.GameObjects.Container;
  private endSummary!: Phaser.GameObjects.Text;

  private laneGfx!: Phaser.GameObjects.Graphics;
  private guideGfx!: Phaser.GameObjects.Graphics;
  private vfxGfx!: Phaser.GameObjects.Graphics;
  private hudTop!: Phaser.GameObjects.Text;
  private hudSub!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  private ballSprite!: Phaser.GameObjects.Arc;
  private pinSprites = new Map<number, Phaser.GameObjects.Rectangle>();
  private pinFallState = new Map<number, boolean>();
  private ballTrail: Array<{ x: number; y: number; life: number }> = [];
  private vfxPool = new BowlingVfxPool();

  private swipe = createSwipeCapture();
  private pointerX = 640;
  private pointerY = 620;

  private challengeCatalog: BowlingChallengeCatalog = { challenges: [] };
  private challengeProgress: ChallengeProgress = { completed: {} };

  private classic: ClassicRuntime | null = null;
  private timed: TimedRuntime | null = null;
  private challenge: ChallengeRuntime | null = null;

  private accumulator = 0;

  constructor(config: AlleyBowlingBlitzSceneConfig) {
    super('alley-bowling-blitz-main');
    this.hooks = config.hooks;
  }

  create(): void {
    this.lane = createLaneModel(1280, 720);
    this.challengeCatalog = loadBowlingChallenges();
    this.challengeProgress = loadChallengeProgress();

    this.createVisuals();
    this.createMenu();
    this.createEndScreen();
    this.bindInput();

    this.showMenu();
  }

  update(_time: number, deltaMs: number): void {
    if (this.fatal) return;

    try {
      if (this.phase !== 'playing' || this.localPaused) {
        this.renderGuides();
        return;
      }

      const dt = Math.min(0.04, deltaMs / 1000);
      this.accumulator += dt;
      const fixedDt = 1 / 120;
      while (this.accumulator >= fixedDt) {
        this.fixedStep(fixedDt);
        this.accumulator -= fixedDt;
      }

      this.renderGuides();
      this.vfxPool.update(deltaMs);
      this.renderVfx();
      this.renderHud();
    } catch (error) {
      this.fatal = true;
      const message = error instanceof Error ? error.message : 'Alley Bowling Blitz runtime error';
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
      this.messageText.setText(`Error: ${message}`);
    }
  }

  private fixedStep(dt: number): void {
    if (this.settings.mode === 'timed_blitz' && this.timed) {
      this.timed.state = tickTimedBlitz(this.timed.state, dt * 1000);
      if (this.timed.state.ended && this.ball === null) {
        this.finishMatch();
        return;
      }
    }

    if (this.ball) {
      stepBall(this.ball, this.lane, dt);
      if (!this.ball.inGutter) {
        stepPinPhysics(this.pins, this.ball, dt);
      }
      this.syncSprites();

      if (this.ball.finished && pinsSettled(this.pins)) {
        this.resolveRoll();
      }
      return;
    }

    if (this.settings.mode === 'classic' && this.classic && this.classic.currentBowler === 'ai') {
      this.aiDelayMs -= dt * 1000;
      if (this.aiDelayMs <= 0) {
        const release = generateAiRelease(this.lane, this.settings.difficulty, this.rng);
        this.releaseBall(release.startX, release.startY, release.angle, release.speed, release.spin);
      }
    }
  }

  private createVisuals(): void {
    this.laneGfx = this.add.graphics();
    this.guideGfx = this.add.graphics();
    this.vfxGfx = this.add.graphics();

    this.ballSprite = this.add.circle(640, 650, 14, 0x0f1c2f).setStrokeStyle(2, 0xb8d6f8).setVisible(false);

    const rack = createRack((this.lane.left + this.lane.right) * 0.5, this.lane.pinDeckY + 18);
    for (let i = 0; i < rack.length; i += 1) {
      const pin = rack[i];
      const sprite = this.add.rectangle(pin.x, pin.y, 14, 28, 0xf7f5ef).setStrokeStyle(2, 0xba3d3d).setVisible(false);
      this.pinSprites.set(pin.id, sprite);
      this.pinFallState.set(pin.id, false);
    }

    this.hudTop = this.add.text(28, 18, '', { fontFamily: 'Verdana', fontSize: '24px', color: '#ffffff' }).setDepth(10);
    this.hudSub = this.add.text(28, 48, '', { fontFamily: 'Verdana', fontSize: '18px', color: '#d6e8ff' }).setDepth(10);
    this.messageText = this.add
      .text(28, 674, 'Drag from the bottom toward the pins to roll.', {
        fontFamily: 'Verdana',
        fontSize: '17px',
        color: '#ffe4b6'
      })
      .setDepth(10);

    this.pauseButton = this.add
      .text(1170, 18, 'Pause', { fontFamily: 'Verdana', fontSize: '24px', color: '#d3f9c6' })
      .setDepth(10)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.localPaused = !this.localPaused;
        this.pauseButton.setText(this.localPaused ? 'Resume' : 'Pause');
      });

    this.drawLane();
  }

  private drawLane(): void {
    const lane = this.lane;
    this.laneGfx.clear();

    this.laneGfx.fillStyle(0x1a2437, 1);
    this.laneGfx.fillRect(0, 0, 1280, 720);

    this.laneGfx.fillGradientStyle(0x4c3420, 0x4c3420, 0x2f1c10, 0x2f1c10, 1);
    this.laneGfx.fillRect(lane.left - lane.gutterWidth, lane.top, lane.gutterWidth, lane.bottom - lane.top);
    this.laneGfx.fillRect(lane.right, lane.top, lane.gutterWidth, lane.bottom - lane.top);

    this.laneGfx.fillStyle(0x47321d, 1);
    this.laneGfx.fillRect(lane.left - lane.gutterWidth, lane.top, lane.gutterWidth, lane.bottom - lane.top);
    this.laneGfx.fillRect(lane.right, lane.top, lane.gutterWidth, lane.bottom - lane.top);

    this.laneGfx.fillGradientStyle(0xc79a5c, 0xc79a5c, 0xb27e42, 0xb27e42, 1);
    this.laneGfx.fillRect(lane.left, lane.top, lane.right - lane.left, lane.bottom - lane.top);

    this.laneGfx.lineStyle(2, 0xf2dbad, 0.8);
    this.laneGfx.strokeRect(lane.left, lane.top, lane.right - lane.left, lane.bottom - lane.top);

    this.laneGfx.fillStyle(0x8f693c, 1);
    this.laneGfx.fillRect(lane.left, lane.pinDeckY - 28, lane.right - lane.left, 34);

    this.laneGfx.lineStyle(2, 0xfff2d4, 0.35);
    const arrowY = lane.pinDeckY + 90;
    for (let i = 0; i < 6; i += 1) {
      const x = lane.left + 40 + i * 60;
      this.laneGfx.strokeTriangle(x, arrowY, x - 6, arrowY + 12, x + 6, arrowY + 12);
    }
  }

  private createMenu(): void {
    this.menuContainer = this.add.container(640, 360).setDepth(40);
    const panel = this.add.rectangle(0, 0, 760, 550, 0x08131f, 0.95).setStrokeStyle(2, 0x336087);
    const title = this.add
      .text(0, -235, 'Alley Bowling Blitz', { fontFamily: 'Verdana', fontSize: '52px', color: '#ffffff' })
      .setOrigin(0.5);

    this.menuContainer.add([panel, title]);

    for (let i = 0; i < 9; i += 1) {
      const row = this.add
        .text(-320, -170 + i * 48, '', { fontFamily: 'Verdana', fontSize: '25px', color: '#d8ecff' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.handleMenuRow(i));
      this.menuRows.push(row);
      this.menuContainer.add(row);
    }
  }

  private createEndScreen(): void {
    this.endContainer = this.add.container(640, 360).setDepth(45).setVisible(false);
    const panel = this.add.rectangle(0, 0, 740, 470, 0x0a1018, 0.94).setStrokeStyle(2, 0x6ca56f);
    this.endSummary = this.add
      .text(0, -145, '', { fontFamily: 'Verdana', fontSize: '24px', color: '#ffffff', align: 'center' })
      .setOrigin(0.5, 0);

    const rematch = this.add
      .text(0, 90, 'Rematch', { fontFamily: 'Verdana', fontSize: '28px', color: '#d6f6b5' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startMatch());

    const settings = this.add
      .text(0, 136, 'Change Settings', { fontFamily: 'Verdana', fontSize: '26px', color: '#c4defe' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showMenu());

    const lobby = this.add
      .text(0, 180, 'Back to Lobby', { fontFamily: 'Verdana', fontSize: '26px', color: '#f9d4b7' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.endContainer.add([panel, this.endSummary, rematch, settings, lobby]);
  }

  private bindInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pointerX = pointer.x;
      this.pointerY = pointer.y;
      if (!this.canPlayerThrow()) return;
      if (pointer.y < this.lane.bottom - 190) return;
      beginSwipe(this.swipe, pointer.x, pointer.y, pointer.event.timeStamp);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.pointerX = pointer.x;
      this.pointerY = pointer.y;
      if (!this.swipe.active) return;
      updateSwipe(this.swipe, pointer.x, pointer.y, pointer.event.timeStamp);
    });

    this.input.on('pointerup', () => {
      if (!this.canPlayerThrow() || !this.swipe.active) {
        cancelSwipe(this.swipe);
        return;
      }

      const release = completeSwipe(
        this.swipe,
        this.options.sensitivity,
        this.options.spinAssist,
        (this.lane.left + this.lane.right) * 0.5,
        this.lane.bottom - 6
      );

      if (!release) return;
      this.releaseBall(release.startX, release.startY, release.angle, release.speed, release.spin);
    });
  }

  private canPlayerThrow(): boolean {
    if (this.phase !== 'playing' || this.ball !== null || this.localPaused) return false;
    if (this.settings.mode === 'classic') {
      return this.classic !== null && this.classic.currentBowler === 'player';
    }
    return true;
  }

  private handleMenuRow(index: number): void {
    switch (index) {
      case 0:
        this.settings.mode = MODE_ORDER[(MODE_ORDER.indexOf(this.settings.mode) + 1) % MODE_ORDER.length];
        break;
      case 1:
        this.settings.vsAi = !this.settings.vsAi;
        break;
      case 2:
        this.settings.difficulty = DIFFICULTY_ORDER[(DIFFICULTY_ORDER.indexOf(this.settings.difficulty) + 1) % DIFFICULTY_ORDER.length];
        break;
      case 3:
        this.settings.spinAssist = !this.settings.spinAssist;
        break;
      case 4:
        this.settings.showGuide = !this.settings.showGuide;
        break;
      case 5:
        this.settings.sensitivity =
          SENSITIVITY_ORDER[(SENSITIVITY_ORDER.indexOf(this.settings.sensitivity) + 1) % SENSITIVITY_ORDER.length];
        break;
      case 6:
        if (this.challengeCatalog.challenges.length > 0) {
          this.settings.challengeIndex = (this.settings.challengeIndex + 1) % this.challengeCatalog.challenges.length;
        }
        break;
      case 7:
        this.startMatch();
        return;
      case 8:
        this.hooks.backToLobby();
        return;
      default:
        break;
    }

    this.options = {
      spinAssist: this.settings.spinAssist,
      showGuide: this.settings.showGuide,
      sensitivity: this.settings.sensitivity,
      vsAi: this.settings.vsAi
    };
    saveSettings(this.settings);
    this.renderMenuRows();
  }

  private showMenu(): void {
    this.phase = 'menu';
    this.menuContainer.setVisible(true);
    this.endContainer.setVisible(false);
    this.hudTop.setVisible(false);
    this.hudSub.setVisible(false);
    this.pauseButton.setVisible(false);
    this.ballSprite.setVisible(false);
    this.messageText.setText('Set your mode, then swipe from the bottom to bowl.');
    this.clearPins();
    this.ball = null;
    this.renderMenuRows();
  }

  private renderMenuRows(): void {
    const challenge = this.challengeCatalog.challenges[this.settings.challengeIndex];
    this.menuRows[0].setText(`Mode: ${modeLabel(this.settings.mode)}`);
    this.menuRows[1].setText(`Vs AI (Classic): ${boolLabel(this.settings.vsAi)}`);
    this.menuRows[2].setText(`Difficulty: ${difficultyLabel(this.settings.difficulty)}`);
    this.menuRows[3].setText(`Spin Assist: ${boolLabel(this.settings.spinAssist)}`);
    this.menuRows[4].setText(`Show Guide: ${boolLabel(this.settings.showGuide)}`);
    this.menuRows[5].setText(`Sensitivity: ${sensitivityLabel(this.settings.sensitivity)}`);
    this.menuRows[6].setText(`Challenge: ${challenge ? challenge.name : 'Unavailable'}`);
    this.menuRows[7].setText('Start Match');
    this.menuRows[8].setText('Back to Lobby');

    this.menuRows[6].setColor(this.settings.mode === 'challenges' ? '#f9e89d' : '#8ca1b8');
  }

  private startMatch(): void {
    this.phase = 'playing';
    this.menuContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.hudTop.setVisible(true);
    this.hudSub.setVisible(true);
    this.pauseButton.setVisible(true);
    this.pauseButton.setText('Pause');
    this.localPaused = false;
    this.matchStartMs = this.time.now;

    this.classic = null;
    this.timed = null;
    this.challenge = null;

    if (this.settings.mode === 'classic') {
      this.classic = {
        player: createClassicState(),
        ai: createClassicState(),
        currentBowler: 'player',
        playerStats: createEmptyStats(),
        aiStats: createEmptyStats()
      };
      this.standingPins = [...FULL_PIN_SET];
    } else if (this.settings.mode === 'timed_blitz') {
      this.timed = {
        state: createTimedBlitzState(60_000),
        stats: createEmptyStats()
      };
      this.standingPins = [...FULL_PIN_SET];
    } else {
      const selected = this.challengeCatalog.challenges[this.settings.challengeIndex] ?? this.challengeCatalog.challenges[0];
      if (!selected) {
        throw new Error('Challenge catalog is empty.');
      }
      this.challenge = {
        challenge: selected,
        frameRoll: 1,
        firstRollPins: 0,
        strikeRun: 0,
        state: {
          rollsUsed: 0,
          strikeStreakMax: 0,
          sparesInWindow: 0,
          totalPinsKnocked: 0,
          score: 0,
          splitConverted: {
            '7-10': 0,
            bucket: 0
          }
        },
        stats: createEmptyStats()
      };
      this.standingPins = selected.startingPins.slice();
    }

    this.preparePinsForNextRoll();
    this.messageText.setText('Swipe up with curve to add hook.');

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      options: {
        spinAssist: this.settings.spinAssist,
        showGuide: this.settings.showGuide,
        sensitivity: this.settings.sensitivity,
        vsAi: this.settings.vsAi
      }
    });

    this.renderHud();
  }

  private preparePinsForNextRoll(): void {
    const centerX = (this.lane.left + this.lane.right) * 0.5;
    const frontY = this.lane.pinDeckY + 18;

    if (this.pins.length === 0) {
      this.pins = createRack(centerX, frontY);
    }

    resetRackToStanding(this.pins, this.standingPins, centerX, frontY);
    this.syncSprites();
  }

  private clearPins(): void {
    for (let i = 0; i < this.pins.length; i += 1) {
      this.pins[i].active = false;
    }
    this.syncSprites();
  }

  private releaseBall(startX: number, startY: number, angle: number, speed: number, spin: number): void {
    const releaseY = Math.max(startY, this.lane.bottom - 20);
    this.ball = createBallFromRelease({ startX, startY: releaseY, angle, speed, spin }, this.lane);
    this.ballSprite.setVisible(true);
    this.ballSprite.setPosition(this.ball.x, this.ball.y);
    emitHaptic(8);
    this.playCue('roll');
  }

  private resolveRoll(): void {
    if (!this.ball) return;

    const beforeCount = this.standingPins.length;
    const afterIds = this.ball.inGutter ? this.standingPins.slice() : standingPinIds(this.pins);
    const knocked = Math.max(0, beforeCount - afterIds.length);
    const gutter = this.ball.inGutter;

    this.ball = null;
    this.ballSprite.setVisible(false);

    if (gutter) {
      this.playCue('gutter');
    } else if (knocked > 0) {
      this.playCue('pin-hit');
    }

    if (!gutter && knocked >= 8) {
      this.cameras.main.shake(120, 0.004);
      this.vfxPool.emitStrikeBurst(this.lane.left + (this.lane.right - this.lane.left) * 0.5, this.lane.pinDeckY + 10);
    } else if (knocked > 0) {
      this.cameras.main.shake(80, 0.0025);
    }

    if (this.settings.mode === 'classic' && this.classic) {
      this.resolveClassicRoll(knocked, gutter, afterIds);
    } else if (this.settings.mode === 'timed_blitz' && this.timed) {
      this.resolveTimedRoll(knocked, gutter, afterIds);
    } else if (this.challenge) {
      this.resolveChallengeRoll(knocked, gutter, afterIds);
    }

    this.renderHud();
  }

  private resolveClassicRoll(knocked: number, gutter: boolean, afterIds: number[]): void {
    if (!this.classic) return;

    const current = this.classic.currentBowler;
    const before = current === 'player' ? this.classic.player : this.classic.ai;
    const applied = applyClassicRoll(before, knocked, gutter);

    if (current === 'player') {
      this.classic.player = applied.state;
      this.updateStats(this.classic.playerStats, applied.outcome, this.classic.player.rolls);
    } else {
      this.classic.ai = applied.state;
      this.updateStats(this.classic.aiStats, applied.outcome, this.classic.ai.rolls);
    }

    const completedFrame = frameComplete(before, applied.state);
    if (completedFrame) {
      this.standingPins = [...FULL_PIN_SET];

      if (this.settings.vsAi && !this.classic.player.ended && !this.classic.ai.ended) {
        this.classic.currentBowler = current === 'player' ? 'ai' : 'player';
      } else if (this.settings.vsAi) {
        this.classic.currentBowler = this.classic.player.ended ? 'ai' : 'player';
      }

      if (this.classic.currentBowler === 'ai') {
        this.aiDelayMs = 520;
      }
    } else {
      this.standingPins = afterIds;
    }

    if (this.classic.player.ended && (!this.settings.vsAi || this.classic.ai.ended)) {
      this.finishMatch();
      return;
    }

    if (this.standingPins.length === 0) {
      this.standingPins = [...FULL_PIN_SET];
    }
    this.preparePinsForNextRoll();
  }

  private resolveTimedRoll(knocked: number, gutter: boolean, afterIds: number[]): void {
    if (!this.timed) return;

    const applied = applyTimedBlitzRoll(this.timed.state, knocked, gutter);
    this.timed.state = applied.state;
    this.updateStats(this.timed.stats, applied.outcome, []);

    if (this.timed.state.rollInRack === 1) {
      this.standingPins = [...FULL_PIN_SET];
    } else {
      this.standingPins = afterIds.length > 0 ? afterIds : [...FULL_PIN_SET];
    }

    this.preparePinsForNextRoll();

    if (this.timed.state.ended) {
      this.finishMatch();
    }
  }

  private resolveChallengeRoll(knocked: number, gutter: boolean, afterIds: number[]): void {
    if (!this.challenge) return;

    const runtime = this.challenge;
    const challenge = runtime.challenge;
    runtime.state.rollsUsed += 1;
    runtime.state.totalPinsKnocked += knocked;
    runtime.state.score += knocked;

    const strike = runtime.frameRoll === 1 && knocked === 10;

    if (strike) {
      runtime.state.score += 5;
      runtime.strikeRun += 1;
      runtime.state.strikeStreakMax = Math.max(runtime.state.strikeStreakMax, runtime.strikeRun);
      runtime.frameRoll = 1;
      runtime.firstRollPins = 0;
      runtime.stats.strikes += 1;
      this.playCue('strike');
    } else if (runtime.frameRoll === 1) {
      runtime.strikeRun = 0;
      runtime.frameRoll = 2;
      runtime.firstRollPins = knocked;
    } else {
      runtime.strikeRun = 0;
      if (runtime.firstRollPins + knocked === 10) {
        runtime.state.sparesInWindow += 1;
        runtime.state.score += 2;
        runtime.stats.spares += 1;
        this.playCue('spare');
      }
      runtime.frameRoll = 1;
      runtime.firstRollPins = 0;
    }

    if (gutter) runtime.stats.gutters += 1;
    runtime.stats.pinsKnocked += knocked;

    if (challenge.goal.type === 'split_convert') {
      const target = challenge.goal.split;
      const cleared = knocked >= challenge.startingPins.length && afterIds.length === 0;
      if (cleared) runtime.state.splitConverted[target] += 1;
    }

    const evalResult = evaluateChallenge(challenge, runtime.state);
    if (evalResult.passed) {
      this.challengeProgress.completed[challenge.id] = true;
      saveChallengeProgress(this.challengeProgress);
      this.finishMatch();
      return;
    }

    if (evalResult.failed) {
      this.finishMatch();
      return;
    }

    if (challenge.startingPins.length === 10) {
      this.standingPins = runtime.frameRoll === 1 ? [...FULL_PIN_SET] : afterIds;
    } else {
      this.standingPins = challenge.startingPins.slice();
      runtime.frameRoll = 1;
      runtime.firstRollPins = 0;
    }

    this.preparePinsForNextRoll();
  }

  private updateStats(stats: BowlingStats, outcome: { pinsKnocked: number; isStrike: boolean; isSpare: boolean; isGutter: boolean }, rolls: readonly number[]): void {
    stats.pinsKnocked += outcome.pinsKnocked;
    if (outcome.isStrike) {
      stats.strikes += 1;
      this.playCue('strike');
      emitHaptic([10, 20, 22]);
    }
    if (outcome.isSpare) {
      stats.spares += 1;
      this.playCue('spare');
      emitHaptic(16);
    }
    if (outcome.isGutter) stats.gutters += 1;

    if (rolls.length > 0) {
      const card = computeScoreCard(rolls);
      let best = 0;
      for (let i = 0; i < card.frames.length; i += 1) {
        if (card.frames[i].total > best) best = card.frames[i].total;
      }
      stats.bestFrame = Math.max(stats.bestFrame, best);
    }
  }

  private finishMatch(): void {
    this.phase = 'ended';
    this.endContainer.setVisible(true);
    this.localPaused = false;
    this.pauseButton.setVisible(false);
    this.ball = null;
    this.ballSprite.setVisible(false);

    const durationMs = Math.max(0, Math.floor(this.time.now - this.matchStartMs));

    let finalScore = 0;
    let stats = createEmptyStats();
    let aiScore: number | undefined;

    if (this.classic) {
      const playerCard = computeScoreCard(this.classic.player.rolls);
      finalScore = playerCard.total;
      stats = this.classic.playerStats;
      aiScore = this.settings.vsAi ? computeScoreCard(this.classic.ai.rolls).total : undefined;
    } else if (this.timed) {
      finalScore = this.timed.state.score;
      stats = this.timed.stats;
    } else if (this.challenge) {
      finalScore = this.challenge.state.score;
      stats = this.challenge.stats;
    }

    const summary = [`Final Score: ${finalScore}`];
    if (typeof aiScore === 'number') summary.push(`AI Score: ${aiScore}`);
    summary.push(`Strikes: ${stats.strikes}  Spares: ${stats.spares}`);
    summary.push(`Best Frame: ${stats.bestFrame}  Gutters: ${stats.gutters}`);

    if (this.settings.mode === 'timed_blitz') {
      summary.push('Timed Blitz scoring: pins + strike bonuses (+5, streak chain) + spare bonus (+2).');
    }

    if (this.settings.mode === 'challenges' && this.challenge) {
      const completed = this.challengeProgress.completed[this.challenge.challenge.id] === true;
      summary.push(completed ? 'Challenge Complete!' : 'Challenge Failed.');
    }

    this.endSummary.setText(summary.join('\n'));

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      score: finalScore,
      finalScore,
      stats,
      durationMs,
      ...(typeof aiScore === 'number' ? { aiScore } : {})
    });
  }

  private renderHud(): void {
    if (this.phase !== 'playing') return;

    if (this.settings.mode === 'classic' && this.classic) {
      const playerScore = computeScoreCard(this.classic.player.rolls).total;
      const aiScore = computeScoreCard(this.classic.ai.rolls).total;
      const actor = this.classic.currentBowler === 'player' ? 'You' : 'AI';
      const currentState = this.classic.currentBowler === 'player' ? this.classic.player : this.classic.ai;
      this.hudTop.setText(
        `Classic | ${actor} Frame ${currentState.frame} Roll ${currentState.rollInFrame} | Pins Standing ${countStandingPins(this.pins)}`
      );
      this.hudSub.setText(`You ${playerScore}  AI ${aiScore}  |  Difficulty ${difficultyLabel(this.settings.difficulty)}`);
      return;
    }

    if (this.settings.mode === 'timed_blitz' && this.timed) {
      const sec = Math.ceil(this.timed.state.timeRemainingMs / 1000);
      this.hudTop.setText(`Timed Blitz | Time ${sec}s | Pins Standing ${countStandingPins(this.pins)}`);
      this.hudSub.setText(`Score ${this.timed.state.score} | Rolls ${this.timed.state.rolls} | Strike Streak ${this.timed.state.strikeStreak}`);
      return;
    }

    if (this.challenge) {
      const challenge = this.challenge.challenge;
      const progress = evaluateChallenge(challenge, this.challenge.state);
      this.hudTop.setText(`Challenge: ${challenge.name} | Rolls ${this.challenge.state.rollsUsed}/${challenge.rollLimit}`);
      this.hudSub.setText(`Score ${this.challenge.state.score} | Pins ${this.challenge.state.totalPinsKnocked} | Goal Met ${progress.passed}`);
    }
  }

  private renderGuides(): void {
    this.guideGfx.clear();
    if (!this.options.showGuide || this.phase !== 'playing') return;

    const laneCenter = (this.lane.left + this.lane.right) * 0.5;

    this.guideGfx.fillStyle(0xffffff, 0.08);
    this.guideGfx.fillRect(this.lane.left, this.lane.top, this.lane.right - this.lane.left, (this.lane.bottom - this.lane.top) * this.lane.oilBreakProgress);
    this.guideGfx.fillStyle(0x396fa3, 0.1);
    this.guideGfx.fillRect(
      this.lane.left,
      this.lane.top + (this.lane.bottom - this.lane.top) * this.lane.oilBreakProgress,
      this.lane.right - this.lane.left,
      (this.lane.bottom - this.lane.top) * (1 - this.lane.oilBreakProgress)
    );

    this.guideGfx.lineStyle(2, 0xd9f2ff, 0.65);
    this.guideGfx.lineBetween(laneCenter, this.lane.bottom - 22, laneCenter, this.lane.pinDeckY - 8);

    if (this.swipe.active && this.swipe.count > 0) {
      this.guideGfx.lineStyle(3, 0xfff2c6, 0.88);
      const startX = this.swipe.xs[0];
      const startY = this.swipe.ys[0];
      this.guideGfx.lineBetween(startX, startY, this.pointerX, this.pointerY);
      this.guideGfx.fillStyle(0xfff2c6, 0.9);
      this.guideGfx.fillTriangle(
        this.pointerX,
        this.pointerY - 12,
        this.pointerX - 6,
        this.pointerY + 4,
        this.pointerX + 6,
        this.pointerY + 4
      );
    }
  }

  private syncSprites(): void {
    for (let i = 0; i < this.pins.length; i += 1) {
      const pin = this.pins[i];
      const sprite = this.pinSprites.get(pin.id);
      if (!sprite) continue;
      sprite.setVisible(pin.active);
      if (!pin.active) continue;
      sprite.setPosition(pin.x, pin.y);
      sprite.setRotation(pin.angle);
      sprite.setAlpha(pin.fallen ? 0.7 : 1);

      const previous = this.pinFallState.get(pin.id) ?? false;
      if (pin.fallen && !previous) {
        this.vfxPool.emitImpact(pin.x, pin.y, pin.y < this.lane.pinDeckY + 40);
        this.pinFallState.set(pin.id, true);
      }
      if (!pin.fallen && previous) {
        this.pinFallState.set(pin.id, false);
      }
    }

    if (this.ball) {
      this.ballSprite.setPosition(this.ball.x, this.ball.y);
      this.ballSprite.setVisible(true);
      this.ballTrail.push({ x: this.ball.x, y: this.ball.y, life: 1 });
      if (this.ballTrail.length > 18) this.ballTrail.shift();
    } else {
      this.ballTrail = [];
    }
  }

  private renderVfx(): void {
    this.vfxGfx.clear();
    for (let i = this.ballTrail.length - 1; i >= 0; i -= 1) {
      const trail = this.ballTrail[i];
      trail.life -= 0.05;
      if (trail.life <= 0) {
        this.ballTrail.splice(i, 1);
        continue;
      }
      const alpha = Math.max(0, trail.life);
      this.vfxGfx.fillStyle(0xb8d6f8, 0.18 * alpha);
      this.vfxGfx.fillCircle(trail.x, trail.y, 6 * alpha);
    }
    this.vfxPool.render(this.vfxGfx);
  }

  private playCue(kind: 'roll' | 'pin-hit' | 'strike' | 'spare' | 'gutter'): void {
    if (this.sound.mute) return;
    const contextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!contextCtor) return;

    try {
      const context = new contextCtor();
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.connect(gain);
      gain.connect(context.destination);

      const now = context.currentTime;
      const frequency = kind === 'roll' ? 180 : kind === 'pin-hit' ? 420 : kind === 'strike' ? 680 : kind === 'spare' ? 560 : 140;
      const duration = kind === 'strike' ? 0.16 : 0.08;

      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.start(now);
      osc.stop(now + duration + 0.01);
      osc.onended = () => {
        void context.close();
      };
    } catch {
      // no-op
    }
  }
}
