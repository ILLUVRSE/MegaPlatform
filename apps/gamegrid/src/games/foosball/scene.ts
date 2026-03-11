import Phaser from 'phaser';
import { triggerHaptic } from '../../systems/gameplayComfort';
import type { GameRuntimeHooks } from '../../game/modules';
import { applyDrillEvent, createActiveDrillState, loadDrillProgress, loadFoosballDrills, saveDrillProgress, tickDrillState } from './drills';
import { createAiState, decideAiKick, stepAiRods } from './ai';
import { applyKickImpulse, createBallState, createPhysicsScratch, createTableBounds, resetBallToCenter, stepBallPhysics } from './physics';
import { onPointerDown, onPointerMove, onPointerUp, createInputState } from './input';
import { applyLockedRoles, createRods, moveRodByDelta, roleLabel, selectRod, setManualSelection, stepRodMovement, updateRodSelection } from './rods';
import { createMatchState, formatClock, registerGoal, tickMatchClock } from './rules';
import type {
  ActiveDrillState,
  BallState,
  DrillCatalog,
  FoosballDifficulty,
  FoosballMode,
  RodSelectionState,
  RodState,
  SceneStats,
  StoredSettings,
  TableBounds,
  TeamSide
} from './types';

interface FoosballSceneConfig {
  hooks: GameRuntimeHooks;
}

interface MenuRow {
  label: () => string;
  onClick: () => void;
}

type ScenePhase = 'menu' | 'countdown' | 'playing' | 'ended';

const SETTINGS_KEY = 'gamegrid.foosball.settings.v1';

const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'first_to_5',
  difficulty: 'medium',
  autoSelectRod: true,
  shootAssist: true,
  showZones: false,
  sensitivity: 'medium',
  timedSeconds: 90
};

const MODE_ORDER: readonly FoosballMode[] = ['first_to_5', 'timed', 'training'] as const;
const DIFFICULTY_ORDER: readonly FoosballDifficulty[] = ['easy', 'medium', 'hard'] as const;
const SENS_ORDER: readonly StoredSettings['sensitivity'][] = ['low', 'medium', 'high'] as const;

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

function saveStoredSettings(settings: StoredSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // no-op
  }
}


function modeLabel(mode: FoosballMode): string {
  if (mode === 'timed') return 'Timed';
  if (mode === 'training') return 'Training';
  return 'First to 5';
}

function difficultyLabel(value: FoosballDifficulty): string {
  if (value === 'easy') return 'Easy';
  if (value === 'hard') return 'Hard';
  return 'Medium';
}

export class FoosballScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private settings: StoredSettings = loadStoredSettings();
  private bounds: TableBounds = createTableBounds();
  private readonly ball: BallState = createBallState(this.bounds);
  private readonly physicsScratch = createPhysicsScratch();

  private playerRods: RodState[] = [];
  private aiRods: RodState[] = [];
  private allRods: RodState[] = [];
  private selection: RodSelectionState = { selectedIndex: 2, manualUntilMs: 0 };
  private aiState = createAiState();
  private readonly inputState = createInputState();

  private stats: SceneStats = { shots: [0, 0], passes: [0, 0], saves: [0, 0] };
  private phase: ScenePhase = 'menu';
  private countdownMs = 0;
  private countdownValue = 3;
  private fatalError = false;
  private accumulator = 0;
  private matchPaused = false;

  private match = createMatchState('first_to_5', 90);
  private drillCatalog: DrillCatalog = { drills: [] };
  private drillProgress = loadDrillProgress();
  private activeDrillIndex = 0;
  private activeDrill: ActiveDrillState | null = null;

  private menuContainer!: Phaser.GameObjects.Container;
  private menuRows: Phaser.GameObjects.Text[] = [];
  private endContainer!: Phaser.GameObjects.Container;
  private endSummary!: Phaser.GameObjects.Text;

  private tableGfx!: Phaser.GameObjects.Graphics;
  private zonesGfx!: Phaser.GameObjects.Graphics;
  private ballSprite!: Phaser.GameObjects.Arc;
  private playerRodSprites: Phaser.GameObjects.Rectangle[] = [];
  private aiRodSprites: Phaser.GameObjects.Rectangle[] = [];
  private playerManSprites: Phaser.GameObjects.Arc[] = [];
  private aiManSprites: Phaser.GameObjects.Arc[] = [];

  private hudScore!: Phaser.GameObjects.Text;
  private hudTimer!: Phaser.GameObjects.Text;
  private hudRod!: Phaser.GameObjects.Text;
  private hudMode!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Text;

  private lastContactTeam: TeamSide | null = null;
  private lastContactRod = '';
  private lastKickMs = -9999;
  private rng = 0.317;

  constructor(config: FoosballSceneConfig) {
    super('foosball-main');
    this.hooks = config.hooks;
  }

  create() {
    this.drillCatalog = loadFoosballDrills();
    this.playerRods = createRods(this.bounds, 'player');
    this.aiRods = createRods(this.bounds, 'ai');
    this.allRods = [...this.playerRods, ...this.aiRods];
    selectRod(this.selection, this.playerRods, this.selection.selectedIndex);

    this.createTableVisuals();
    this.createHud();
    this.createMenu();
    this.createEndScreen();
    this.bindInputs();
    this.showMenu();
  }

  update(_time: number, deltaMs: number) {
    if (this.fatalError) return;
    try {
      const dt = Math.min(0.04, deltaMs / 1000);
      this.accumulator += dt;
      const fixed = 1 / 120;
      while (this.accumulator >= fixed) {
        this.fixedStep(fixed);
        this.accumulator -= fixed;
      }
      this.renderScene();
      this.updateHudText();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Foosball runtime failure';
      this.fatalError = true;
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
    }
  }

  private fixedStep(dt: number): void {
    if (this.phase === 'menu' || this.phase === 'ended') return;
    if (this.matchPaused) return;

    const nowMs = performance.now();

    if (this.phase === 'countdown') {
      this.countdownMs -= dt * 1000;
      if (this.countdownMs <= 0) {
        this.countdownMs += 1000;
        this.countdownValue -= 1;
        this.playCue('countdown');
        if (this.countdownValue <= 0) {
          this.phase = 'playing';
          this.hudHint.setText('Play!');
        }
      }
      return;
    }

    updateRodSelection(this.selection, this.playerRods, this.ball.x, nowMs, this.settings.autoSelectRod);

    stepAiRods(this.aiState, this.aiRods, this.ball, this.bounds, this.settings.difficulty, nowMs, () => this.nextRand());

    for (let i = 0; i < this.playerRods.length; i += 1) {
      stepRodMovement(this.playerRods[i], dt * this.sensitivityScale());
    }
    for (let i = 0; i < this.aiRods.length; i += 1) {
      stepRodMovement(this.aiRods[i], dt);
    }

    this.tryAiKick(nowMs);

    const physics = stepBallPhysics(this.ball, this.allRods, this.bounds, dt, this.physicsScratch);
    if (physics.wallHit) this.playCue('wall');
    if (physics.antiPinningApplied) this.hudHint.setText('Ball freed');

    if (physics.rodHitBy) {
      if (this.lastContactTeam === physics.rodHitBy && this.lastContactRod !== this.currentContactRodLabel(physics.rodHitBy)) {
        const idx = physics.rodHitBy === 'player' ? 0 : 1;
        this.stats.passes[idx] += 1;
        if (this.activeDrill) {
          this.activeDrill = applyDrillEvent(this.activeDrill, { type: 'pass', amount: 1 });
        }
      }
      this.lastContactTeam = physics.rodHitBy;
      this.lastContactRod = this.currentContactRodLabel(physics.rodHitBy);

      if (this.ball.x < this.bounds.left + 140 && physics.rodHitBy === 'player') {
        this.stats.saves[0] += 1;
        if (this.activeDrill) this.activeDrill = applyDrillEvent(this.activeDrill, { type: 'block', amount: 1 });
      }
      if (this.ball.x > this.bounds.right - 140 && physics.rodHitBy === 'ai') {
        this.stats.saves[1] += 1;
      }
      this.playCue('kick');
    }

    if (physics.goalScoredBy) {
      this.onGoal(physics.goalScoredBy);
      return;
    }

    if (this.match.mode === 'timed') {
      this.match = tickMatchClock(this.match, dt * 1000);
      if (this.match.suddenDeath) {
        this.hudHint.setText('Sudden death: next goal wins');
      }
      if (this.match.ended) {
        this.finishMatch();
        return;
      }
    }

    if (this.activeDrill) {
      this.activeDrill = tickDrillState(this.activeDrill, dt * 1000);
      if (this.activeDrill.completed || this.activeDrill.failed) {
        this.finishTrainingDrill();
      }
    }
  }

  private onGoal(scorer: TeamSide): void {
    this.match = registerGoal(this.match, scorer);
    if (this.activeDrill && scorer === 'player') {
      this.activeDrill = applyDrillEvent(this.activeDrill, { type: 'score', amount: 1 });
    }
    this.playCue('goal');
    triggerHaptic([20, 35, 20]);

    if (this.match.ended) {
      this.finishMatch();
      return;
    }

    resetBallToCenter(this.ball, this.bounds, scorer === 'player' ? 'ai' : 'player');
    this.phase = 'countdown';
    this.countdownValue = 2;
    this.countdownMs = 900;
    this.hudHint.setText('Next kickoff');
  }

  private finishMatch(): void {
    this.phase = 'ended';
    this.endContainer.setVisible(true);

    const winner = this.match.winner === 'draw' ? 'Draw' : this.match.winner === 'player' ? 'You' : 'AI';
    const scoreText = `${this.match.score[0]} - ${this.match.score[1]}`;
    this.endSummary.setText(
      `Winner: ${winner}\nScore: ${scoreText}\nShots ${this.stats.shots[0]}-${this.stats.shots[1]}\nPasses ${this.stats.passes[0]}-${this.stats.passes[1]}\nSaves ${this.stats.saves[0]}-${this.stats.saves[1]}`
    );

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.match.mode,
      winner,
      finalScore: scoreText,
      stats: {
        shots: this.stats.shots,
        passes: this.stats.passes,
        saves: this.stats.saves
      }
    });
  }

  private finishTrainingDrill(): void {
    this.phase = 'ended';
    this.endContainer.setVisible(true);

    const drill = this.drillCatalog.drills[this.activeDrillIndex];
    const success = !!this.activeDrill?.completed;
    if (success) {
      this.drillProgress.completed[drill.id] = true;
      saveDrillProgress(this.drillProgress);
    }
    this.endSummary.setText(
      `${drill.title}\n${success ? 'Completed' : 'Failed'}\nProgress: ${this.activeDrill?.progress ?? 0}/${this.activeDrill?.target ?? 0}`
    );

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: 'practice',
      trainingMode: 'training',
      winner: success ? 'completed' : 'failed',
      finalScore: `${this.activeDrill?.progress ?? 0}/${this.activeDrill?.target ?? 0}`,
      stats: {
        shots: this.stats.shots,
        passes: this.stats.passes,
        saves: this.stats.saves
      }
    });
  }

  private createTableVisuals(): void {
    this.tableGfx = this.add.graphics();
    this.zonesGfx = this.add.graphics();
    this.ballSprite = this.add.circle(this.ball.x, this.ball.y, this.ball.radius, 0xfafaf7).setStrokeStyle(2, 0x45505f).setDepth(8);

    for (let i = 0; i < this.playerRods.length; i += 1) {
      this.playerRodSprites.push(this.add.rectangle(0, 0, 8, 440, 0xd9d9d9).setDepth(3));
      for (let j = 0; j < this.playerRods[i].players.length; j += 1) {
        this.playerManSprites.push(this.add.circle(0, 0, 20, 0x3fd081).setDepth(6));
      }
    }

    for (let i = 0; i < this.aiRods.length; i += 1) {
      this.aiRodSprites.push(this.add.rectangle(0, 0, 8, 440, 0xd9d9d9).setDepth(3));
      for (let j = 0; j < this.aiRods[i].players.length; j += 1) {
        this.aiManSprites.push(this.add.circle(0, 0, 20, 0xff6f6f).setDepth(6));
      }
    }

    this.drawTable();
  }

  private drawTable(): void {
    this.tableGfx.clear();
    this.tableGfx.fillStyle(0x17482b, 1);
    this.tableGfx.fillRoundedRect(this.bounds.left, this.bounds.top, this.bounds.right - this.bounds.left, this.bounds.bottom - this.bounds.top, 16);
    this.tableGfx.lineStyle(4, 0xd4e8d2, 0.9);
    this.tableGfx.strokeRoundedRect(this.bounds.left, this.bounds.top, this.bounds.right - this.bounds.left, this.bounds.bottom - this.bounds.top, 16);
    this.tableGfx.lineStyle(2, 0xd4e8d2, 0.9);
    this.tableGfx.beginPath();
    this.tableGfx.moveTo(this.bounds.centerX, this.bounds.top);
    this.tableGfx.lineTo(this.bounds.centerX, this.bounds.bottom);
    this.tableGfx.strokePath();
    this.tableGfx.strokeCircle(this.bounds.centerX, this.bounds.centerY, 68);

    this.tableGfx.fillStyle(0x0b2a17, 1);
    this.tableGfx.fillRect(this.bounds.left - 16, this.bounds.goalTop, 16, this.bounds.goalBottom - this.bounds.goalTop);
    this.tableGfx.fillRect(this.bounds.right, this.bounds.goalTop, 16, this.bounds.goalBottom - this.bounds.goalTop);

    this.zonesGfx.clear();
    if (!this.settings.showZones) return;
    const zones = [
      this.playerRods[0].x,
      (this.playerRods[0].x + this.playerRods[1].x) * 0.5,
      (this.playerRods[1].x + this.playerRods[2].x) * 0.5,
      (this.playerRods[2].x + this.playerRods[3].x) * 0.5,
      this.playerRods[3].x + 120
    ];

    const cols = [0x8dd3c7, 0xffffb3, 0xbebada, 0xfb8072];
    for (let i = 0; i < 4; i += 1) {
      const x0 = i === 0 ? this.bounds.left : zones[i];
      const x1 = i === 3 ? this.bounds.right : zones[i + 1];
      this.zonesGfx.fillStyle(cols[i], 0.12);
      this.zonesGfx.fillRect(x0, this.bounds.top, x1 - x0, this.bounds.bottom - this.bounds.top);
    }
  }

  private createHud(): void {
    this.add.text(18, 14, 'Foosball', { color: '#f4f8fc', fontSize: '28px' }).setDepth(20);
    this.hudScore = this.add.text(18, 50, '0 - 0', { color: '#f4f8fc', fontSize: '24px' }).setDepth(20);
    this.hudTimer = this.add.text(18, 82, '', { color: '#bfd6f8', fontSize: '18px' }).setDepth(20);
    this.hudRod = this.add.text(18, 110, '', { color: '#ffeaa7', fontSize: '18px' }).setDepth(20);
    this.hudMode = this.add.text(18, 138, '', { color: '#d6e7ff', fontSize: '16px' }).setDepth(20);
    this.hudHint = this.add.text(18, 162, '', { color: '#d2f7d0', fontSize: '16px' }).setDepth(20);

    this.pauseButton = this.add
      .text(1160, 24, 'Pause', { color: '#eaf3ff', fontSize: '20px', backgroundColor: '#1f3754' })
      .setPadding(10, 6, 10, 6)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.matchPaused = !this.matchPaused;
        this.pauseButton.setText(this.matchPaused ? 'Resume' : 'Pause');
      });
  }

  private createMenu(): void {
    this.menuContainer = this.add.container(640, 365).setDepth(40);
    const panel = this.add.rectangle(0, 0, 580, 520, 0x091726, 0.9).setStrokeStyle(2, 0x8fb9e6);
    const title = this.add.text(0, -228, 'Foosball Setup', { color: '#eef6ff', fontSize: '34px' }).setOrigin(0.5);

    this.menuContainer.add([panel, title]);
    this.buildMenuRows();
  }

  private buildMenuRows(): void {
    const rows: MenuRow[] = [
      {
        label: () => `Mode: ${modeLabel(this.settings.mode)}`,
        onClick: () => {
          const idx = MODE_ORDER.indexOf(this.settings.mode);
          this.settings.mode = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Difficulty: ${difficultyLabel(this.settings.difficulty)}`,
        onClick: () => {
          const idx = DIFFICULTY_ORDER.indexOf(this.settings.difficulty);
          this.settings.difficulty = DIFFICULTY_ORDER[(idx + 1) % DIFFICULTY_ORDER.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Auto-Select Rod: ${this.settings.autoSelectRod ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.autoSelectRod = !this.settings.autoSelectRod;
          this.refreshMenu();
        }
      },
      {
        label: () => `Shoot Assist: ${this.settings.shootAssist ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.shootAssist = !this.settings.shootAssist;
          this.refreshMenu();
        }
      },
      {
        label: () => `Show Zones: ${this.settings.showZones ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.showZones = !this.settings.showZones;
          this.drawTable();
          this.refreshMenu();
        }
      },
      {
        label: () => `Sensitivity: ${this.settings.sensitivity}`,
        onClick: () => {
          const idx = SENS_ORDER.indexOf(this.settings.sensitivity);
          this.settings.sensitivity = SENS_ORDER[(idx + 1) % SENS_ORDER.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Timed Length: ${this.settings.timedSeconds}s`,
        onClick: () => {
          const options = [60, 90, 120];
          const idx = options.indexOf(this.settings.timedSeconds);
          this.settings.timedSeconds = options[(idx + 1) % options.length];
          this.refreshMenu();
        }
      }
    ];

    for (let i = 0; i < this.menuRows.length; i += 1) {
      this.menuRows[i].destroy();
    }
    this.menuRows.length = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = this.add
        .text(0, -162 + i * 42, row.label(), {
          color: '#e8f0fb',
          fontSize: '24px',
          backgroundColor: '#22374f'
        })
        .setOrigin(0.5)
        .setPadding(10, 6, 10, 6)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          row.onClick();
          this.playCue('ui');
        });
      this.menuRows.push(line);
      this.menuContainer.add(line);
    }

    if (this.settings.mode === 'training') {
      const title = this.add.text(0, 150, 'Drills', { color: '#ffe7b2', fontSize: '20px' }).setOrigin(0.5);
      this.menuContainer.add(title);
      this.menuRows.push(title);

      const maxRows = Math.min(8, this.drillCatalog.drills.length);
      for (let i = 0; i < maxRows; i += 1) {
        const drillIndex = (this.activeDrillIndex + i) % this.drillCatalog.drills.length;
        const drill = this.drillCatalog.drills[drillIndex];
        const done = this.drillProgress.completed[drill.id] ? '✓ ' : '';
        const line = this.add
          .text(0, 180 + i * 24, `${drillIndex === this.activeDrillIndex ? '>' : ' '} ${done}${drill.title}`, {
            color: drillIndex === this.activeDrillIndex ? '#9be7ff' : '#d9e8ff',
            fontSize: '16px'
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.activeDrillIndex = drillIndex;
            this.refreshMenu();
          });
        this.menuRows.push(line);
        this.menuContainer.add(line);
      }
    }

    const startButton = this.add
      .text(0, 232, 'Start Match', {
        color: '#081b2f',
        fontSize: '28px',
        backgroundColor: '#ffd46b'
      })
      .setOrigin(0.5)
      .setPadding(18, 8, 18, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.startConfiguredMatch();
        this.playCue('ui');
      });
    this.menuRows.push(startButton);
    this.menuContainer.add(startButton);
  }

  private refreshMenu(): void {
    saveStoredSettings(this.settings);
    this.buildMenuRows();
  }

  private createEndScreen(): void {
    this.endContainer = this.add.container(640, 360).setDepth(60);
    const panel = this.add.rectangle(0, 0, 460, 330, 0x081425, 0.92).setStrokeStyle(2, 0x7db7f0);
    const title = this.add.text(0, -130, 'Match Over', { color: '#f4faff', fontSize: '32px' }).setOrigin(0.5);
    this.endSummary = this.add.text(0, -20, '', { color: '#d9ebff', fontSize: '20px', align: 'center' }).setOrigin(0.5);

    const rematch = this.add
      .text(0, 92, 'Rematch', { color: '#0d2238', fontSize: '24px', backgroundColor: '#97ffd1' })
      .setOrigin(0.5)
      .setPadding(14, 8, 14, 8)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startConfiguredMatch());

    const settings = this.add
      .text(-122, 136, 'Change Settings', { color: '#eaf4ff', fontSize: '18px', backgroundColor: '#2a4360' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showMenu());

    const lobby = this.add
      .text(122, 136, 'Back To Lobby', { color: '#eaf4ff', fontSize: '18px', backgroundColor: '#2a4360' })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hooks.backToLobby());

    this.endContainer.add([panel, title, this.endSummary, rematch, settings, lobby]);
    this.endContainer.setVisible(false);
  }

  private bindInputs(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const now = performance.now();
      onPointerDown(
        this.inputState,
        { id: pointer.id, x: pointer.x, y: pointer.y, timeMs: now },
        this.playerRods,
        {
          onSelectRod: (rodIndex, atMs) => {
            if (this.settings.autoSelectRod) {
              setManualSelection(this.selection, this.playerRods, rodIndex, atMs);
            } else {
              this.selection.manualUntilMs = Number.POSITIVE_INFINITY;
              selectRod(this.selection, this.playerRods, rodIndex);
            }
          },
          onDragRod: (deltaY) => {
            if (this.phase !== 'playing') return;
            if (!this.settings.autoSelectRod && this.selection.manualUntilMs <= 0) return;
            moveRodByDelta(this.playerRods[this.selection.selectedIndex], deltaY);
          },
          onKick: (strength) => {
            if (this.phase !== 'playing') return;
            this.tryPlayerKick(strength, now);
          }
        }
      );
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      onPointerMove(this.inputState, { id: pointer.id, x: pointer.x, y: pointer.y, timeMs: performance.now() }, {
        onSelectRod: () => undefined,
        onDragRod: (deltaY) => {
          if (this.phase !== 'playing') return;
          if (!this.settings.autoSelectRod && this.selection.manualUntilMs <= 0) return;
          moveRodByDelta(this.playerRods[this.selection.selectedIndex], deltaY);
        },
        onKick: () => undefined
      });
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const now = performance.now();
      onPointerUp(this.inputState, { id: pointer.id, x: pointer.x, y: pointer.y, timeMs: now }, {
        onSelectRod: () => undefined,
        onDragRod: () => undefined,
        onKick: (strength) => {
          if (this.phase !== 'playing') return;
          this.tryPlayerKick(strength, now);
        }
      });
    });
  }

  private tryPlayerKick(strength: number, nowMs: number): void {
    if (nowMs - this.lastKickMs < 110) return;
    const rod = this.playerRods[this.selection.selectedIndex];
    const canKick = this.ballNearRod(rod, this.settings.shootAssist ? 62 : 44);
    if (!canKick) return;

    applyKickImpulse(this.ball, rod, strength, this.settings.shootAssist, 'player', false);
    this.stats.shots[0] += 1;
    this.lastKickMs = nowMs;
    this.selection.manualUntilMs = 0;
    this.playCue('kick');
    triggerHaptic(12);
  }

  private tryAiKick(nowMs: number): void {
    let contactRodIndex = -1;
    for (let i = 0; i < this.aiRods.length; i += 1) {
      if (this.ballNearRod(this.aiRods[i], 46)) {
        contactRodIndex = i;
        break;
      }
    }
    if (contactRodIndex < 0) return;

    const kick = decideAiKick(this.aiState, this.settings.difficulty, nowMs, () => this.nextRand(), contactRodIndex);
    if (!kick) return;

    const rod = this.aiRods[kick.rodIndex];
    applyKickImpulse(this.ball, rod, kick.strength, false, 'ai', kick.isPass);
    this.stats.shots[1] += 1;
    if (kick.isPass) this.stats.passes[1] += 1;
  }

  private ballNearRod(rod: RodState, range: number): boolean {
    for (let i = 0; i < rod.players.length; i += 1) {
      const p = rod.players[i];
      const dx = this.ball.x - p.x;
      const dy = this.ball.y - p.y;
      if (dx * dx + dy * dy <= range * range) {
        return true;
      }
    }
    return false;
  }

  private renderScene(): void {
    this.ballSprite.setPosition(this.ball.x, this.ball.y);

    let manIdx = 0;
    for (let i = 0; i < this.playerRods.length; i += 1) {
      const rod = this.playerRods[i];
      const selected = rod.selected;
      this.playerRodSprites[i].setPosition(rod.x, rod.y).setFillStyle(selected ? 0xffdb6e : 0xc6d1da);
      for (let j = 0; j < rod.players.length; j += 1) {
        const p = rod.players[j];
        this.playerManSprites[manIdx].setPosition(p.x, p.y).setFillStyle(selected ? 0x6effaa : 0x3fd081);
        manIdx += 1;
      }
    }

    manIdx = 0;
    for (let i = 0; i < this.aiRods.length; i += 1) {
      const rod = this.aiRods[i];
      this.aiRodSprites[i].setPosition(rod.x, rod.y).setFillStyle(0xc6d1da);
      for (let j = 0; j < rod.players.length; j += 1) {
        const p = rod.players[j];
        this.aiManSprites[manIdx].setPosition(p.x, p.y);
        manIdx += 1;
      }
    }
  }

  private updateHudText(): void {
    this.hudScore.setText(`${this.match.score[0]} - ${this.match.score[1]}`);

    if (this.match.mode === 'timed') {
      this.hudTimer.setText(this.match.suddenDeath ? 'Sudden Death' : `Time ${formatClock(this.match.remainingMs)}`);
    } else {
      this.hudTimer.setText('First to 5');
    }

    const selected = this.playerRods[this.selection.selectedIndex];
    const manualTag = this.selection.manualUntilMs > performance.now() ? ' (Manual)' : '';
    this.hudRod.setText(`Active Rod: ${roleLabel(selected.role)}${manualTag}`);
    this.hudMode.setText(`Mode: ${modeLabel(this.settings.mode)} | AI: ${difficultyLabel(this.settings.difficulty)}`);

    if (this.phase === 'countdown') {
      this.hudHint.setText(`Kickoff in ${this.countdownValue}`);
    } else if (!this.settings.autoSelectRod) {
      this.hudHint.setText('Manual select: tap a rod to control it');
    } else if (this.phase === 'playing') {
      this.hudHint.setText('Swipe vertically to move rod. Flick to shoot harder.');
    }

    if (this.activeDrill) {
      const remains = this.activeDrill.remainingMs === null ? '' : ` | ${formatClock(this.activeDrill.remainingMs)}`;
      this.hudHint.setText(
        `Drill ${this.activeDrill.progress}/${this.activeDrill.target}${remains}`
      );
    }
  }

  private startConfiguredMatch(): void {
    saveStoredSettings(this.settings);

    this.endContainer.setVisible(false);
    this.menuContainer.setVisible(false);
    this.phase = 'countdown';
    this.matchPaused = false;
    this.pauseButton.setText('Pause');
    this.countdownValue = 3;
    this.countdownMs = 1000;

    this.stats = { shots: [0, 0], passes: [0, 0], saves: [0, 0] };
    this.lastContactTeam = null;
    this.lastContactRod = '';
    this.selection.manualUntilMs = 0;

    if (this.settings.mode === 'training') {
      const drill = this.drillCatalog.drills[this.activeDrillIndex];
      this.activeDrill = createActiveDrillState(drill);
      applyLockedRoles(this.playerRods, drill.activeRods, drill.lockedRods);
      this.match = createMatchState('first_to_5', this.settings.timedSeconds);
      this.match.score = [0, 0];
      this.ball.x = drill.startBall.x;
      this.ball.y = drill.startBall.y;
      this.ball.vx = drill.startBall.vx;
      this.ball.vy = drill.startBall.vy;
      this.hudHint.setText(drill.instructions);
    } else {
      this.activeDrill = null;
      applyLockedRoles(this.playerRods, ['goalkeeper', 'defense', 'midfield', 'strikers'], []);
      this.match = createMatchState(this.settings.mode, this.settings.timedSeconds);
      resetBallToCenter(this.ball, this.bounds, 'player');
    }

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      options: {
        autoSelectRod: this.settings.autoSelectRod,
        shootAssist: this.settings.shootAssist,
        showZones: this.settings.showZones,
        sensitivity: this.settings.sensitivity
      }
    });

  }

  private showMenu(): void {
    this.phase = 'menu';
    this.menuContainer.setVisible(true);
    this.endContainer.setVisible(false);
    this.refreshMenu();
  }

  private currentContactRodLabel(team: TeamSide): string {
    const rods = team === 'player' ? this.playerRods : this.aiRods;
    let best = rods[0];
    let bestDist = Math.abs(this.ball.x - best.x);
    for (let i = 1; i < rods.length; i += 1) {
      const dist = Math.abs(this.ball.x - rods[i].x);
      if (dist < bestDist) {
        best = rods[i];
        bestDist = dist;
      }
    }
    return best.role;
  }

  private sensitivityScale(): number {
    if (this.settings.sensitivity === 'low') return 0.82;
    if (this.settings.sensitivity === 'high') return 1.2;
    return 1;
  }

  private nextRand(): number {
    this.rng = (this.rng * 16807) % 1;
    return this.rng;
  }

  private playCue(cue: 'kick' | 'wall' | 'goal' | 'countdown' | 'ui'): void {
    if (!this.sound || this.sound.mute) return;
    const ctx = (this.sound as unknown as { context?: AudioContext }).context;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (cue === 'kick') {
      osc.type = 'triangle';
      osc.frequency.value = 280;
    } else if (cue === 'wall') {
      osc.type = 'square';
      osc.frequency.value = 180;
    } else if (cue === 'goal') {
      osc.type = 'sine';
      osc.frequency.value = 640;
    } else if (cue === 'countdown') {
      osc.type = 'sawtooth';
      osc.frequency.value = 240;
    } else {
      osc.type = 'triangle';
      osc.frequency.value = 340;
    }

    const duration = cue === 'goal' ? 0.2 : cue === 'countdown' ? 0.11 : 0.07;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
