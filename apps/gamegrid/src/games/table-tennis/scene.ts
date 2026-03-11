import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { triggerHaptic } from '../../systems/gameplayComfort';
import { decideAiReturn, getAiProfile, predictBallXAtY } from './ai';
import { createSwipeCapture, spinLabel, swipeToShot } from './input';
import {
  applyPaddleHit,
  createBallState,
  createPhysicsResult,
  createPhysicsScratch,
  DEFAULT_TABLE_PHYSICS,
  resetBallForServer,
  stepBallPhysics
} from './physics';
import { awardPoint, createPracticeState, createScoringState, registerPracticeShot } from './rules';
import type { MatchStats, PaddleShot, PlayerIndex, PointEndReason, PracticeState, ScoringState, TableTennisOptions } from './types';
import {
  applyButtonStyle,
  buildTextStyle,
  ensureDirectionalLinearTexture,
  ensureDirectionalSpecTexture,
  ensureNoiseTexture,
  ensureOuterVignetteTexture,
  ensurePaddleTexture,
  ensureRacketTexture,
  ensureVignetteTexture,
  snap,
  TABLE_TENNIS_THEME,
  VISUAL_DEBUG_DEFAULTS,
  tableMaskShape,
  type VisualMode
} from './visualTheme';

interface TableTennisSceneConfig {
  hooks: GameRuntimeHooks;
}

interface StoredSettings {
  mode: TableTennisOptions['mode'];
  difficulty: TableTennisOptions['difficulty'];
  assist: boolean;
  spinAssist: boolean;
  showTrajectory: boolean;
  sensitivity: TableTennisOptions['sensitivity'];
  visualMode: VisualMode;
  showBallTrail: boolean;
  tutorialComplete: boolean;
  debugDirectionalLight: boolean;
  debugVfx: boolean;
  debugVignette: boolean;
}

interface MenuRow {
  label: () => string;
  onClick: () => void;
}

type RoundState = 'menu' | 'await_serve_tap' | 'await_swipe' | 'rally' | 'between_points' | 'ended';

const SETTINGS_KEY = 'gamegrid.table-tennis.settings.v1';

const DEFAULT_SETTINGS: StoredSettings = {
  mode: 'quick_match',
  difficulty: 'medium',
  assist: true,
  spinAssist: false,
  showTrajectory: false,
  sensitivity: 'medium',
  visualMode: 'polished',
  showBallTrail: true,
  tutorialComplete: false,
  debugDirectionalLight: VISUAL_DEBUG_DEFAULTS.directionalLight,
  debugVfx: VISUAL_DEBUG_DEFAULTS.vfx,
  debugVignette: VISUAL_DEBUG_DEFAULTS.vignette
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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
    // ignore persistence failures
  }
}


function modeLabel(mode: StoredSettings['mode']): string {
  if (mode === 'best_of_3') return 'Best of 3';
  if (mode === 'practice') return 'Target Practice';
  return 'Quick Match';
}

function difficultyLabel(difficulty: StoredSettings['difficulty']): string {
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'hard') return 'Hard';
  return 'Medium';
}

export class TableTennisScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private settings: StoredSettings = loadStoredSettings();
  private options!: TableTennisOptions;

  private scoring: ScoringState | null = null;
  private practice: PracticeState | null = null;
  private stats: MatchStats = { rallies: 0, winners: 0, unforcedErrors: 0 };

  private readonly ball = createBallState();
  private readonly physicsScratch = createPhysicsScratch();
  private readonly physicsResult = createPhysicsResult();
  private readonly swipe = createSwipeCapture();

  private tableGfx!: Phaser.GameObjects.Graphics;
  private tableOverlay!: Phaser.GameObjects.TileSprite;
  private tableVignette!: Phaser.GameObjects.Image;
  private backgroundVignette!: Phaser.GameObjects.Image;
  private tableDirectionalLinear!: Phaser.GameObjects.Image;
  private tableDirectionalSpec!: Phaser.GameObjects.Image;
  private ballSprite!: Phaser.GameObjects.Arc;
  private ballHighlight!: Phaser.GameObjects.Arc;
  private shadowSprite!: Phaser.GameObjects.Ellipse;
  private playerPaddle!: Phaser.GameObjects.Image;
  private aiPaddle!: Phaser.GameObjects.Image;
  private playerPaddleShadow!: Phaser.GameObjects.Ellipse;
  private aiPaddleShadow!: Phaser.GameObjects.Ellipse;
  private targetSprite!: Phaser.GameObjects.Arc;
  private readonly trailDots: Phaser.GameObjects.Arc[] = [];
  private readonly impactRings: Phaser.GameObjects.Arc[] = [];
  private readonly impactSpecks: Phaser.GameObjects.Arc[] = [];
  private speckCursor = 0;
  private ringCursor = 0;

  private hudScore!: Phaser.GameObjects.Text;
  private hudSubline!: Phaser.GameObjects.Text;
  private hudServer!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private hudToast!: Phaser.GameObjects.Text;
  private toastHideAt = 0;
  private scoreSignature = '';

  private serveButton!: Phaser.GameObjects.Text;
  private coachmarkContainer!: Phaser.GameObjects.Container;

  private menuContainer!: Phaser.GameObjects.Container;
  private endContainer!: Phaser.GameObjects.Container;
  private endText!: Phaser.GameObjects.Text;

  private readonly trajectoryDots: Phaser.GameObjects.Arc[] = [];
  private menuRows: Phaser.GameObjects.Text[] = [];

  private roundState: RoundState = 'menu';
  private fatalError = false;
  private bootedMatch = false;

  private playerPaddleX = 0;
  private aiPaddleX = 0;

  private aiReactionAtMs = 0;
  private aiServeCountdownMs = 0;
  private nextPointCountdownMs = 0;

  private rallyHits = 0;
  private practiceAwardThisRally = 0;
  private pendingPlayerShot: PaddleShot | null = null;
  private pendingPlayerShotExpireMs = 0;

  private targetX = 0;
  private targetY = 0;
  private targetValue = 25;
  private targetRadius = 32;

  constructor(config: TableTennisSceneConfig) {
    super('table-tennis-main');
    this.hooks = config.hooks;
  }

  create() {
    this.createVisuals();
    this.createHud();
    this.createMenu();
    this.createEndScreen();
    this.createInputBindings();
    this.resetTarget();
    this.showMenu();
  }

  update(time: number, delta: number) {
    if (this.fatalError) return;

    try {
      this.updateRoundState(time, delta);
      this.updateHud();
      this.updateToast(time);
      this.updateBallVisual();
      this.updateTrajectory();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Table Tennis runtime failure';
      this.fatalError = true;
      this.hooks.reportEvent({ type: 'error', gameId: this.hooks.gameId, message });
      this.add
        .text(640, 360, `Table Tennis error\n${message}`, {
          color: '#ffd9d9',
          fontSize: '24px',
          align: 'center',
          backgroundColor: '#3b1313'
        })
        .setOrigin(0.5)
        .setDepth(99);
    }
  }

  private createVisuals() {
    this.tableGfx = this.add.graphics();
    this.drawTable();
    const mask = tableMaskShape(this);
    this.backgroundVignette = this.add
      .image(640, 360, ensureOuterVignetteTexture(this))
      .setDisplaySize(1280, 720)
      .setAlpha(TABLE_TENNIS_THEME.background.vignetteAlpha)
      .setDepth(1.5);

    this.tableOverlay = this.add
      .tileSprite(640, 404, TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height, ensureNoiseTexture(this))
      .setAlpha(0.035)
      .setDepth(4.25)
      .setMask(mask);
    this.tableVignette = this.add
      .image(640, 404, ensureVignetteTexture(this))
      .setDisplaySize(TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height)
      .setAlpha(0.42)
      .setDepth(4.5)
      .setMask(mask);
    this.tableDirectionalLinear = this.add
      .image(640, 404, ensureDirectionalLinearTexture(this))
      .setDisplaySize(TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height)
      .setAlpha(TABLE_TENNIS_THEME.lighting.directionalLinearAlpha)
      .setDepth(4.35)
      .setMask(mask);
    this.tableDirectionalSpec = this.add
      .image(640, 404, ensureDirectionalSpecTexture(this))
      .setDisplaySize(TABLE_TENNIS_THEME.table.width, TABLE_TENNIS_THEME.table.height)
      .setAlpha(TABLE_TENNIS_THEME.lighting.directionalSpecularAlpha)
      .setDepth(4.4)
      .setMask(mask);

    this.shadowSprite = this.add.ellipse(640, 470, 30, 12, 0x000000, TABLE_TENNIS_THEME.ball.shadowAlpha).setDepth(6);
    this.ballSprite = this.add
      .circle(640, 420, 9, TABLE_TENNIS_THEME.ball.base)
      .setStrokeStyle(1.5, TABLE_TENNIS_THEME.ball.rim, 0.95)
      .setDepth(9);
    this.ballHighlight = this.add.circle(636, 416, 2.4, TABLE_TENNIS_THEME.ball.highlight, 0.85).setDepth(10);

    ensurePaddleTexture(this, 'tt-paddle-player-bar', 140, 18, TABLE_TENNIS_THEME.paddle.playerHighlight, TABLE_TENNIS_THEME.paddle.playerBase, TABLE_TENNIS_THEME.paddle.rim);
    ensurePaddleTexture(this, 'tt-paddle-ai-bar', 132, 16, TABLE_TENNIS_THEME.paddle.aiHighlight, TABLE_TENNIS_THEME.paddle.aiBase, TABLE_TENNIS_THEME.paddle.rim);
    ensureRacketTexture(
      this,
      'tt-paddle-player-racket',
      TABLE_TENNIS_THEME.paddle.playerBase,
      TABLE_TENNIS_THEME.paddle.playerHighlight,
      TABLE_TENNIS_THEME.paddle.rim,
      0xb77a52
    );
    ensureRacketTexture(
      this,
      'tt-paddle-ai-racket',
      TABLE_TENNIS_THEME.paddle.aiBase,
      TABLE_TENNIS_THEME.paddle.aiHighlight,
      TABLE_TENNIS_THEME.paddle.rim,
      0x4c7597
    );
    this.playerPaddleShadow = this.add.ellipse(640, 650, 74, 16, 0x000000, TABLE_TENNIS_THEME.paddle.shadowAlpha).setDepth(7);
    this.aiPaddleShadow = this.add.ellipse(640, 161, 68, 14, 0x000000, TABLE_TENNIS_THEME.paddle.shadowAlpha).setDepth(7);
    this.playerPaddle = this.add.image(640, 642, 'tt-paddle-player-bar').setDepth(8);
    this.aiPaddle = this.add.image(640, 166, 'tt-paddle-ai-bar').setDepth(8);

    this.targetSprite = this.add.circle(640, 246, this.targetRadius, 0xffdb5f, 0.22).setStrokeStyle(3, 0xffdb5f).setDepth(4);
    this.targetSprite.setVisible(false);

    for (let i = 0; i < 16; i += 1) {
      this.trajectoryDots.push(this.add.circle(640, 420, 3, 0x9ce4ff, 0.65).setVisible(false).setDepth(7));
    }

    for (let i = 0; i < 6; i += 1) {
      this.trailDots.push(this.add.circle(640, 420, 5, 0xffffff, 0).setDepth(8.5));
      this.impactRings.push(this.add.circle(640, 420, 6, 0xffffff, 0).setStrokeStyle(2, 0xffffff, 0).setDepth(10));
    }
    for (let i = 0; i < 18; i += 1) {
      this.impactSpecks.push(this.add.circle(640, 420, 1.6, 0xffffff, 0).setDepth(10.2));
    }

    this.applyPaddleVisualMode();
    this.applyVisualDebugFlags();
  }

  private createHud() {
    this.hudScore = this.add.text(640, 14, '', buildTextStyle(34, TABLE_TENNIS_THEME.ui.textPrimary, '600')).setOrigin(0.5, 0).setDepth(20);
    this.hudSubline = this.add
      .text(640, 52, 'You vs AI', buildTextStyle(13, TABLE_TENNIS_THEME.ui.textSecondary, '500'))
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.hudServer = this.add
      .text(640, 74, '', {
        ...buildTextStyle(12, TABLE_TENNIS_THEME.ui.textPrimary, '600'),
        backgroundColor: TABLE_TENNIS_THEME.ui.chipBg
      })
      .setPadding(10, 6, 10, 6)
      .setOrigin(0.5, 0)
      .setDepth(21);
    this.hudHint = this.add.text(640, 102, '', buildTextStyle(13, TABLE_TENNIS_THEME.ui.textMuted, '500')).setOrigin(0.5, 0).setDepth(20);
    this.hudToast = this.add
      .text(640, 340, '', {
        ...buildTextStyle(15, TABLE_TENNIS_THEME.ui.textPrimary, '600'),
        backgroundColor: '#10263a'
      })
      .setOrigin(0.5)
      .setPadding(12, 8, 12, 8)
      .setDepth(35)
      .setVisible(false);

    const scrim = this.add.rectangle(640, 360, 1280, 720, 0x050d16, 0.46).setDepth(31);
    const helper = this.add
      .text(640, 548, 'Tap Serve, then swipe up to put ball in play.', buildTextStyle(13, TABLE_TENNIS_THEME.ui.textPrimary, '500'))
      .setOrigin(0.5)
      .setDepth(32);
    this.serveButton = this.add
      .text(640, 603, 'Serve', {
        ...buildTextStyle(17, TABLE_TENNIS_THEME.ui.buttonPrimaryText, '600'),
        backgroundColor: TABLE_TENNIS_THEME.ui.buttonPrimaryBg
      })
      .setOrigin(0.5)
      .setPadding(20, 12, 20, 12)
      .setDepth(33)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.roundState !== 'await_serve_tap') return;
        if (this.currentServer() !== 0) return;
        this.roundState = 'await_swipe';
        this.serveButton.setVisible(false);
        this.coachmarkContainer.setVisible(false);
        this.hudHint.setText('Swipe up to serve. Curve to add spin.');
        this.playCue('ui');
      });
    applyButtonStyle(this.serveButton, 'primary');
    this.coachmarkContainer = this.add.container(0, 0, [scrim, helper]).setDepth(31).setVisible(false);
    this.serveButton.setVisible(false);
  }

  private createMenu() {
    const rows: MenuRow[] = [
      {
        label: () => `Mode: ${modeLabel(this.settings.mode)}`,
        onClick: () => {
          const order: StoredSettings['mode'][] = ['quick_match', 'best_of_3', 'practice'];
          const idx = order.indexOf(this.settings.mode);
          this.settings.mode = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => `Difficulty: ${difficultyLabel(this.settings.difficulty)}`,
        onClick: () => {
          const order: StoredSettings['difficulty'][] = ['easy', 'medium', 'hard'];
          const idx = order.indexOf(this.settings.difficulty);
          this.settings.difficulty = order[(idx + 1) % order.length];
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
        label: () => `Spin Assist: ${this.settings.spinAssist ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.spinAssist = !this.settings.spinAssist;
          this.refreshMenu();
        }
      },
      {
        label: () => `Show Trajectory: ${this.settings.showTrajectory ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.showTrajectory = !this.settings.showTrajectory;
          this.refreshMenu();
        }
      },
      {
        label: () => `Visuals: ${this.settings.visualMode === 'polished' ? 'Polished' : 'Classic'}`,
        onClick: () => {
          this.settings.visualMode = this.settings.visualMode === 'polished' ? 'classic' : 'polished';
          this.drawTable();
          this.applyPaddleVisualMode();
          this.applyVisualDebugFlags();
          this.refreshMenu();
        }
      },
      {
        label: () => `Ball Trail: ${this.settings.showBallTrail ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.showBallTrail = !this.settings.showBallTrail;
          this.refreshMenu();
        }
      },
      {
        label: () => `Debug Light: ${this.settings.debugDirectionalLight ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.debugDirectionalLight = !this.settings.debugDirectionalLight;
          this.applyVisualDebugFlags();
          this.refreshMenu();
        }
      },
      {
        label: () => `Debug VFX: ${this.settings.debugVfx ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.debugVfx = !this.settings.debugVfx;
          this.refreshMenu();
        }
      },
      {
        label: () => `Debug Vignette: ${this.settings.debugVignette ? 'On' : 'Off'}`,
        onClick: () => {
          this.settings.debugVignette = !this.settings.debugVignette;
          this.applyVisualDebugFlags();
          this.refreshMenu();
        }
      },
      {
        label: () => `Sensitivity: ${this.settings.sensitivity}`,
        onClick: () => {
          const order: StoredSettings['sensitivity'][] = ['low', 'medium', 'high'];
          const idx = order.indexOf(this.settings.sensitivity);
          this.settings.sensitivity = order[(idx + 1) % order.length];
          this.refreshMenu();
        }
      },
      {
        label: () => 'Reset Serve Tutorial',
        onClick: () => {
          this.settings.tutorialComplete = false;
          this.showToast('Serve tutorial reset.');
          this.refreshMenu();
        }
      },
      {
        label: () => 'Start Match',
        onClick: () => {
          this.startConfiguredMode();
        }
      }
    ];

    const children: Phaser.GameObjects.GameObject[] = [];
    const panel = this.add.rectangle(640, 360, 580, 600, 0x0c1d2f, 0.94).setStrokeStyle(2, 0x2f5f82);
    const title = this.add
      .text(640, 126, 'Table Tennis', buildTextStyle(40, TABLE_TENNIS_THEME.ui.textPrimary, '600'))
      .setOrigin(0.5);
    const subtitle = this.add
      .text(640, 168, 'Quick Match, Best of 3, or Target Practice', buildTextStyle(14, TABLE_TENNIS_THEME.ui.textSecondary, '500'))
      .setOrigin(0.5);

    children.push(panel, title, subtitle);

    this.menuRows = [];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const text = this.add
        .text(640, 224 + i * 42, row.label(), buildTextStyle(16, TABLE_TENNIS_THEME.ui.textPrimary, '600'))
        .setOrigin(0.5)
        .setPadding(18, 12, 18, 12)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          row.onClick();
          this.playCue('ui');
        });
      applyButtonStyle(text, i === rows.length - 1 ? 'primary' : i === rows.length - 2 ? 'ghost' : 'secondary');

      this.menuRows.push(text);
      children.push(text);
    }

    const hint = this.add
      .text(640, 614, 'Serve: Tap Serve, then swipe up to strike. Toggle Visuals for A/B checks.', buildTextStyle(13, TABLE_TENNIS_THEME.ui.textSecondary, '500'))
      .setOrigin(0.5);

    children.push(hint);

    this.menuContainer = this.add.container(0, 0, children).setDepth(60);
  }

  private createEndScreen() {
    const panel = this.add.rectangle(640, 360, 540, 480, 0x091624, 0.94).setStrokeStyle(2, 0x376589);
    this.endText = this.add
      .text(640, 206, '', { ...buildTextStyle(24, TABLE_TENNIS_THEME.ui.textPrimary, '600'), align: 'center' })
      .setOrigin(0.5, 0);

    const rematch = this.add
      .text(640, 486, 'Rematch', buildTextStyle(17, TABLE_TENNIS_THEME.ui.buttonPrimaryText, '600'))
      .setOrigin(0.5)
      .setPadding(20, 12, 20, 12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.startConfiguredMode();
      });
    applyButtonStyle(rematch, 'primary');

    const settings = this.add
      .text(640, 540, 'Change Settings', buildTextStyle(17, TABLE_TENNIS_THEME.ui.buttonSecondaryText, '600'))
      .setOrigin(0.5)
      .setPadding(18, 12, 18, 12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.showMenu();
      });
    applyButtonStyle(settings, 'secondary');

    const back = this.add
      .text(640, 592, 'Back to Lobby', buildTextStyle(17, TABLE_TENNIS_THEME.ui.buttonGhostText, '600'))
      .setOrigin(0.5)
      .setPadding(18, 12, 18, 12)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.hooks.backToLobby();
      });
    applyButtonStyle(back, 'ghost');

    this.endContainer = this.add.container(0, 0, [panel, this.endText, rematch, settings, back]).setDepth(61).setVisible(false);
  }

  private createInputBindings() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.menuContainer.visible || this.endContainer.visible) return;
      this.playerPaddleX = this.screenToTableX(pointer.x);
      this.swipe.pointerDown(pointer.id, pointer.x, pointer.y, performance.now());
      if (this.roundState === 'rally') {
        this.queuePlayerShot(
          {
            dirX: clamp((this.screenToTableX(pointer.x) - this.playerPaddleX) / 160, -0.5, 0.5),
            speed: 0.64,
            spin: 0,
            spinHint: 'none'
          },
          performance.now()
        );
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.playerPaddleX = this.screenToTableX(pointer.x);
      if (!this.swipe.isActive()) return;
      this.swipe.pointerMove(pointer.id, pointer.x, pointer.y, performance.now());
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const swipe = this.swipe.pointerUp(pointer.id, pointer.x, pointer.y, performance.now());
      if (!swipe) {
        if (this.roundState === 'rally') {
          this.queuePlayerShot(
            {
              dirX: clamp((this.screenToTableX(pointer.x) - this.playerPaddleX) / 160, -0.5, 0.5),
              speed: 0.62,
              spin: 0,
              spinHint: 'none'
            },
            performance.now()
          );
        }
        return;
      }
      if (this.roundState !== 'await_swipe' && this.roundState !== 'rally') return;

      const shot = swipeToShot(swipe, this.settings.sensitivity, this.settings.assist, this.settings.spinAssist);

      if (this.roundState === 'await_swipe') {
        if (this.currentServer() !== 0) return;
        this.tryPlayerHit(shot, true);
        return;
      }

      this.queuePlayerShot(shot, performance.now());
    });
  }

  private showMenu() {
    this.roundState = 'menu';
    this.menuContainer.setVisible(true);
    this.endContainer.setVisible(false);
    this.targetSprite.setVisible(false);
    this.serveButton.setVisible(false);
    this.coachmarkContainer.setVisible(false);
    this.ball.active = false;
    this.refreshMenu();
  }

  private refreshMenu() {
    const labels = [
      `Mode: ${modeLabel(this.settings.mode)}`,
      `Difficulty: ${difficultyLabel(this.settings.difficulty)}`,
      `Assist: ${this.settings.assist ? 'On' : 'Off'}`,
      `Spin Assist: ${this.settings.spinAssist ? 'On' : 'Off'}`,
      `Show Trajectory: ${this.settings.showTrajectory ? 'On' : 'Off'}`,
      `Visuals: ${this.settings.visualMode === 'polished' ? 'Polished' : 'Classic'}`,
      `Ball Trail: ${this.settings.showBallTrail ? 'On' : 'Off'}`,
      `Debug Light: ${this.settings.debugDirectionalLight ? 'On' : 'Off'}`,
      `Debug VFX: ${this.settings.debugVfx ? 'On' : 'Off'}`,
      `Debug Vignette: ${this.settings.debugVignette ? 'On' : 'Off'}`,
      `Sensitivity: ${this.settings.sensitivity}`,
      'Reset Serve Tutorial',
      'Start Match'
    ];

    for (let i = 0; i < this.menuRows.length; i += 1) {
      this.menuRows[i].setText(labels[i]);
    }
  }

  private startConfiguredMode() {
    this.options = {
      mode: this.settings.mode,
      difficulty: this.settings.difficulty,
      assist: this.settings.assist,
      spinAssist: this.settings.spinAssist,
      showTrajectory: this.settings.showTrajectory,
      sensitivity: this.settings.sensitivity
    };

    saveStoredSettings(this.settings);

    this.stats.rallies = 0;
    this.stats.winners = 0;
    this.stats.unforcedErrors = 0;
    this.playerPaddleX = 0;
    this.aiPaddleX = 0;
    this.scoreSignature = '';
    this.drawTable();
    this.applyPaddleVisualMode();
    this.applyVisualDebugFlags();

    if (this.options.mode === 'practice') {
      this.practice = createPracticeState(20);
      this.scoring = null;
      this.targetSprite.setVisible(true);
      this.resetTarget();
    } else {
      this.practice = null;
      this.scoring = createScoringState(this.options.mode === 'best_of_3' ? 'best_of_3' : 'single_game', 0);
      this.targetSprite.setVisible(false);
    }

    this.menuContainer.setVisible(false);
    this.endContainer.setVisible(false);

    this.roundState = 'between_points';
    this.nextPointCountdownMs = 0;
    this.rallyHits = 0;
    this.practiceAwardThisRally = 0;

    this.hooks.reportEvent({
      type: 'game_start',
      gameId: this.hooks.gameId,
      mode: this.options.mode,
      difficulty: this.options.difficulty,
      options: {
        assist: this.options.assist,
        spinAssist: this.options.spinAssist,
        showTrajectory: this.options.showTrajectory,
        sensitivity: this.options.sensitivity
      }
    });

    this.bootedMatch = true;
    this.prepareNextPoint(0);
  }

  private prepareNextPoint(delayMs: number) {
    this.roundState = 'between_points';
    this.nextPointCountdownMs = delayMs;
    this.serveButton.setVisible(false);
    this.coachmarkContainer.setVisible(false);
    this.pendingPlayerShot = null;
    this.pendingPlayerShotExpireMs = 0;
  }

  private startPoint() {
    this.practiceAwardThisRally = 0;
    this.rallyHits = 0;
    this.pendingPlayerShot = null;
    this.pendingPlayerShotExpireMs = 0;

    const server: PlayerIndex = this.options.mode === 'practice' ? 0 : this.currentServer();
    resetBallForServer(this.ball, server);
    this.ball.x = server === 0 ? this.playerPaddleX : this.aiPaddleX;

    this.roundState = 'await_serve_tap';
    this.aiServeCountdownMs = 780;

    if (server === 0) {
      this.coachmarkContainer.setVisible(this.settings.tutorialComplete === false);
      this.serveButton.setVisible(true);
      this.hudHint.setText('Tap Serve, then swipe up to put ball in play.');
    } else {
      this.coachmarkContainer.setVisible(false);
      this.serveButton.setVisible(false);
      this.hudHint.setText('AI serving... get ready to return.');
    }
  }

  private updateRoundState(time: number, delta: number) {
    if (this.roundState === 'menu' || this.roundState === 'ended') return;

    const dtS = Math.min(0.033, delta / 1000);
    const aiProfile = getAiProfile(this.settings.difficulty);

    if (this.roundState === 'between_points') {
      this.nextPointCountdownMs -= delta;
      if (this.nextPointCountdownMs <= 0) {
        this.startPoint();
      }
      return;
    }

    this.playerPaddleX = clamp(this.playerPaddleX, -210, 210);
    this.aiPaddleX = clamp(this.aiPaddleX, -210, 210);

    if (this.roundState === 'await_serve_tap' && this.currentServer() === 1) {
      this.aiServeCountdownMs -= delta;
      if (this.aiServeCountdownMs <= 0) {
        const serveShot: PaddleShot = {
          dirX: clamp((this.playerPaddleX - this.aiPaddleX) / 260, -0.8, 0.8),
          speed: 0.66,
          spin: 0.12,
          spinHint: 'none'
        };
        this.ball.x = this.aiPaddleX;
        this.ball.y = -240;
        this.ball.z = 20;
        applyPaddleHit(this.ball, serveShot, 1, true);
        this.rallyHits += 1;
        this.roundState = 'rally';
        this.aiReactionAtMs = time + aiProfile.reactionMs;
        this.playCue('paddle_light');
        this.triggerImpactVfx(this.ball.x, this.ball.y, 0xa8d8ff);
      }
    }

    if (this.roundState === 'rally') {
      this.consumePendingPlayerShot(time);
      this.updateAiPaddle(time, dtS);
      stepBallPhysics(this.ball, dtS, DEFAULT_TABLE_PHYSICS, this.physicsScratch, this.physicsResult);
      this.consumePendingPlayerShot(time);

      if (this.physicsResult.bounceSide !== -1) {
        this.playCue('bounce');
        this.triggerImpactVfx(this.ball.x, this.ball.y, 0xe6f3ff);
      }

      if (this.options.mode === 'practice' && this.physicsResult.bounceSide === 1 && this.practiceAwardThisRally === 0) {
        const dx = this.ball.x - this.targetX;
        const dy = this.ball.y - this.targetY;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq <= this.targetRadius * this.targetRadius) {
          this.practiceAwardThisRally = this.targetValue;
          this.playCue('point');
          triggerHaptic(12);
          this.resetTarget();
        }
      }

      if (this.physicsResult.ended) {
        const winner = this.resolveWinner(this.physicsResult.reason, this.physicsResult.winner);
        this.endPoint(winner, this.physicsResult.reason ?? 'out');
        return;
      }
    }

    const predicted = predictBallXAtY(this.ball, -240);
    const aiStep = aiProfile.moveSpeed * dtS;
    const aiDelta = clamp(predicted - this.aiPaddleX, -aiStep, aiStep);
    this.aiPaddleX = clamp(this.aiPaddleX + aiDelta, -210, 210);
  }

  private updateAiPaddle(time: number, dtS: number) {
    const aiProfile = getAiProfile(this.settings.difficulty);
    const targetX = this.ball.vy < 0 ? predictBallXAtY(this.ball, -235) : 0;
    const step = aiProfile.moveSpeed * dtS;
    const delta = clamp(targetX - this.aiPaddleX, -step, step);
    this.aiPaddleX = clamp(this.aiPaddleX + delta, -210, 210);

    const canHit =
      this.ball.active &&
      this.ball.vy < 0 &&
      this.ball.y < -148 &&
      this.ball.y > -292 &&
      this.ball.z < 132 &&
      Math.abs(this.ball.x - this.aiPaddleX) <= (this.settings.assist ? 84 : 68);

    if (!canHit || time < this.aiReactionAtMs) return;

    const decision = decideAiReturn(this.settings.difficulty, this.ball, Math.random, 1, DEFAULT_TABLE_PHYSICS.tableHalfWidth);
    this.aiReactionAtMs = time + aiProfile.reactionMs;

    if (decision.miss) return;

    const dir = clamp((decision.aimX - this.ball.x) / 180, -1, 1);
    const shot: PaddleShot = {
      dirX: dir,
      speed: decision.speed,
      spin: decision.spin,
      spinHint: 'none'
    };

    applyPaddleHit(this.ball, shot, 1);
    this.rallyHits += 1;
    this.playCue(decision.aggressive ? 'paddle_heavy' : 'paddle_light');
    this.triggerImpactVfx(this.ball.x, this.ball.y, 0xa8d8ff);
    triggerHaptic(8);
  }

  private tryPlayerHit(shot: PaddleShot, isServe: boolean): boolean {
    if (isServe) {
      this.ball.x = this.playerPaddleX;
      this.ball.y = 238;
      this.ball.z = 19;
      applyPaddleHit(this.ball, shot, 0, true);
      this.rallyHits += 1;
      this.roundState = 'rally';
      this.aiReactionAtMs = performance.now() + getAiProfile(this.settings.difficulty).reactionMs;
      this.playCue('paddle_light');
      this.triggerImpactVfx(this.ball.x, this.ball.y, TABLE_TENNIS_THEME.paddle.playerBase);
      this.showToast(`Spin: ${spinLabel(shot.spinHint)}`);
      if (!this.settings.tutorialComplete) {
        this.settings.tutorialComplete = true;
        saveStoredSettings(this.settings);
        this.coachmarkContainer.setVisible(false);
      }
      triggerHaptic(8);
      return true;
    }

    const inWindow =
      this.ball.active &&
      this.ball.vy > 0 &&
      this.ball.y > 120 &&
      this.ball.y < 316 &&
      this.ball.z < 132 &&
      Math.abs(this.ball.x - this.playerPaddleX) <= (this.settings.assist ? 112 : 86);

    if (!inWindow) return false;

    applyPaddleHit(this.ball, shot, 0);
    this.rallyHits += 1;
    this.playCue(shot.speed > 0.82 ? 'paddle_heavy' : 'paddle_light');
    this.triggerImpactVfx(this.ball.x, this.ball.y, TABLE_TENNIS_THEME.paddle.playerBase);
    this.showToast(`Spin: ${spinLabel(shot.spinHint)}`);
    triggerHaptic(8);
    return true;
  }

  private queuePlayerShot(shot: PaddleShot, nowMs: number) {
    this.pendingPlayerShot = shot;
    this.pendingPlayerShotExpireMs = nowMs + 220;
    this.tryPlayerHit(shot, false);
  }

  private consumePendingPlayerShot(nowMs: number) {
    if (!this.pendingPlayerShot) return;
    if (nowMs > this.pendingPlayerShotExpireMs) {
      this.pendingPlayerShot = null;
      return;
    }
    if (this.tryPlayerHit(this.pendingPlayerShot, false)) {
      this.pendingPlayerShot = null;
    }
  }

  private resolveWinner(reason: PointEndReason | null, winner: PlayerIndex | null): PlayerIndex {
    if (winner !== null) return winner;
    if (reason === 'double_bounce') {
      return this.ball.y >= 0 ? 1 : 0;
    }
    return this.ball.lastHitter === 0 ? 1 : 0;
  }

  private endPoint(winner: PlayerIndex, reason: PointEndReason) {
    this.roundState = 'between_points';
    this.ball.active = false;
    this.serveButton.setVisible(false);
    this.coachmarkContainer.setVisible(false);
    this.stats.rallies += 1;

    if (winner === 0 && reason !== 'miss') {
      this.stats.winners += 1;
    }
    if (winner === 1 && (reason === 'out' || reason === 'net')) {
      this.stats.unforcedErrors += 1;
    }

    if (reason === 'net') {
      this.playCue('net');
    }

    this.playCue('point');
    triggerHaptic([14, 10, 16]);
    this.animateScorePop();

    if (this.options.mode === 'practice') {
      if (!this.practice) return;
      this.practice = registerPracticeShot(this.practice, this.practiceAwardThisRally);
      this.practiceAwardThisRally = 0;

      if (this.practice.ended) {
        this.finishMatch();
      } else {
        this.prepareNextPoint(700);
      }
      return;
    }

    if (!this.scoring) return;
    this.scoring = awardPoint(this.scoring, winner);
    if (this.scoring.matchWinner !== null) {
      this.finishMatch();
      return;
    }

    this.prepareNextPoint(680);
  }

  private finishMatch() {
    this.roundState = 'ended';
    this.endContainer.setVisible(true);
    this.serveButton.setVisible(false);
    this.coachmarkContainer.setVisible(false);

    if (this.options.mode === 'practice') {
      const practice = this.practice ?? createPracticeState(20);
      this.endText.setText(
        `Practice Complete\nScore: ${practice.score}\nTargets Hit: ${practice.targetHits}/${practice.totalBalls}\nRallies: ${this.stats.rallies}\nWinners: ${this.stats.winners}\nUnforced Errors: ${this.stats.unforcedErrors}`
      );

      this.hooks.reportEvent({
        type: 'game_end',
        gameId: this.hooks.gameId,
        mode: 'practice',
        winner: 'player',
        finalScore: `${practice.score}`,
        matchStats: {
          rallies: this.stats.rallies,
          winners: this.stats.winners,
          unforcedErrors: this.stats.unforcedErrors,
          targetHits: practice.targetHits,
          score: practice.score
        }
      });
      return;
    }

    const scoring = this.scoring;
    if (!scoring) return;

    const winner = scoring.matchWinner === 0 ? 'player' : 'ai';
    const finalScore = `${scoring.points[0]}-${scoring.points[1]}`;
    const games = `${scoring.gamesWon[0]}-${scoring.gamesWon[1]}`;

    this.endText.setText(
      `Winner: ${winner === 'player' ? 'You' : 'AI'}\nFinal Game: ${finalScore}\nGames Won: ${games}\nRallies: ${this.stats.rallies}\nWinners: ${this.stats.winners}\nUnforced Errors: ${this.stats.unforcedErrors}`
    );

    this.hooks.reportEvent({
      type: 'game_end',
      gameId: this.hooks.gameId,
      mode: this.options.mode,
      winner,
      finalScore,
      matchStats: {
        rallies: this.stats.rallies,
        winners: this.stats.winners,
        unforcedErrors: this.stats.unforcedErrors,
        gamesWon: games
      }
    });
  }

  private currentServer(): PlayerIndex {
    if (this.options.mode === 'practice') return 0;
    if (!this.scoring) return 0;
    return this.scoring.currentServer;
  }

  private updateHud() {
    if (!this.bootedMatch || this.menuContainer.visible) {
      this.hudScore.setText('Table Tennis');
      this.hudSubline.setText('You vs AI');
      this.hudServer.setText('Ready');
      this.hudHint.setText('Adjust settings, then start a match.');
      return;
    }

    if (this.options.mode === 'practice') {
      const practice = this.practice;
      if (!practice) return;
      const scoreLine = `${practice.score}`;
      this.hudScore.setText(scoreLine);
      this.hudSubline.setText(`Practice • ${practice.ballsTaken}/${practice.totalBalls} balls`);
      this.hudServer.setText('You vs AI');
      this.maybeAnimateScore(scoreLine);
      if (this.roundState === 'ended') {
        this.hudHint.setText('Practice ended. Rematch or change settings.');
      } else if (this.roundState === 'await_serve_tap') {
        this.hudHint.setText('Tap Serve, then swipe up to put the ball in play.');
      } else {
        this.hudHint.setText('Swipe to return. Curve up for topspin, down for backspin.');
      }
      return;
    }

    if (!this.scoring) return;
    const scoreLine = `${this.scoring.points[0]} - ${this.scoring.points[1]}`;
    this.hudScore.setText(scoreLine);
    this.hudSubline.setText('You vs AI');
    this.maybeAnimateScore(scoreLine);
    const gameText = this.options.mode === 'best_of_3' ? ` | Games ${this.scoring.gamesWon[0]}-${this.scoring.gamesWon[1]}` : '';
    this.hudServer.setText(`Server: ${this.currentServer() === 0 ? 'You' : 'AI'}${gameText}`);

    if (this.roundState === 'await_swipe') {
      this.hudHint.setText('Swipe up quickly to serve. Left/right changes direction.');
    } else if (this.roundState === 'rally') {
      this.hudHint.setText('Return with timing. Keep swipes clean for control.');
    } else if (this.roundState === 'await_serve_tap') {
      this.hudHint.setText('Tap Serve to begin the point.');
    } else {
      this.hudHint.setText(' ');
    }
  }

  private updateBallVisual() {
    const projected = this.worldToScreen(this.ball.x, this.ball.y, this.ball.z);
    const shadowProjected = this.worldToScreen(this.ball.x, this.ball.y, 0);
    const heightT = clamp(this.ball.z / 130, 0, 1);
    const speedT = clamp(Math.hypot(this.ball.vx, this.ball.vy) / 900, 0, 1);

    this.ballSprite.setPosition(snap(projected.x), snap(projected.y));
    this.ballHighlight.setPosition(snap(projected.x - (2.4 + heightT * 1.8)), snap(projected.y - (2.8 + heightT * 1.2)));
    this.shadowSprite.setPosition(snap(shadowProjected.x + 2 + heightT), snap(shadowProjected.y + 8 + heightT * 2));

    const scale = clamp(0.86 + this.ball.z / 120, 0.78, 1.3);
    this.ballSprite.setScale(scale);
    this.ballHighlight.setScale(scale);
    this.shadowSprite.setScale(1 + heightT * 0.28 + speedT * 0.08, 1 + heightT * 0.22 + speedT * 0.06);
    const shadowAlpha = Phaser.Math.Linear(TABLE_TENNIS_THEME.ball.shadowAlphaNear, TABLE_TENNIS_THEME.ball.shadowAlphaFar, heightT);
    this.shadowSprite.setFillStyle(0x000000, shadowAlpha);

    const playerX = this.worldToScreen(this.playerPaddleX, 258, 0).x;
    const aiX = this.worldToScreen(this.aiPaddleX, -258, 0).x;
    const playerRacket = this.settings.visualMode === 'polished';
    this.playerPaddle.setPosition(snap(playerX), playerRacket ? 636 : 650);
    this.aiPaddle.setPosition(snap(aiX), playerRacket ? 170 : 156);
    this.playerPaddleShadow.setPosition(snap(playerX + 2), playerRacket ? 654 : 658);
    this.aiPaddleShadow.setPosition(snap(aiX + 2), playerRacket ? 165 : 164);

    const targetScreen = this.worldToScreen(this.targetX, this.targetY, 0);
    this.targetSprite.setPosition(targetScreen.x, targetScreen.y);

    this.updateBallTrail(projected.x, projected.y);
  }

  private updateTrajectory() {
    if (!this.options?.showTrajectory || !this.ball.active || this.roundState !== 'rally') {
      for (let i = 0; i < this.trajectoryDots.length; i += 1) {
        this.trajectoryDots[i].setVisible(false);
      }
      return;
    }

    let x = this.ball.x;
    let y = this.ball.y;
    let z = this.ball.z;
    let vx = this.ball.vx;
    let vy = this.ball.vy;
    let vz = this.ball.vz;

    for (let i = 0; i < this.trajectoryDots.length; i += 1) {
      const dot = this.trajectoryDots[i];
      vx += this.ball.spinX * DEFAULT_TABLE_PHYSICS.spinDrift * 0.001 * 0.03;
      vy += this.ball.spinY * DEFAULT_TABLE_PHYSICS.spinDrive * 0.03;
      vz += DEFAULT_TABLE_PHYSICS.gravity * 0.03;
      x += vx * 0.03;
      y += vy * 0.03;
      z = Math.max(0, z + vz * 0.03);

      const p = this.worldToScreen(x, y, z);
      dot.setPosition(p.x, p.y).setVisible(true);
    }
  }

  private updateBallTrail(x: number, y: number) {
    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    const enabled = this.settings.visualMode === 'polished' && this.settings.showBallTrail && speed > 340 && this.ball.active;
    if (!enabled) {
      for (let i = 0; i < this.trailDots.length; i += 1) this.trailDots[i].setAlpha(0);
      return;
    }

    const dx = -this.ball.vx * 0.007;
    const dy = -this.ball.vy * 0.007;
    for (let i = 0; i < this.trailDots.length; i += 1) {
      const t = i + 1;
      this.trailDots[i]
        .setPosition(snap(x + dx * t), snap(y + dy * t))
        .setScale(1 - t * 0.08)
        .setFillStyle(0xffffff, 0.14 - t * 0.018);
    }
  }

  private updateToast(time: number) {
    if (!this.hudToast.visible) return;
    if (time >= this.toastHideAt) {
      this.tweens.add({
        targets: this.hudToast,
        alpha: 0,
        duration: 180,
        onComplete: () => this.hudToast.setVisible(false)
      });
      this.toastHideAt = Number.POSITIVE_INFINITY;
    }
  }

  private showToast(text: string) {
    this.hudToast.setText(text).setVisible(true).setAlpha(1);
    this.toastHideAt = this.time.now + 1000;
  }

  private triggerImpactVfx(worldX: number, worldY: number, color: number) {
    if (this.settings.visualMode !== 'polished' || !this.settings.debugVfx) return;

    const projected = this.worldToScreen(worldX, worldY, 12);
    const ring = this.impactRings[this.ringCursor % this.impactRings.length];
    this.ringCursor += 1;
    ring
      .setPosition(snap(projected.x), snap(projected.y))
      .setRadius(6)
      .setStrokeStyle(2, color, TABLE_TENNIS_THEME.vfx.ringAlpha)
      .setAlpha(1);
    this.tweens.add({
      targets: ring,
      scale: TABLE_TENNIS_THEME.vfx.ringScale,
      alpha: 0,
      duration: TABLE_TENNIS_THEME.vfx.ringDurationMs,
      ease: 'Cubic.Out',
      onComplete: () => ring.setScale(1)
    });
    for (let i = 0; i < TABLE_TENNIS_THEME.vfx.speckCount; i += 1) {
      const speck = this.impactSpecks[this.speckCursor % this.impactSpecks.length];
      this.speckCursor += 1;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const speed = 10 + Math.random() * 14;
      speck.setPosition(snap(projected.x), snap(projected.y)).setFillStyle(color, 0.65).setAlpha(0.9);
      this.tweens.add({
        targets: speck,
        x: speck.x + Math.cos(angle) * speed,
        y: speck.y + Math.sin(angle) * speed,
        alpha: 0,
        duration: TABLE_TENNIS_THEME.vfx.speckDurationMs,
        ease: 'Quad.Out'
      });
    }
    this.tweens.add({
      targets: [this.ballSprite, this.ballHighlight],
      scaleX: '*=1.12',
      scaleY: '*=0.9',
      duration: 80,
      yoyo: true,
      ease: 'Quad.Out'
    });
  }

  private maybeAnimateScore(signature: string) {
    if (signature === this.scoreSignature) return;
    if (this.scoreSignature !== '') this.animateScorePop();
    this.scoreSignature = signature;
  }

  private animateScorePop() {
    if (this.settings.visualMode !== 'polished') return;
    this.tweens.add({
      targets: this.hudScore,
      scaleX: TABLE_TENNIS_THEME.animation.scorePopScale,
      scaleY: TABLE_TENNIS_THEME.animation.scorePopScale,
      duration: Math.round(TABLE_TENNIS_THEME.animation.scorePopDurationMs * 0.5),
      yoyo: true,
      ease: 'Back.Out'
    });
    this.tweens.add({
      targets: this.hudScore,
      alpha: 0.88,
      duration: 90,
      yoyo: true,
      ease: 'Sine.InOut'
    });
    const sparkA = this.add.circle(604, 30, 2, TABLE_TENNIS_THEME.accent, 0.8).setDepth(24);
    const sparkB = this.add.circle(676, 36, 2, TABLE_TENNIS_THEME.accent, 0.8).setDepth(24);
    this.tweens.add({
      targets: [sparkA, sparkB],
      y: '-=16',
      alpha: 0,
      duration: 220,
      ease: 'Quad.Out',
      onComplete: () => {
        sparkA.destroy();
        sparkB.destroy();
      }
    });
  }

  private drawTable() {
    const g = this.tableGfx;
    g.clear();
    if (this.settings.visualMode === 'classic') {
      g.fillGradientStyle(0x082237, 0x082237, 0x0e3c59, 0x0e3c59, 1);
      g.fillRect(0, 0, 1280, 720);

      g.fillStyle(0x1a4f77, 1);
      g.fillRoundedRect(260, 124, 760, 560, 26);
      g.lineStyle(5, 0xd9edff, 1);
      g.strokeRoundedRect(260, 124, 760, 560, 26);

      g.lineStyle(3, 0xd9edff, 0.95);
      g.beginPath();
      g.moveTo(640, 124);
      g.lineTo(640, 684);
      g.strokePath();

      g.beginPath();
      g.moveTo(260, 404);
      g.lineTo(1020, 404);
      g.strokePath();
      this.tableOverlay?.setVisible(false);
      this.tableVignette?.setVisible(false);
      this.tableDirectionalLinear?.setVisible(false);
      this.tableDirectionalSpec?.setVisible(false);
      return;
    }

    g.fillGradientStyle(
      TABLE_TENNIS_THEME.background.deepNavyTop,
      TABLE_TENNIS_THEME.background.deepNavyTop,
      TABLE_TENNIS_THEME.background.deepNavyBottom,
      TABLE_TENNIS_THEME.background.deepNavyBottom,
      1
    );
    g.fillRect(0, 0, 1280, 720);

    g.fillGradientStyle(
      TABLE_TENNIS_THEME.table.farColor,
      TABLE_TENNIS_THEME.table.farColor,
      TABLE_TENNIS_THEME.table.nearColor,
      TABLE_TENNIS_THEME.table.nearColor,
      1
    );
    g.fillRoundedRect(
      TABLE_TENNIS_THEME.table.x,
      TABLE_TENNIS_THEME.table.y,
      TABLE_TENNIS_THEME.table.width,
      TABLE_TENNIS_THEME.table.height,
      TABLE_TENNIS_THEME.table.radius
    );
    g.lineStyle(TABLE_TENNIS_THEME.table.lineWidth, TABLE_TENNIS_THEME.table.lineColor, TABLE_TENNIS_THEME.table.lineAlpha);
    g.strokeRoundedRect(
      TABLE_TENNIS_THEME.table.x,
      TABLE_TENNIS_THEME.table.y,
      TABLE_TENNIS_THEME.table.width,
      TABLE_TENNIS_THEME.table.height,
      TABLE_TENNIS_THEME.table.radius
    );

    g.lineStyle(TABLE_TENNIS_THEME.table.lineWidth, TABLE_TENNIS_THEME.table.lineColor, TABLE_TENNIS_THEME.table.lineAlpha * 0.9);
    g.beginPath();
    g.moveTo(640, 124.5);
    g.lineTo(640, 683.5);
    g.strokePath();

    g.beginPath();
    g.moveTo(260, 404.5);
    g.lineTo(1020, 404.5);
    g.strokePath();

    g.fillStyle(0x000000, TABLE_TENNIS_THEME.net.shadowAlpha);
    g.fillRect(270, 406, 740, TABLE_TENNIS_THEME.net.height);
    g.fillStyle(TABLE_TENNIS_THEME.net.color, TABLE_TENNIS_THEME.net.alpha);
    g.fillRect(270, 403, 740, TABLE_TENNIS_THEME.net.height);
    g.fillStyle(0xffffff, TABLE_TENNIS_THEME.net.highlightAlpha * 0.52);
    g.fillRect(270, 401, 740, 1);

    g.lineStyle(14, 0x000000, 0.11);
    g.strokeRoundedRect(
      TABLE_TENNIS_THEME.table.x + 7,
      TABLE_TENNIS_THEME.table.y + 7,
      TABLE_TENNIS_THEME.table.width - 14,
      TABLE_TENNIS_THEME.table.height - 14,
      TABLE_TENNIS_THEME.table.radius - 4
    );

    this.tableOverlay?.setVisible(true);
    this.tableVignette?.setVisible(true);
    this.tableDirectionalLinear?.setVisible(this.settings.debugDirectionalLight);
    this.tableDirectionalSpec?.setVisible(this.settings.debugDirectionalLight);
  }

  private applyPaddleVisualMode() {
    const polished = this.settings.visualMode === 'polished';
    this.playerPaddle.setTexture(polished ? 'tt-paddle-player-racket' : 'tt-paddle-player-bar');
    this.aiPaddle.setTexture(polished ? 'tt-paddle-ai-racket' : 'tt-paddle-ai-bar');
    this.playerPaddle.setScale(polished ? 1 : 1);
    this.aiPaddle.setScale(polished ? 1 : 1);
    this.playerPaddle.setRotation(0);
    this.aiPaddle.setRotation(Math.PI);
  }

  private applyVisualDebugFlags() {
    const polished = this.settings.visualMode === 'polished';
    this.backgroundVignette?.setVisible(polished && this.settings.debugVignette);
    this.tableVignette?.setVisible(polished && this.settings.debugVignette);
    this.tableDirectionalLinear?.setVisible(polished && this.settings.debugDirectionalLight);
    this.tableDirectionalSpec?.setVisible(polished && this.settings.debugDirectionalLight);
  }

  private worldToScreen(x: number, y: number, z: number): { x: number; y: number } {
    return {
      x: 640 + x * 1.68,
      y: 404 + y * 0.84 - z * 0.6
    };
  }

  private screenToTableX(screenX: number): number {
    return clamp((screenX - 640) / 1.68, -210, 210);
  }

  private resetTarget() {
    const targetXs = [-154, -72, 0, 74, 152];
    const targetYs = [-208, -152, -118, -186, -136];
    const values = [35, 25, 15, 25, 35];
    const idx = Math.floor(Math.random() * targetXs.length);

    this.targetX = targetXs[idx];
    this.targetY = targetYs[idx];
    this.targetValue = values[idx];
  }

  private playCue(cue: 'paddle_light' | 'paddle_heavy' | 'bounce' | 'net' | 'point' | 'ui') {
    if (!this.sound || this.sound.mute) return;
    const ctx = (this.sound as unknown as { context?: AudioContext }).context;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (cue === 'paddle_light') {
      osc.type = 'triangle';
      osc.frequency.value = 420;
    } else if (cue === 'paddle_heavy') {
      osc.type = 'sawtooth';
      osc.frequency.value = 300;
    } else if (cue === 'bounce') {
      osc.type = 'square';
      osc.frequency.value = 180;
    } else if (cue === 'net') {
      osc.type = 'square';
      osc.frequency.value = 120;
    } else if (cue === 'point') {
      osc.type = 'sine';
      osc.frequency.value = 620;
    } else {
      osc.type = 'triangle';
      osc.frequency.value = 380;
    }

    const duration = cue === 'point' ? 0.18 : cue === 'net' ? 0.13 : 0.07;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
