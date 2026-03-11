import Phaser from 'phaser';
import { triggerHaptic } from '../../systems/gameplayComfort';
import type { GameRuntimeHooks } from '../../game/modules';
import { planAiShot } from './ai';
import { beginAim, cancelAim, createAimState, createSpinState, endAim, setSpinFromWidget, updateAim } from './input';
import { anyBallMoving, createPhysicsScratch, createPoolTableGeometry, estimateGhostBallTarget, firstActiveBallNumber, placeCueBall, stepPoolPhysics, strikeCueBall, activeBallNumbers } from './physics';
import { createRack, resetVelocities } from './rack';
import { createRuleState, resolveShot } from './rules';
import { evaluateTrickShotSuccess, loadTrickShotCatalog, loadTrickShotProgress, saveTrickShotProgress } from './trickshots';
import type { AIDifficulty, MatchSetup, MatchStats, PoolBall, PoolMode, PoolVariant, RuleState, TrickShotCatalog, TrickShotDefinition } from './types';

interface PoolSceneConfig {
  hooks: GameRuntimeHooks;
}

type ScenePhase = 'menu' | 'playing' | 'ended';

interface StoredSettings {
  mode: PoolMode;
  opponent: MatchSetup['opponent'];
  difficulty: AIDifficulty;
  ghostBall: boolean;
  spinControl: boolean;
  strictRules: boolean;
  shotTimerEnabled: boolean;
  shotTimerSec: number;
  trickShotIndex: number;
}

interface ShotTracker {
  active: boolean;
  firstObjectHit: number | null;
  lowestBallBeforeShot: number | null;
  railAfterContact: boolean;
  cuePocketed: boolean;
  pocketed: number[];
}

const SETTINGS_KEY = 'gamegrid.pool.settings.v1';

const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'eight_ball',
  opponent: 'vs_ai',
  difficulty: 'medium',
  ghostBall: true,
  spinControl: true,
  strictRules: false,
  shotTimerEnabled: false,
  shotTimerSec: 25,
  trickShotIndex: 0
};

const MODE_ORDER: readonly PoolMode[] = ['eight_ball', 'nine_ball', 'trick_shots', 'practice'] as const;
const OPP_ORDER: readonly MatchSetup['opponent'][] = ['vs_ai', 'hotseat'] as const;
const DIFF_ORDER: readonly AIDifficulty[] = ['easy', 'medium', 'hard'] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function modeLabel(mode: PoolMode): string {
  if (mode === 'eight_ball') return '8-Ball';
  if (mode === 'nine_ball') return '9-Ball';
  if (mode === 'trick_shots') return 'Trick Shots';
  return 'Practice';
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

function saveSettings(value: StoredSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // no-op
  }
}


export class PoolScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;
  private table = createPoolTableGeometry();
  private readonly physicsScratch = createPhysicsScratch();
  private balls: PoolBall[] = [];
  private rules: RuleState = createRuleState('eight_ball');
  private stats: MatchStats = { shots: [0, 0], pots: [0, 0], fouls: [0, 0] };
  private settings = loadSettings();
  private setup: MatchSetup = {
    mode: this.settings.mode,
    opponent: this.settings.opponent,
    difficulty: this.settings.difficulty,
    options: {
      ghostBall: this.settings.ghostBall,
      spinControl: this.settings.spinControl,
      strictRules: this.settings.strictRules,
      shotTimerEnabled: this.settings.shotTimerEnabled,
      shotTimerSec: this.settings.shotTimerSec
    },
    trickShotId: null
  };

  private phase: ScenePhase = 'menu';
  private accumulator = 0;
  private fatal = false;
  private message = 'Set up your match and break.';
  private shotTimerMs = 0;
  private aiThinkMs = 0;
  private trickCatalog: TrickShotCatalog = { shots: [] };
  private trickProgress = loadTrickShotProgress();
  private trickAttempts = 0;
  private trickCurrent: TrickShotDefinition | null = null;
  private lastShotUsedSpin = false;

  private readonly shot: ShotTracker = {
    active: false,
    firstObjectHit: null,
    lowestBallBeforeShot: null,
    railAfterContact: false,
    cuePocketed: false,
    pocketed: []
  };

  private readonly aim = createAimState();
  private readonly spin = createSpinState();
  private pointerDownX = 0;
  private pointerDownY = 0;
  private draggingCue = false;

  private menuContainer!: Phaser.GameObjects.Container;
  private menuRows: Phaser.GameObjects.Text[] = [];
  private endContainer!: Phaser.GameObjects.Container;
  private endSummary!: Phaser.GameObjects.Text;
  private endButtons: Phaser.GameObjects.Text[] = [];

  private tableGfx!: Phaser.GameObjects.Graphics;
  private aimGfx!: Phaser.GameObjects.Graphics;
  private spinGfx!: Phaser.GameObjects.Graphics;
  private ballSprites = new Map<number, Phaser.GameObjects.Arc>();

  private hudTop!: Phaser.GameObjects.Text;
  private hudMsg!: Phaser.GameObjects.Text;
  private hudPowerLabel!: Phaser.GameObjects.Text;
  private hudTimer!: Phaser.GameObjects.Text;
  private hudTrick!: Phaser.GameObjects.Text;
  private resetRackButton!: Phaser.GameObjects.Text;

  constructor(config: PoolSceneConfig) {
    super('pool-main');
    this.hooks = config.hooks;
  }

  create(): void {
    this.trickCatalog = loadTrickShotCatalog();
    this.createVisuals();
    this.createMenu();
    this.createEndScreen();
    this.bindInput();
    this.showMenu();
  }

  update(_time: number, deltaMs: number): void {
    if (this.fatal) return;

    try {
      const dt = Math.min(0.04, deltaMs / 1000);
      this.accumulator += dt;
      const fixed = 1 / 120;
      while (this.accumulator >= fixed) {
        this.fixedStep(fixed);
        this.accumulator -= fixed;
      }
      this.renderTable();
      this.renderHud();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pool runtime error';
      this.fatal = true;
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private fixedStep(dt: number): void {
    if (this.phase !== 'playing') return;

    if (this.setup.options.shotTimerEnabled && !this.shot.active && !this.isAiTurn()) {
      this.shotTimerMs -= dt * 1000;
      if (this.shotTimerMs <= 0) {
        this.message = 'Shot clock foul. Ball in hand.';
        this.stats.fouls[this.rules.currentPlayer] += 1;
        this.rules = {
          ...this.rules,
          currentPlayer: this.rules.currentPlayer === 0 ? 1 : 0,
          ballInHand: true
        };
        this.shotTimerMs = this.setup.options.shotTimerSec * 1000;
      }
    }

    if (this.shot.active) {
      const result = stepPoolPhysics(this.balls, this.table, dt, this.shot.firstObjectHit !== null, this.physicsScratch);
      if (this.shot.firstObjectHit === null && result.event.cueFirstObjectHit !== null) {
        this.shot.firstObjectHit = result.event.cueFirstObjectHit;
        this.playCue('ball-hit');
      }
      if (result.event.railAfterContact) {
        this.shot.railAfterContact = true;
        this.playCue('rail-hit');
      }
      if (result.event.cuePocketed) {
        this.shot.cuePocketed = true;
        this.playCue('foul');
      }
      for (let i = 0; i < result.event.pocketed.length; i += 1) {
        const number = result.event.pocketed[i];
        if (!this.shot.pocketed.includes(number)) this.shot.pocketed.push(number);
        this.playCue('pocket-drop');
      }

      if (!result.moving && !anyBallMoving(this.balls, this.table.sleepSpeed)) {
        this.completeShot();
      }
      return;
    }

    if (this.isAiTurn()) {
      this.aiThinkMs -= dt * 1000;
      if (this.aiThinkMs <= 0) {
        this.executeAiTurn();
      }
    }
  }

  private createVisuals(): void {
    this.tableGfx = this.add.graphics();
    this.aimGfx = this.add.graphics();
    this.spinGfx = this.add.graphics();

    for (let n = 0; n <= 15; n += 1) {
      const color = this.ballColor(n);
      const sprite = this.add.circle(0, 0, this.table.ballRadius, color).setStrokeStyle(2, 0x091015).setVisible(false).setDepth(10);
      this.ballSprites.set(n, sprite);
    }

    this.hudTop = this.add.text(60, 20, '', { fontFamily: 'Verdana', fontSize: '26px', color: '#ffffff' }).setDepth(20);
    this.hudMsg = this.add.text(60, 54, '', { fontFamily: 'Verdana', fontSize: '18px', color: '#d6f2dc' }).setDepth(20);
    this.hudPowerLabel = this.add.text(1020, 520, 'Power', { fontFamily: 'Verdana', fontSize: '16px', color: '#ffffff' }).setDepth(20);
    this.hudTimer = this.add.text(1020, 20, '', { fontFamily: 'Verdana', fontSize: '20px', color: '#ffe2a4' }).setDepth(20);
    this.hudTrick = this.add.text(60, 86, '', { fontFamily: 'Verdana', fontSize: '16px', color: '#bcd4ff' }).setDepth(20);
    this.resetRackButton = this.add
      .text(1020, 50, 'Reset Rack', { fontFamily: 'Verdana', fontSize: '18px', color: '#d3f9c7' })
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.setup.mode !== 'practice' || this.phase !== 'playing') return;
        this.balls = createRack(this.rules.variant, this.table);
        resetVelocities(this.balls);
        this.rules = createRuleState(this.rules.variant);
        this.rules.ballInHand = true;
        this.message = 'Practice rack reset.';
      });
  }

  private createMenu(): void {
    this.menuContainer = this.add.container(640, 360).setDepth(40);
    const panel = this.add.rectangle(0, 0, 760, 560, 0x0a1420, 0.95).setStrokeStyle(2, 0x2f5f7a);
    const title = this.add.text(0, -245, 'Pool', { fontFamily: 'Verdana', fontSize: '52px', color: '#ffffff' }).setOrigin(0.5);

    this.menuContainer.add([panel, title]);

    for (let i = 0; i < 10; i += 1) {
      const row = this.add
        .text(-320, -180 + i * 44, '', { fontFamily: 'Verdana', fontSize: '24px', color: '#d9edf4' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.handleMenuRow(i));
      this.menuRows.push(row);
      this.menuContainer.add(row);
    }
  }

  private createEndScreen(): void {
    this.endContainer = this.add.container(640, 360).setDepth(45).setVisible(false);
    const panel = this.add.rectangle(0, 0, 720, 480, 0x0a0f16, 0.94).setStrokeStyle(2, 0x5e8f53);
    this.endSummary = this.add.text(0, -140, '', {
      fontFamily: 'Verdana',
      fontSize: '28px',
      align: 'center',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.endContainer.add([panel, this.endSummary]);

    const labels = ['Rematch', 'Change Settings', 'Back to Lobby', 'Next Trick Shot'];
    for (let i = 0; i < labels.length; i += 1) {
      const button = this.add
        .text(0, 70 + i * 46, labels[i], { fontFamily: 'Verdana', fontSize: '26px', color: '#d8f1b9' })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.handleEndButton(i));
      this.endButtons.push(button);
      this.endContainer.add(button);
    }
  }

  private bindInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'playing') return;
      this.pointerDownX = pointer.x;
      this.pointerDownY = pointer.y;

      if (this.setup.options.spinControl && this.trySpinWidgetDown(pointer)) return;

      if (this.shot.active) return;

      const cue = this.getCue();
      if (!cue || cue.pocketed) return;

      const nearCue = Math.hypot(pointer.x - cue.x, pointer.y - cue.y) <= this.table.ballRadius * 2;
      const canPlace = this.rules.ballInHand || this.setup.mode === 'practice';

      if (canPlace && nearCue) {
        this.draggingCue = true;
        if (this.game.canvas?.setPointerCapture) this.game.canvas.setPointerCapture(pointer.pointerId);
        return;
      }

      if (this.isAiTurn()) return;

      if (nearCue) {
        beginAim(this.aim, pointer.pointerId);
        updateAim(this.aim, cue.x, cue.y, pointer.x, pointer.y);
        if (this.game.canvas?.setPointerCapture) this.game.canvas.setPointerCapture(pointer.pointerId);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'playing') return;
      const cue = this.getCue();
      if (!cue) return;

      if (this.spin.open && pointer.isDown && this.trySpinWidgetMove(pointer)) {
        return;
      }

      if (this.draggingCue) {
        const legal = placeCueBall(cue, pointer.x, pointer.y, this.balls, this.table, false);
        if (!legal) {
          cue.x = clamp(pointer.x, this.table.bounds.left + this.table.ballRadius, this.table.bounds.right - this.table.ballRadius);
          cue.y = clamp(pointer.y, this.table.bounds.top + this.table.ballRadius, this.table.bounds.bottom - this.table.ballRadius);
        }
        cue.vx = 0;
        cue.vy = 0;
      }

      if (this.aim.active && this.aim.pointerId === pointer.pointerId) {
        updateAim(this.aim, cue.x, cue.y, pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.phase !== 'playing') return;

      if (this.draggingCue) {
        this.draggingCue = false;
        return;
      }

      if (this.spin.open && this.trySpinWidgetUp(pointer)) {
        return;
      }

      if (!this.aim.active || this.aim.pointerId !== pointer.pointerId) return;

      const shot = endAim(this.aim, pointer.pointerId);
      const tapDistance = Math.hypot(pointer.x - this.pointerDownX, pointer.y - this.pointerDownY);

      if (this.setup.options.spinControl && tapDistance < 7 && shot === null) {
        this.spin.open = !this.spin.open;
        return;
      }

      if (!shot) return;
      this.fireShot(shot.direction.x, shot.direction.y, shot.power, this.spin.x, this.spin.y);
    });

    this.input.on('gameout', () => {
      if (this.aim.active) cancelAim(this.aim);
      this.draggingCue = false;
    });
  }

  private trySpinWidgetDown(pointer: Phaser.Input.Pointer): boolean {
    const centerX = 1120;
    const centerY = 600;
    const radius = 44;
    if (!this.spin.open) return false;
    if (Math.hypot(pointer.x - centerX, pointer.y - centerY) > radius) return false;
    setSpinFromWidget(this.spin, pointer.x - centerX, pointer.y - centerY, radius);
    return true;
  }

  private trySpinWidgetMove(pointer: Phaser.Input.Pointer): boolean {
    const centerX = 1120;
    const centerY = 600;
    const radius = 44;
    if (Math.hypot(pointer.x - centerX, pointer.y - centerY) > radius + 10) return false;
    setSpinFromWidget(this.spin, pointer.x - centerX, pointer.y - centerY, radius);
    return true;
  }

  private trySpinWidgetUp(_pointer: Phaser.Input.Pointer): boolean {
    return false;
  }

  private showMenu(): void {
    this.phase = 'menu';
    this.menuContainer.setVisible(true);
    this.endContainer.setVisible(false);
    this.updateMenuRows();
    this.message = 'Set up your match and break.';
  }

  private handleMenuRow(index: number): void {
    switch (index) {
      case 0:
        this.settings.mode = MODE_ORDER[(MODE_ORDER.indexOf(this.settings.mode) + 1) % MODE_ORDER.length];
        break;
      case 1:
        this.settings.opponent = OPP_ORDER[(OPP_ORDER.indexOf(this.settings.opponent) + 1) % OPP_ORDER.length];
        break;
      case 2:
        this.settings.difficulty = DIFF_ORDER[(DIFF_ORDER.indexOf(this.settings.difficulty) + 1) % DIFF_ORDER.length];
        break;
      case 3:
        this.settings.ghostBall = !this.settings.ghostBall;
        break;
      case 4:
        this.settings.spinControl = !this.settings.spinControl;
        break;
      case 5:
        this.settings.strictRules = !this.settings.strictRules;
        break;
      case 6:
        this.settings.shotTimerEnabled = !this.settings.shotTimerEnabled;
        break;
      case 7:
        this.settings.shotTimerSec = this.settings.shotTimerSec === 25 ? 35 : this.settings.shotTimerSec === 35 ? 45 : 25;
        break;
      case 8:
        if (this.settings.mode === 'trick_shots') {
          this.settings.trickShotIndex = (this.settings.trickShotIndex + 1) % this.trickCatalog.shots.length;
        }
        break;
      case 9:
        this.startMatchFromMenu();
        return;
      default:
        return;
    }

    saveSettings(this.settings);
    this.updateMenuRows();
  }

  private updateMenuRows(): void {
    const trickTitle = this.trickCatalog.shots[this.settings.trickShotIndex]?.title ?? 'None';
    const rows = [
      `Mode: ${modeLabel(this.settings.mode)}`,
      `Opponent: ${this.settings.opponent === 'vs_ai' ? 'Vs AI' : 'Local Hotseat'}`,
      `AI Difficulty: ${this.settings.difficulty.toUpperCase()}`,
      `Ghost Ball: ${this.settings.ghostBall ? 'On' : 'Off'}`,
      `Spin Control: ${this.settings.spinControl ? 'On' : 'Off'}`,
      `Strict Rules: ${this.settings.strictRules ? 'On' : 'Off'}`,
      `Shot Timer: ${this.settings.shotTimerEnabled ? 'On' : 'Off'}`,
      `Shot Time: ${this.settings.shotTimerSec}s`,
      `Trick Shot: ${trickTitle}`,
      'Start Match'
    ];

    for (let i = 0; i < this.menuRows.length; i += 1) {
      this.menuRows[i].setText(rows[i]);
      this.menuRows[i].setVisible(i !== 8 || this.settings.mode === 'trick_shots');
    }
  }

  private startMatchFromMenu(): void {
    this.setup = {
      mode: this.settings.mode,
      opponent: this.settings.opponent,
      difficulty: this.settings.difficulty,
      options: {
        ghostBall: this.settings.ghostBall,
        spinControl: this.settings.spinControl,
        strictRules: this.settings.strictRules,
        shotTimerEnabled: this.settings.shotTimerEnabled,
        shotTimerSec: this.settings.shotTimerSec
      },
      trickShotId: this.settings.mode === 'trick_shots' ? this.trickCatalog.shots[this.settings.trickShotIndex]?.id ?? null : null
    };

    this.startMatch();
  }

  private variantForSetup(): PoolVariant {
    if (this.setup.mode === 'nine_ball') return 'nine_ball';
    if (this.setup.mode === 'trick_shots') {
      const shot = this.trickCatalog.shots.find((item) => item.id === this.setup.trickShotId) ?? this.trickCatalog.shots[0];
      return shot?.variant ?? 'eight_ball';
    }
    return 'eight_ball';
  }

  private startMatch(): void {
    const variant = this.variantForSetup();
    this.rules = createRuleState(variant);
    this.stats = { shots: [0, 0], pots: [0, 0], fouls: [0, 0] };
    this.shot.active = false;
    this.shot.firstObjectHit = null;
    this.shot.lowestBallBeforeShot = null;
    this.shot.railAfterContact = false;
    this.shot.cuePocketed = false;
    this.shot.pocketed.length = 0;
    this.aiThinkMs = 1000;
    this.shotTimerMs = this.setup.options.shotTimerSec * 1000;
    this.spin.open = false;
    this.spin.x = 0;
    this.spin.y = 0;

    if (this.setup.mode === 'trick_shots') {
      this.loadTrickShotLayout();
      this.trickAttempts = 0;
    } else {
      this.trickCurrent = null;
      this.balls = createRack(variant, this.table);
    }
    resetVelocities(this.balls);

    this.menuContainer.setVisible(false);
    this.endContainer.setVisible(false);
    this.phase = 'playing';
    this.message = 'Break shot ready.';

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.setup.mode,
      difficulty: this.setup.difficulty,
      options: this.setup.options
    });

    this.playCue('break');
  }

  private loadTrickShotLayout(): void {
    const shot = this.trickCatalog.shots.find((item) => item.id === this.setup.trickShotId) ?? this.trickCatalog.shots[this.settings.trickShotIndex] ?? null;
    this.trickCurrent = shot;

    if (!shot) {
      this.balls = createRack('eight_ball', this.table);
      return;
    }

    this.rules = createRuleState(shot.variant);
    const full = createRack(shot.variant, this.table);
    for (let i = 0; i < full.length; i += 1) {
      full[i].pocketed = true;
    }
    for (let i = 0; i < shot.balls.length; i += 1) {
      const entry = shot.balls[i];
      const ball = full.find((b) => b.number === entry.number);
      if (!ball) continue;
      ball.pocketed = false;
      ball.x = entry.x;
      ball.y = entry.y;
    }
    this.balls = full;
    this.message = `${shot.title}: ${shot.description}`;
  }

  private getCue(): PoolBall | null {
    return this.balls.find((b) => b.number === 0) ?? null;
  }

  private fireShot(dx: number, dy: number, power: number, spinX: number, spinY: number): void {
    const cue = this.getCue();
    if (!cue || cue.pocketed) return;

    this.stats.shots[this.rules.currentPlayer] += 1;
    strikeCueBall(cue, { x: dx, y: dy }, power, spinX, spinY);
    this.lastShotUsedSpin = Math.hypot(spinX, spinY) > 0.15;

    this.shot.active = true;
    this.shot.firstObjectHit = null;
    this.shot.lowestBallBeforeShot = firstActiveBallNumber(this.balls);
    this.shot.railAfterContact = false;
    this.shot.cuePocketed = false;
    this.shot.pocketed.length = 0;
    this.shotTimerMs = this.setup.options.shotTimerSec * 1000;

    triggerHaptic(8);
  }

  private completeShot(): void {
    const player = this.rules.currentPlayer;
    this.shot.active = false;

    const ballsRemaining = activeBallNumbers(this.balls);
    const resolution = resolveShot({
      state: this.rules,
      strictRules: this.setup.options.strictRules,
      firstObjectHit: this.shot.firstObjectHit,
      lowestBallBeforeShot: this.shot.lowestBallBeforeShot,
      cuePocketed: this.shot.cuePocketed,
      pocketed: this.shot.pocketed,
      railAfterContact: this.shot.railAfterContact,
      ballsRemaining
    });

    this.rules = resolution.nextState;

    if (this.shot.pocketed.some((n) => n !== 0)) {
      this.stats.pots[player] += this.shot.pocketed.filter((n) => n !== 0).length;
    }

    if (resolution.assignedGroup) {
      this.message = `Player ${player + 1} claims ${resolution.assignedGroup}.`;
    } else if (resolution.foul) {
      this.stats.fouls[player] += 1;
      this.message = `Foul: ${resolution.foulReason ?? 'Rule violation'}.`;
      this.playCue('foul');
      triggerHaptic([20, 20, 20]);
    } else if (resolution.keepTurn) {
      this.message = 'Good shot. Continue.';
    } else {
      this.message = 'Turn passes.';
    }

    if (this.shot.cuePocketed) {
      const cue = this.getCue();
      if (cue) {
        cue.pocketed = false;
        placeCueBall(cue, this.table.bounds.left + 220, (this.table.bounds.top + this.table.bounds.bottom) * 0.5, this.balls, this.table, false);
      }
    }

    if (this.setup.mode === 'trick_shots') {
      this.trickAttempts += 1;
      const success = this.trickCurrent
        ? evaluateTrickShotSuccess(this.trickCurrent, this.shot.pocketed, this.balls) &&
          (!this.trickCurrent.mustUseSpin || this.lastShotUsedSpin)
        : false;
      if (success) {
        if (this.trickCurrent) {
          const previous = this.trickProgress.bestAttempts[this.trickCurrent.id];
          if (typeof previous !== 'number' || this.trickAttempts < previous) {
            this.trickProgress.bestAttempts[this.trickCurrent.id] = this.trickAttempts;
            saveTrickShotProgress(this.trickProgress);
          }
        }
        this.finishMatch(this.rules.currentPlayer, 'Trick shot complete');
      } else {
        this.finishMatch(this.rules.currentPlayer === 0 ? 1 : 0, 'Trick shot failed');
      }
      return;
    }

    if (this.rules.ended && this.rules.winner !== null) {
      this.finishMatch(this.rules.winner, this.rules.endReason ?? 'Match ended');
      return;
    }

    if (this.isAiTurn()) {
      this.aiThinkMs = this.setup.difficulty === 'hard' ? 500 : this.setup.difficulty === 'medium' ? 800 : 1150;
    }
  }

  private isAiTurn(): boolean {
    return this.setup.opponent === 'vs_ai' && this.setup.mode !== 'practice' && this.rules.currentPlayer === 1;
  }

  private executeAiTurn(): void {
    const cue = this.getCue();
    if (!cue || cue.pocketed) return;

    if (this.rules.ballInHand) {
      const success = placeCueBall(
        cue,
        this.table.bounds.left + 260,
        (this.table.bounds.top + this.table.bounds.bottom) * 0.5 + (Math.random() * 2 - 1) * 120,
        this.balls,
        this.table,
        false
      );
      if (!success) {
        cue.x = this.table.bounds.left + 240;
        cue.y = (this.table.bounds.top + this.table.bounds.bottom) * 0.5;
      }
    }

    const plan = planAiShot(this.balls, this.table, this.rules, this.setup.difficulty, this.time.now * 0.001);
    this.message = plan.isSafety ? 'AI chooses safety.' : `AI attacks ${plan.targetBall ?? 'ball'}.`;
    this.fireShot(plan.direction.x, plan.direction.y, plan.power, plan.spinX, plan.spinY);
  }

  private finishMatch(winner: number, endReason: string): void {
    this.phase = 'ended';
    this.endContainer.setVisible(true);

    const winnerLabel = this.setup.mode === 'trick_shots'
      ? endReason === 'Trick shot complete'
        ? 'Passed'
        : 'Failed'
      : this.setup.opponent === 'vs_ai'
        ? winner === 0
          ? 'Player'
          : 'AI'
        : `Player ${winner + 1}`;

    const group0 = this.rules.eight.groups[0];
    const group1 = this.rules.eight.groups[1];

    const trickBest = this.trickCurrent ? this.trickProgress.bestAttempts[this.trickCurrent.id] : undefined;
    const trickLine = this.setup.mode === 'trick_shots'
      ? `Attempts: ${this.trickAttempts}\nBest: ${typeof trickBest === 'number' ? trickBest : '-'}\n`
      : '';

    this.endSummary.setText(
      `Winner: ${winnerLabel}\nReason: ${endReason}\n${trickLine}Shots ${this.stats.shots[0]}-${this.stats.shots[1]}\nPots ${this.stats.pots[0]}-${this.stats.pots[1]}\nFouls ${this.stats.fouls[0]}-${this.stats.fouls[1]}\nGroups: ${group0} / ${group1}`
    );

    this.endButtons[3].setVisible(this.setup.mode === 'trick_shots' && endReason === 'Trick shot complete');

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.setup.mode,
      winner: winnerLabel,
      stats: this.stats,
      endReason
    });

    this.playCue('win');
    triggerHaptic([18, 30, 18, 40, 18]);
  }

  private handleEndButton(index: number): void {
    if (index === 0) {
      this.startMatch();
      return;
    }
    if (index === 1) {
      this.showMenu();
      return;
    }
    if (index === 2) {
      this.hooks.backToLobby();
      return;
    }
    if (index === 3 && this.setup.mode === 'trick_shots') {
      this.settings.trickShotIndex = (this.settings.trickShotIndex + 1) % this.trickCatalog.shots.length;
      this.setup.trickShotId = this.trickCatalog.shots[this.settings.trickShotIndex].id;
      saveSettings(this.settings);
      this.startMatch();
    }
  }

  private renderTable(): void {
    this.tableGfx.clear();
    this.tableGfx.fillStyle(0x1a633b, 1);
    this.tableGfx.fillRoundedRect(
      this.table.bounds.left,
      this.table.bounds.top,
      this.table.bounds.right - this.table.bounds.left,
      this.table.bounds.bottom - this.table.bounds.top,
      14
    );
    this.tableGfx.lineStyle(14, 0x5b371a, 1);
    this.tableGfx.strokeRoundedRect(
      this.table.bounds.left,
      this.table.bounds.top,
      this.table.bounds.right - this.table.bounds.left,
      this.table.bounds.bottom - this.table.bounds.top,
      14
    );

    this.tableGfx.fillStyle(0x101010, 1);
    for (let i = 0; i < this.table.pockets.length; i += 1) {
      const p = this.table.pockets[i];
      this.tableGfx.fillCircle(p.x, p.y, p.radius);
    }

    for (let i = 0; i < this.balls.length; i += 1) {
      const b = this.balls[i];
      const sprite = this.ballSprites.get(b.number);
      if (!sprite) continue;
      if (b.pocketed) {
        sprite.setVisible(false);
      } else {
        sprite.setVisible(true);
        sprite.setPosition(b.x, b.y);
      }
    }

    this.aimGfx.clear();
    if (this.phase === 'playing' && this.aim.active && !this.shot.active) {
      const cue = this.getCue();
      if (cue && !cue.pocketed) {
        const length = 360;
        const x2 = cue.x + this.aim.aimX * length;
        const y2 = cue.y + this.aim.aimY * length;
        this.aimGfx.lineStyle(2, 0xffffff, 0.65);
        this.aimGfx.beginPath();
        this.aimGfx.moveTo(cue.x, cue.y);
        this.aimGfx.lineTo(x2, y2);
        this.aimGfx.strokePath();

        if (this.setup.options.ghostBall) {
          const ghost = estimateGhostBallTarget(cue, { x: this.aim.aimX, y: this.aim.aimY }, this.balls, this.table);
          if (ghost) {
            this.aimGfx.lineStyle(2, 0xffe39b, 0.8);
            this.aimGfx.strokeCircle(ghost.x, ghost.y, this.table.ballRadius);
          }
        }
      }
    }

    this.aimGfx.fillStyle(0xffffff, 0.2);
    this.aimGfx.fillRect(1020, 542, 190, 14);
    this.aimGfx.fillStyle(0xf2c14e, 0.9);
    this.aimGfx.fillRect(1020, 542, 190 * this.aim.power, 14);

    this.spinGfx.clear();
    if (this.setup.options.spinControl) {
      const centerX = 1120;
      const centerY = 600;
      const radius = 44;
      this.spinGfx.lineStyle(2, 0xbcdfff, this.spin.open ? 1 : 0.4);
      this.spinGfx.strokeCircle(centerX, centerY, radius);
      this.spinGfx.fillStyle(0x8ac6ff, this.spin.open ? 0.7 : 0.3);
      this.spinGfx.fillCircle(centerX + this.spin.x * radius, centerY + this.spin.y * radius, 8);
    }
  }

  private renderHud(): void {
    if (this.phase === 'menu') {
      this.hudTop.setText('Pool - Pre Match');
      this.hudMsg.setText('Configure mode, then Start Match.');
      this.hudTimer.setText('');
      this.hudTrick.setText('');
      this.resetRackButton.setVisible(false);
      return;
    }

    const current = this.rules.currentPlayer + 1;
    const group = this.rules.variant === 'eight_ball' ? this.rules.eight.groups[this.rules.currentPlayer] : 'lowest-ball';
    this.hudTop.setText(`Player ${current} | Target: ${group} | Pause: ESC`);
    this.hudMsg.setText(this.message);

    if (this.setup.options.shotTimerEnabled && this.phase === 'playing') {
      this.hudTimer.setText(`Shot: ${Math.max(0, Math.ceil(this.shotTimerMs / 1000))}s`);
    } else {
      this.hudTimer.setText('');
    }

    if (this.setup.mode === 'trick_shots' && this.trickCurrent) {
      const best = this.trickProgress.bestAttempts[this.trickCurrent.id];
      this.hudTrick.setText(`Trick: ${this.trickCurrent.title} | Attempts: ${this.trickAttempts} | Best: ${typeof best === 'number' ? best : '-'}`);
    } else {
      this.hudTrick.setText('');
    }

    this.hudPowerLabel.setText(this.setup.options.spinControl ? 'Power / Spin (tap cue to open spin)' : 'Power');
    this.resetRackButton.setVisible(this.setup.mode === 'practice' && this.phase === 'playing');
  }

  private ballColor(number: number): number {
    if (number === 0) return 0xffffff;
    if (number === 8) return 0x1c1c1c;
    if (number === 1 || number === 9) return 0xf4d03f;
    if (number === 2 || number === 10) return 0x3955d1;
    if (number === 3 || number === 11) return 0xcf3838;
    if (number === 4 || number === 12) return 0x7d47d6;
    if (number === 5 || number === 13) return 0xf18f1c;
    if (number === 6 || number === 14) return 0x1f8f56;
    return 0x8f281f;
  }

  private playCue(kind: 'break' | 'ball-hit' | 'rail-hit' | 'pocket-drop' | 'foul' | 'win'): void {
    if (this.sound.mute) return;
    const manager = this.sound as unknown as { context?: AudioContext };
    const ctx = manager.context;
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      if (kind === 'break') osc.frequency.value = 170;
      else if (kind === 'ball-hit') osc.frequency.value = 290;
      else if (kind === 'rail-hit') osc.frequency.value = 220;
      else if (kind === 'pocket-drop') osc.frequency.value = 190;
      else if (kind === 'foul') osc.frequency.value = 130;
      else osc.frequency.value = 420;

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === 'win' ? 0.035 : 0.018, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'win' ? 0.24 : 0.11));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (kind === 'win' ? 0.25 : 0.12));
    } catch {
      // no-op
    }
  }
}
