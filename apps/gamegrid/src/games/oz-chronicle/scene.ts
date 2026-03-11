import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { loadState, saveState } from './persistence';
import { hashStringToSeed } from './rng';
import {
  addCompanionMeter,
  canUseGoldenCap,
  completeMapNode,
  createInitialState,
  markBossResult,
  markMiniGameScore,
  markPackCompleted,
  setChapterPosition,
  setReducedMotion,
  setSpectaclesTint,
  unlockSketches,
  useGoldenCapCommand,
  type CompanionId,
  type GoldenCapCommand,
  type OzChronicleState
} from './rules';
import { applyStoryChoice, findChapter, findNode, isChoiceUnlocked, loadChapters } from './story/storyRules';
import { generateOzChapterMap, getMapNode, type OzMap, type OzMapNode, type OzMiniGameId } from './map/mapGen';
import {
  createCycloneState,
  cycloneScore,
  stepCyclone,
  type CycloneConfig,
  type CycloneState,
  DEFAULT_CYCLONE_CONFIG
} from './minigames/cycloneEscape';
import {
  createCornfieldRescueState,
  cornfieldScore,
  stepCornfieldRescue,
  type CornfieldRescueConfig,
  type CornfieldRescueState,
  DEFAULT_CORNFIELD_CONFIG
} from './minigames/cornfieldRescue';
import {
  createSilverSlippersDashState,
  silverSlippersDashScore,
  stepSilverSlippersDash,
  type SilverSlippersDashConfig,
  type SilverSlippersDashState,
  DEFAULT_SILVER_DASH_CONFIG
} from './minigames/silverSlippersDash';
import {
  createOilAndJointsState,
  isOilAndJointsPerfect,
  oilAndJointsScore,
  stepOilAndJoints,
  type OilAndJointsConfig,
  type OilAndJointsState,
  DEFAULT_OIL_AND_JOINTS_CONFIG
} from './minigames/oilAndJoints';
import {
  courageTrialScore,
  createCourageTrialState,
  isCourageTrialPerfect,
  stepCourageTrial,
  type CourageTrialConfig,
  type CourageTrialState,
  DEFAULT_COURAGE_TRIAL_CONFIG
} from './minigames/courageTrial';
import {
  createForestCrossingState,
  forestCrossingScore,
  isForestCrossingPerfect,
  stepForestCrossing,
  type ForestCrossingConfig,
  type ForestCrossingState,
  type ForestObstacle,
  DEFAULT_FOREST_CROSSING_CONFIG
} from './minigames/forestCrossing';
import {
  createKalidahChaseState,
  kalidahChaseScore,
  safestLaneAt,
  stepKalidahChase,
  type KalidahChaseConfig,
  type KalidahChaseState,
  DEFAULT_KALIDAH_CONFIG
} from './minigames/kalidahChase';
import {
  createPoppyRescueState,
  poppyRescueScore,
  stepPoppyRescue,
  type PoppyRescueConfig,
  type PoppyRescueState,
  DEFAULT_POPPY_RESCUE_CONFIG
} from './minigames/poppyRescue';
import {
  createSpectacleFasteningState,
  isSpectacleFasteningPerfect,
  phaseAtTime,
  spectacleFasteningGrade,
  spectacleFasteningScore,
  stepSpectacleFastening,
  type SpectacleFasteningConfig,
  type SpectacleFasteningState,
  DEFAULT_SPECTACLE_FASTENING_CONFIG
} from './minigames/spectacleFastening';
import {
  audiencePerceptionGrade,
  audiencePerceptionScore,
  createAudiencePerceptionState,
  isAudiencePerceptionPerfect,
  stepAudiencePerception,
  type AudiencePerceptionConfig,
  type AudiencePerceptionState,
  DEFAULT_AUDIENCE_PERCEPTION_CONFIG
} from './minigames/audiencePerception';
import {
  createShadowOfTheWestState,
  isShadowOfTheWestPerfect,
  safestCoverLaneAt,
  shadowOfTheWestScore,
  stepShadowOfTheWest,
  type ShadowOfTheWestConfig,
  type ShadowOfTheWestState,
  DEFAULT_SHADOW_OF_THE_WEST_CONFIG
} from './minigames/shadowOfTheWest';
import {
  createWesternHoldEscapeState,
  isWesternHoldEscapePerfect,
  safestLaneAt as safestWesternLaneAt,
  stepWesternHoldEscape,
  westernHoldEscapeScore,
  type WesternHoldEscapeConfig,
  type WesternHoldEscapeState,
  DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
} from './minigames/westernHoldEscape';
import {
  createDousingState,
  dousingScore,
  isDousingPerfect,
  stepDousingTheShadow,
  type DousingState,
  type DousingTheShadowConfig,
  DEFAULT_DOUSING_THE_SHADOW_CONFIG
} from './minigames/dousingTheShadow';
import {
  balloonPhaseAtTime,
  balloonRiggingScore,
  createBalloonRiggingState,
  isBalloonRiggingPerfect,
  stepBalloonRigging,
  type BalloonRiggingConfig,
  type BalloonRiggingState,
  type BalloonRigStepType,
  DEFAULT_BALLOON_RIGGING_CONFIG
} from './minigames/balloonRigging';
import { resolveDeterministicPreset, type DifficultyPreset } from './minigames/tuning';
import minigamesRaw from '../../content/oz-chronicle/minigames.json';
import artPaletteRaw from '../../content/oz-chronicle/artPalette.json';
import sketchesRaw from '../../content/oz-chronicle/sketches.json';
import assetsManifestRaw from './assets/manifest.json';
import { buildLayerPlan, renderLayerPlan } from './visual/sceneComposer';
import { transitionsEnabled } from './visual/motionPolicy';
import { OzVfxPool } from './visual/vfxPool';
import { buildTheme, type OzVisualTheme } from './visual/theme';
import { OzChronicleAudio } from './audio';
import {
  degradeVisualSettings,
  loadVisualSettings,
  saveVisualSettings,
  type OzVisualSettings,
  type OzSkinId
} from './visual/settings';
import { clearContainer, makeButton, makePanel, makeStatChip, setUiTheme } from './ui/components';
import { createSpectaclesOverlay, isSpectaclesOverlayEnabled } from './ui/spectaclesOverlay';

interface OzChronicleSceneConfig {
  hooks: GameRuntimeHooks;
}

type ScreenId = 'map' | 'story' | 'minigame' | 'credits';

interface MiniGameConfigFile {
  difficultyPresets: DifficultyPreset[];
  cycloneEscape: CycloneConfig;
  cornfieldRescue: CornfieldRescueConfig;
  silverSlippersDash: SilverSlippersDashConfig;
  oilAndJoints: OilAndJointsConfig;
  courageTrial: CourageTrialConfig;
  forestCrossing: ForestCrossingConfig;
  kalidahChase: KalidahChaseConfig;
  poppyRescue: PoppyRescueConfig;
  spectacleFastening: SpectacleFasteningConfig;
  audiencePerception: AudiencePerceptionConfig;
  shadowOfTheWest: ShadowOfTheWestConfig;
  westernHoldEscape: WesternHoldEscapeConfig;
  dousingTheShadow: DousingTheShadowConfig;
  balloonRigging: BalloonRiggingConfig;
}

interface PaletteFile {
  tokens: Record<string, string>;
}

interface SketchDef {
  id: string;
  title: string;
  caption: string;
  unlockRule: string;
}

interface SketchFile {
  sketches: SketchDef[];
}

interface AssetManifestFile {
  assets: Array<{ key: string; file: string; role: string }>;
}

const COMPANION_LABEL: Record<CompanionId, string> = {
  scarecrow: 'Scarecrow',
  'tin-woodman': 'Tin Woodman',
  'cowardly-lion': 'Cowardly Lion'
};

const COMPANION_TRAIT: Record<CompanionId, string> = {
  scarecrow: 'Brains',
  'tin-woodman': 'Heart',
  'cowardly-lion': 'Courage'
};

const COMPANION_BIO: Record<CompanionId, string> = {
  scarecrow: 'A straw man who seeks brains from the Wizard.',
  'tin-woodman': 'A rusted woodsman of tin, restored with oil.',
  'cowardly-lion': 'A mighty Lion who asks for true courage.'
};

function parseColor(input: string, fallback: number): number {
  if (!input.startsWith('#')) return fallback;
  const parsed = Number.parseInt(input.slice(1), 16);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

export function simulateOzChronicleBoot(seed: number): {
  start: string;
  nodeCount: number;
  hasPack6Boss: boolean;
  hasPack7Boss: boolean;
  hasPack8Boss: boolean;
  hasPack9Minigame: boolean;
} {
  const map = generateOzChapterMap(seed, 9);
  return {
    start: map.startNodeId,
    nodeCount: map.nodes.length,
    hasPack6Boss: map.nodes.some((node) => node.id === 'shadow-of-the-west' && node.miniGameId === 'shadow-of-the-west'),
    hasPack7Boss: map.nodes.some((node) => node.id === 'western-hold-escape' && node.miniGameId === 'western-hold-escape'),
    hasPack8Boss: map.nodes.some((node) => node.id === 'dousing-the-shadow' && node.miniGameId === 'dousing-the-shadow'),
    hasPack9Minigame: map.nodes.some((node) => node.id === 'balloon-rigging' && node.miniGameId === 'balloon-rigging')
  };
}

export class OzChronicleScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private state!: OzChronicleState;
  private map!: OzMap;
  private screen: ScreenId = 'map';

  private readonly chapters = loadChapters();
  private readonly miniGameConfig = minigamesRaw as MiniGameConfigFile;
  private readonly palette = artPaletteRaw as PaletteFile;
  private readonly sketches = (sketchesRaw as SketchFile).sketches;
  private readonly assetManifest = assetsManifestRaw as AssetManifestFile;
  private visualTheme: OzVisualTheme = buildTheme('engraved-paper');
  private visualSettings!: OzVisualSettings;
  private audio!: OzChronicleAudio;
  private vfx: OzVfxPool | null = null;
  private backdrop!: Phaser.GameObjects.Container;
  private lowFpsMs = 0;
  private fallbackCooldownMs = 0;

  private ink = 0x1f1a16;
  private paper = 0xf8f1de;
  private storm = 0x4d6770;

  private ui!: Phaser.GameObjects.Container;
  private hudTop!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;
  private toast!: Phaser.GameObjects.Text;
  private toastUntil = 0;

  private activeMapNode!: OzMapNode;

  private cycloneState: CycloneState | null = null;
  private cycloneTilt = 0;

  private cornfieldState: CornfieldRescueState | null = null;
  private crowWarningMs = 0;
  private crowDanger = false;

  private dashState: SilverSlippersDashState | null = null;
  private dashObstacleTimerMs = 700;
  private dashDanger = false;

  private oilState: OilAndJointsState | null = null;
  private courageState: CourageTrialState | null = null;
  private courageHold = 0;

  private forestState: ForestCrossingState | null = null;
  private forestObstacleMs = 680;
  private forestObstacle: ForestObstacle = null;
  private kalidahState: KalidahChaseState | null = null;
  private poppyState: PoppyRescueState | null = null;
  private spectacleState: SpectacleFasteningState | null = null;
  private audienceState: AudiencePerceptionState | null = null;
  private shadowState: ShadowOfTheWestState | null = null;
  private shadowTargetLane = 1;
  private shadowHideMs = 0;
  private westernHoldState: WesternHoldEscapeState | null = null;
  private westernHoldTargetLane = 1;
  private westernHideMs = 0;
  private westernCommandQueued = false;
  private dousingState: DousingState | null = null;
  private dousingTargetLane = 1;
  private dousingCommandQueued = false;
  private balloonState: BalloonRiggingState | null = null;
  private bonusBadge: string | null = null;
  private lastPointerX = 0;
  private endReported = false;

  constructor(config: OzChronicleSceneConfig) {
    super('oz-chronicle-main');
    this.hooks = config.hooks;
  }

  preload(): void {
    for (let i = 0; i < this.assetManifest.assets.length; i += 1) {
      const entry = this.assetManifest.assets[i];
      const url = new URL(`./assets/${entry.file}`, import.meta.url).toString();
      this.load.svg(entry.key, url);
    }
  }

  create(): void {
    const seed = this.hooks.multiplayer?.seed ?? hashStringToSeed('oz-chronicle-default-seed');
    this.state = loadState(seed);
    if (this.state.version !== 2) {
      this.state = createInitialState(seed);
    }

    const nodeProgression = Math.floor(this.state.run.completedNodeIds.length / 8) + 1;
    const packProgression = this.state.completedPackIds.length + 1;
    const progressionTier = Math.max(1, Math.min(9, Math.max(nodeProgression, packProgression)));
    this.map = generateOzChapterMap(this.state.run.seed, progressionTier);
    this.visualSettings = loadVisualSettings(this.state.settings.reducedMotion);
    this.visualTheme = buildTheme(this.visualSettings.skin);
    setUiTheme(this.visualTheme);
    this.ink = this.visualTheme.colors.ink;
    this.paper = this.visualTheme.colors.paper;
    this.storm = parseColor(this.palette.tokens.storm ?? '', this.storm);
    this.audio = new OzChronicleAudio(this.hooks.gameId);
    this.registry.set('oz-chronicle-audio', this.audio);
    this.audio.startAmbient(this, 'map');

    this.add.rectangle(640, 360, 1280, 720, this.visualTheme.colors.background, 1);
    this.add.rectangle(640, 675, 1300, 220, this.visualTheme.colors.success, 0.2);

    this.backdrop = this.add.container(0, 0);
    this.ui = this.add.container(0, 0);
    this.hudTop = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0);
    this.vfx = new OzVfxPool(this, this.visualTheme);

    this.toast = this.add
      .text(640, 42, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#f3f3f0',
        backgroundColor: '#263a31'
      })
      .setOrigin(0.5)
      .setPadding(10, 6, 10, 6)
      .setVisible(false);

    this.drawHud();
    this.routeToMap();
    this.reportGameStart();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPointerX = pointer.x;
      this.vfx?.tapRipple(pointer.x, pointer.y, {
        reducedMotion: this.isReducedMotion(),
        density: this.visualSettings.particleDensity
      });
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const movedEnough = Math.abs(pointer.x - this.lastPointerX) >= 6;
      if (movedEnough) this.lastPointerX = pointer.x;

      if (this.screen === 'minigame' && this.cycloneState) {
        this.cycloneTilt = Phaser.Math.Clamp((pointer.x - this.scale.width / 2) / (this.scale.width / 2), -1, 1);
      }

      if (this.screen === 'minigame' && this.courageState) {
        this.courageHold = Phaser.Math.Clamp((this.scale.width / 2 - pointer.x) / (this.scale.width / 2), -1, 1);
      }

      if (this.screen === 'minigame' && this.shadowState && movedEnough) {
        const laneWidth = this.scale.width / 3;
        this.shadowTargetLane = Phaser.Math.Clamp(Math.floor(pointer.x / laneWidth), 0, 2);
      }

      if (this.screen === 'minigame' && this.westernHoldState && movedEnough) {
        const laneWidth = this.scale.width / 3;
        this.westernHoldTargetLane = Phaser.Math.Clamp(Math.floor(pointer.x / laneWidth), 0, 2);
      }

      if (this.screen === 'minigame' && this.dousingState && movedEnough) {
        const laneWidth = this.scale.width / 3;
        this.dousingTargetLane = Phaser.Math.Clamp(Math.floor(pointer.x / laneWidth), 0, 2);
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
      this.registry.remove('oz-chronicle-audio');
    });
  }

  update(): void {
    this.tickAutoFallback();

    if (this.toastUntil > 0 && this.time.now > this.toastUntil) {
      this.toastUntil = 0;
      this.toast.setVisible(false);
    }

    if (this.screen !== 'minigame') return;

    if (this.cycloneState) this.updateCyclone();
    if (this.cornfieldState) this.updateCornfield();
    if (this.dashState) this.updateDash();
    if (this.oilState) this.updateOilAndJoints();
    if (this.courageState) this.updateCourageTrial();
    if (this.forestState) this.updateForestCrossing();
    if (this.kalidahState) this.updateKalidahChase();
    if (this.poppyState) this.updatePoppyRescue();
    if (this.spectacleState) this.updateSpectacleFastening();
    if (this.audienceState) this.updateAudiencePerception();
    if (this.shadowState) this.updateShadowOfTheWest();
    if (this.westernHoldState) this.updateWesternHoldEscape();
    if (this.dousingState) this.updateDousingTheShadow();
    if (this.balloonState) this.updateBalloonRigging();
  }

  private isReducedMotion(): boolean {
    return !transitionsEnabled(this.state.settings.reducedMotion, this.visualSettings.reducedMotion);
  }

  private tickAutoFallback(): void {
    const fps = this.game.loop.actualFps;
    this.fallbackCooldownMs = Math.max(0, this.fallbackCooldownMs - this.game.loop.delta);
    if (fps < 40) {
      this.lowFpsMs += this.game.loop.delta;
    } else {
      this.lowFpsMs = Math.max(0, this.lowFpsMs - this.game.loop.delta * 0.5);
    }

    if (this.lowFpsMs < 2000 || this.fallbackCooldownMs > 0) return;
    const degraded = degradeVisualSettings(this.visualSettings);
    if (degraded.effectsQuality !== this.visualSettings.effectsQuality || degraded.backgroundDetail !== this.visualSettings.backgroundDetail) {
      this.visualSettings = degraded;
      saveVisualSettings(this.visualSettings);
      this.showToast('Graphics auto-fallback applied for stability.');
      this.fallbackCooldownMs = 6000;
    }
    this.lowFpsMs = 0;
  }

  private applyBackdrop(chapterId: string): void {
    clearContainer(this.backdrop);
    const plan = buildLayerPlan(this.state.run.seed, chapterId, this.visualSettings.backgroundDetail);
    renderLayerPlan(this, this.backdrop, this.visualTheme, plan, { reducedMotion: this.isReducedMotion() });
  }

  private playPageTransition(): void {
    if (this.isReducedMotion()) return;
    const veil = this.add.rectangle(640, 360, 1280, 720, this.visualTheme.colors.shadow, 0).setDepth(120);
    this.tweens.add({
      targets: veil,
      alpha: 0.22,
      duration: 120,
      yoyo: true,
      hold: 20,
      onComplete: () => veil.destroy()
    });
  }

  private playMinigameOutcome(success: boolean, perfect = false): void {
    if (success) {
      this.audio.play(perfect ? 'perfect' : 'success');
      return;
    }
    this.audio.play('fail');
  }

  private drawHud(): void {
    clearContainer(this.hudTop);

    const title = this.add.text(24, 14, 'Chronicles of the Silver Road', {
      fontFamily: 'Georgia',
      fontSize: '30px',
      color: '#1f1a16'
    });

    const credits = this.add.text(24, 52, 'Inspired by the 1900 public domain novel by L. Frank Baum.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '16px',
      color: '#2e3e3a'
    });

    const credits2 = this.add.text(24, 72, 'This game is not affiliated with any film adaptation.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '16px',
      color: '#2e3e3a'
    });

    const stats = [
      makeStatChip(this, 780, 40, 'Courage', this.state.stats.courage),
      makeStatChip(this, 940, 40, 'Brains', this.state.stats.brains),
      makeStatChip(this, 1100, 40, 'Heart', this.state.stats.heart)
    ];

    const motionBtn = makeButton(this, 1130, 92, 230, this.state.settings.reducedMotion ? 'Motion: Reduced' : 'Motion: Full', () => {
      this.state = setReducedMotion(this.state, !this.state.settings.reducedMotion);
      this.visualSettings = {
        ...this.visualSettings,
        reducedMotion: this.state.settings.reducedMotion
      };
      saveState(this.state);
      saveVisualSettings(this.visualSettings);
      this.drawHud();
      this.showToast(this.state.settings.reducedMotion ? 'Reduced motion enabled.' : 'Reduced motion disabled.');
    });

    const tintBtn = makeButton(this, 900, 92, 200, this.state.settings.spectaclesTint ? 'Tint: On' : 'Tint: Off', () => {
      this.state = setSpectaclesTint(this.state, !this.state.settings.spectaclesTint);
      saveState(this.state);
      this.drawHud();
      this.showToast(this.state.settings.spectaclesTint ? 'Spectacles tint enabled.' : 'Spectacles tint disabled.');
    }, 0x2f5f4a);

    const sketchbookBtn = makeButton(this, 620, 92, 180, 'Sketchbook', () => this.openSketchbookOverlay(), 0x465466);
    const mementosBtn = makeButton(this, 820, 92, 180, 'Mementos', () => this.openMementosOverlay(), 0x4d5a3c);
    const skinBtn = makeButton(this, 400, 92, 180, `Skin: ${this.visualTheme.label}`, () => this.cycleSkin(), 0x5b5f3c);
    const gfxBtn = makeButton(this, 200, 92, 180, 'Graphics', () => this.openGraphicsOverlay(), 0x3b5968);

    const acquiredIds = (Object.keys(this.state.companions) as CompanionId[]).filter((id) => this.state.companions[id].acquired);
    const companionButtons: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < acquiredIds.length; i += 1) {
      const companionId = acquiredIds[i];
      const companion = this.state.companions[companionId];
      const button = makeButton(
        this,
        210 + i * 220,
        118,
        200,
        `${COMPANION_LABEL[companionId]} ${COMPANION_TRAIT[companionId][0]}:${companion.meter}`,
        () => this.openCompanionOverlay(companionId),
        0x3e594d
      );
      companionButtons.push(button);
    }

    const hudItems: Array<Phaser.GameObjects.GameObject | Phaser.GameObjects.Container> = [
      title,
      credits,
      credits2,
      ...stats,
      motionBtn,
      tintBtn,
      gfxBtn,
      skinBtn,
      sketchbookBtn,
      mementosBtn,
      ...companionButtons
    ];

    if (this.state.goldenCap.acquired) {
      const capPanel = makePanel(this, 1068, 150, 396, 94, 0xf3e3aa, 0.96);
      const capText = this.add.text(890, 132, `Golden Cap Uses: ${this.state.goldenCap.usesRemaining}/3`, {
        fontFamily: 'Trebuchet MS',
        fontSize: '19px',
        color: '#3b2c14'
      });
      const commandBtnLabel = this.goldenCapCommandContext() ? 'Command' : 'Command Locked';
      const commandBtn = makeButton(
        this,
        1188,
        152,
        170,
        commandBtnLabel,
        () => this.triggerGoldenCapCommand('clear-path'),
        this.goldenCapCommandContext() ? 0x65542f : 0x7f7a6a
      );
      if (!this.goldenCapCommandContext()) {
        commandBtn.setAlpha(0.66);
      }
      hudItems.push(capPanel, capText, commandBtn);
    }

    if (this.textures.exists('oz-quest')) {
      const questIcon = this.add.image(36, 116, 'oz-quest').setDisplaySize(26, 26).setTint(this.visualTheme.colors.accent);
      hudItems.push(questIcon);
    }

    this.hudTop.add(hudItems);
  }

  private routeToMap(): void {
    this.screen = 'map';
    clearContainer(this.ui);
    this.applyBackdrop(this.state.run.chapterId);
    this.playPageTransition();
    this.audio.setAmbientMode('map');
    this.audio.play('map');

    this.activeMapNode = getMapNode(this.map, this.state.run.mapNodeId);

    const panel = makePanel(this, 640, 396, 1140, 532, this.paper, 0.97);
    const heading = this.add.text(140, 160, 'Chapter Map', {
      fontFamily: 'Georgia',
      fontSize: '42px',
      color: '#1f1a16'
    });

    const now = this.add.text(140, 228, `Current Node: ${this.activeMapNode.label}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#1f1a16'
    });

    const details = this.add.text(140, 270, `Type: ${this.activeMapNode.type} | Chapter: ${this.activeMapNode.chapterId}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#22302a'
    });

    const trail = this.add.text(140, 310, `Completed Nodes: ${this.state.run.completedNodeIds.length}/${this.map.nodes.length}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#22302a'
    });

    const branchHint = this.activeMapNode.next.length > 1 ? 'Optional branch available after this node.' : 'Main route continues forward.';
    const hint = this.add.text(140, 356, branchHint, {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#2f4b42'
    });

    const questCard = this.state.storyFlags.westwardJourneyUnlocked
      ? this.add.text(
          140,
          402,
          `Quest Card Stage: ${
            this.state.storyFlags.balloonAttempted && this.state.storyFlags.dorothyStillInOz
              ? 'Find Another Way Home'
              : this.state.storyFlags.returnQuestUnlocked
                ? 'Return to Emerald City'
                : this.state.storyFlags.winkieCountryReached
                  ? 'Western Threat'
                  : 'Westward Journey'
          }\n` +
            `Threat Level: ${this.threatLevelLabel(this.state.storyFlags.westThreatLevel)}\n` +
            'Requests: Dorothy home | Scarecrow brains | Tin heart | Lion courage',
          {
            fontFamily: 'Trebuchet MS',
            fontSize: '19px',
            color: '#1f3d2f',
            wordWrap: { width: 980 }
          }
        )
      : null;

    const enter = makeButton(this, 640, 632, 500, 'Enter Node', () => this.enterCurrentNode(), 0x315f50);
    this.ui.add([panel, heading, now, details, trail, hint]);
    if (questCard) this.ui.add(questCard);
    this.ui.add(enter);
  }

  private enterCurrentNode(): void {
    this.activeMapNode = getMapNode(this.map, this.state.run.mapNodeId);
    if (this.activeMapNode.type === 'minigame' && this.activeMapNode.miniGameId) {
      this.routeToMinigame(this.activeMapNode.miniGameId);
      return;
    }
    this.startChapter(this.activeMapNode.chapterId);
  }

  private startChapter(chapterId: string): void {
    const chapter = findChapter(this.chapters, chapterId);
    this.state = setChapterPosition(this.state, chapter.id, chapter.startNodeId, this.activeMapNode.id);
    saveState(this.state);
    this.routeToStory();
  }

  private routeToStory(): void {
    this.screen = 'story';
    clearContainer(this.ui);
    this.applyBackdrop(this.state.run.chapterId);
    this.playPageTransition();
    this.audio.setAmbientMode('story');
    this.audio.play('page');

    const chapter = findChapter(this.chapters, this.state.run.chapterId);
    const node = findNode(chapter, this.state.run.chapterNodeId);

    const panel = makePanel(this, 640, 404, 1140, 552, this.paper, 0.97);
    const chapterTitle = this.add.text(140, 148, chapter.title, {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16',
      wordWrap: { width: 980 }
    });

    const storyText = this.add
      .text(140, 228, node.text, {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#1f1a16',
        wordWrap: { width: 980 }
      })
      .setLineSpacing(8);

    this.ui.add([panel, chapterTitle, storyText]);

    if (isSpectaclesOverlayEnabled(this.state, chapter.id)) {
      this.ui.add(createSpectaclesOverlay(this));
    }

    const availableChoices = node.choices.filter((choice) => isChoiceUnlocked(this.state, choice));
    availableChoices.forEach((choice, index) => {
      const button = makeButton(this, 640, 494 + index * 74, 900, choice.label, () => {
        this.audio.play('choice');
        const result = applyStoryChoice(this.state, chapter, node.id, choice.id);
        this.state = result.state;
        this.bonusBadge = result.companionBonusTag ?? null;
        if (this.bonusBadge) {
          this.showToast(this.bonusBadge);
          this.audio.play('companion');
        }

        if (result.nextNodeId) {
          this.state = setChapterPosition(this.state, chapter.id, result.nextNodeId, this.activeMapNode.id);
          saveState(this.state);
          this.drawHud();
          this.routeToStory();
          return;
        }

        saveState(this.state);
        this.drawHud();
        this.finishMapNodeFlow();
      }, 0x2f6457);
      this.ui.add(button);
    });
  }

  private finishMapNodeFlow(): void {
    const nextOptions = this.activeMapNode.next;
    if (nextOptions.length > 0) {
      const nextNode = getMapNode(this.map, nextOptions[0]);
      if (nextNode.packId !== this.activeMapNode.packId) {
        this.state = markPackCompleted(this.state, this.activeMapNode.packId);
      }
    } else {
      this.state = markPackCompleted(this.state, this.activeMapNode.packId);
    }

    if (nextOptions.length === 0) {
      saveState(this.state);
      this.routeToCredits();
      return;
    }

    if (nextOptions.length === 1) {
      this.state = completeMapNode(this.state, this.activeMapNode.id, nextOptions[0]);
      saveState(this.state);
      this.drawHud();
      this.routeToMap();
      return;
    }

    this.routeToBranchChoice(nextOptions);
  }

  private routeToBranchChoice(nextOptions: string[]): void {
    this.screen = 'map';
    clearContainer(this.ui);
    this.audio.setAmbientMode('map');
    this.audio.play('page');

    const panel = makePanel(this, 640, 390, 1060, 430, this.paper, 0.97);
    const title = this.add.text(170, 176, 'Choose the next route', {
      fontFamily: 'Georgia',
      fontSize: '40px',
      color: '#1f1a16'
    });

    const subtitle = this.add.text(170, 230, 'Main path remains available if you skip side rewards.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#2b3d38'
    });

    this.ui.add([panel, title, subtitle]);

    nextOptions.forEach((nextId, index) => {
      const nextNode = getMapNode(this.map, nextId);
      const button = makeButton(this, 640, 322 + index * 82, 760, nextNode.label, () => {
        this.state = completeMapNode(this.state, this.activeMapNode.id, nextNode.id);
        saveState(this.state);
        this.drawHud();
        this.routeToMap();
      }, index === 0 ? 0x345f4f : 0x5a5f35);
      this.ui.add(button);
    });
  }

  private routeToMinigame(mode: OzMiniGameId): void {
    this.screen = 'minigame';
    clearContainer(this.ui);
    this.applyBackdrop(this.activeMapNode.chapterId);
    this.playPageTransition();
    this.audio.setAmbientMode('minigame');
    this.audio.play('minigame');

    this.cycloneState = null;
    this.cornfieldState = null;
    this.dashState = null;
    this.oilState = null;
    this.courageState = null;
    this.forestState = null;
    this.kalidahState = null;
    this.poppyState = null;
    this.spectacleState = null;
    this.audienceState = null;
    this.shadowState = null;
    this.westernHoldState = null;
    this.westernCommandQueued = false;
    this.dousingState = null;
    this.dousingCommandQueued = false;
    this.balloonState = null;

    if (mode === 'cyclone-escape') {
      this.cycloneState = createCycloneState();
      this.renderCyclone();
      return;
    }

    if (mode === 'cornfield-rescue') {
      this.cornfieldState = createCornfieldRescueState();
      this.crowWarningMs = 1100;
      this.crowDanger = false;
      this.renderCornfield();
      return;
    }

    if (mode === 'silver-slippers-dash') {
      this.dashState = createSilverSlippersDashState();
      this.dashObstacleTimerMs = 650;
      this.dashDanger = false;
      this.renderDash();
      return;
    }

    if (mode === 'oil-and-joints') {
      this.oilState = createOilAndJointsState();
      this.renderOilAndJoints();
      return;
    }

    if (mode === 'courage-trial') {
      this.courageState = createCourageTrialState();
      this.courageHold = 0;
      this.renderCourageTrial();
      return;
    }

    if (mode === 'forest-crossing') {
      this.forestState = createForestCrossingState();
      this.forestObstacle = null;
      this.forestObstacleMs = 720;
      this.renderForestCrossing();
      return;
    }

    if (mode === 'kalidah-chase') {
      this.kalidahState = createKalidahChaseState(this.state.run.seed, {
        tinGuardHits: this.state.companions['tin-woodman'].meter >= 4 ? 1 : 0,
        roarCharges: this.state.companions['cowardly-lion'].meter >= 4 ? 1 : 0
      });
      this.renderKalidahChase();
      return;
    }

    if (mode === 'spectacle-fastening') {
      const preset = resolveDeterministicPreset(this.state.run.seed, 'spectacle-fastening', this.miniGameConfig.difficultyPresets);
      this.spectacleState = createSpectacleFasteningState(
        this.state.run.seed,
        preset.multiplier,
        this.miniGameConfig.spectacleFastening ?? DEFAULT_SPECTACLE_FASTENING_CONFIG
      );
      this.renderSpectacleFastening();
      return;
    }

    if (mode === 'audience-perception') {
      const preset = resolveDeterministicPreset(this.state.run.seed, 'audience-perception', this.miniGameConfig.difficultyPresets);
      this.audienceState = createAudiencePerceptionState(
        this.state.run.seed,
        preset.multiplier,
        this.miniGameConfig.audiencePerception ?? DEFAULT_AUDIENCE_PERCEPTION_CONFIG
      );
      this.renderAudiencePerception();
      return;
    }

    if (mode === 'shadow-of-the-west') {
      const preset = resolveDeterministicPreset(this.state.run.seed, 'shadow-of-the-west', this.miniGameConfig.difficultyPresets);
      this.shadowState = createShadowOfTheWestState(
        this.state.run.seed,
        preset.multiplier,
        {
          scarecrowReveal: this.state.companions.scarecrow.meter >= 5,
          tinWard: this.state.companions['tin-woodman'].meter >= 5,
          lionSteadyBreath: this.state.companions['cowardly-lion'].meter >= 5
        },
        this.miniGameConfig.shadowOfTheWest ?? DEFAULT_SHADOW_OF_THE_WEST_CONFIG
      );
      this.shadowTargetLane = this.shadowState.lane;
      this.shadowHideMs = 0;
      this.renderShadowOfTheWest();
      return;
    }

    if (mode === 'western-hold-escape') {
      const preset = resolveDeterministicPreset(this.state.run.seed, 'western-hold-escape', this.miniGameConfig.difficultyPresets);
      this.westernHoldState = createWesternHoldEscapeState(
        this.state.run.seed,
        preset.multiplier,
        this.activeMapNode.id,
        this.miniGameConfig.westernHoldEscape ?? DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG
      );
      this.westernHoldTargetLane = this.westernHoldState.lane;
      this.westernHideMs = 0;
      this.westernCommandQueued = false;
      this.renderWesternHoldEscape();
      return;
    }

    if (mode === 'dousing-the-shadow') {
      const preset = resolveDeterministicPreset(this.state.run.seed, 'dousing-the-shadow', this.miniGameConfig.difficultyPresets);
      this.dousingState = createDousingState(
        this.state.run.seed,
        preset.multiplier,
        this.activeMapNode.id,
        this.miniGameConfig.dousingTheShadow ?? DEFAULT_DOUSING_THE_SHADOW_CONFIG
      );
      this.dousingTargetLane = this.dousingState.lane;
      this.dousingCommandQueued = false;
      this.renderDousingTheShadow();
      return;
    }

    if (mode === 'balloon-rigging') {
      const preset = resolveDeterministicPreset(this.state.run.seed, 'balloon-rigging', this.miniGameConfig.difficultyPresets);
      this.balloonState = createBalloonRiggingState(
        this.state.run.seed,
        preset.multiplier,
        this.activeMapNode.id,
        this.miniGameConfig.balloonRigging ?? DEFAULT_BALLOON_RIGGING_CONFIG
      );
      this.renderBalloonRigging();
      return;
    }

    this.poppyState = createPoppyRescueState(this.state.run.seed);
    this.renderPoppyRescue();
  }

  private renderCyclone(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Cyclone Landing', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 206, 'Drag left or right to keep the house balanced.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#23352f'
    });

    const meterBg = this.add.rectangle(640, 360, 700, 34, 0x2a2f35, 0.25).setStrokeStyle(2, this.ink, 0.8);
    const meterNeedle = this.add.rectangle(640, 360, 18, 46, this.storm, 1);
    const house = this.add.rectangle(640, 470, 180, 120, 0x9a6d4b, 1).setStrokeStyle(3, this.ink, 0.85);

    this.ui.add([panel, title, instr, meterBg, meterNeedle, house]);

    const updater = () => {
      if (!this.cycloneState) return;
      meterNeedle.x = 640 + this.cycloneState.stability * 330;
      house.setAngle(this.state.settings.reducedMotion ? 0 : this.cycloneState.stability * 20);
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private updateCyclone(): void {
    if (!this.cycloneState) return;

    const preset = resolveDeterministicPreset(this.state.run.seed, 'cyclone-escape', this.miniGameConfig.difficultyPresets);
    const baseConfig = this.miniGameConfig.cycloneEscape ?? DEFAULT_CYCLONE_CONFIG;
    const safeBandAssist = this.state.companions.scarecrow.acquired && this.state.companions.scarecrow.meter >= 3 ? 0.04 : 0;
    const tuned: CycloneConfig = {
      ...baseConfig,
      driftPerSecond: baseConfig.driftPerSecond * preset.multiplier,
      safeBand: baseConfig.safeBand + safeBandAssist
    };

    const timeFactor = this.time.now / 800;
    const windImpulse = Math.sin(timeFactor) * 0.9 + Math.sin(timeFactor * 0.35) * 0.25;

    this.cycloneState = stepCyclone(this.cycloneState, this.cycloneTilt, windImpulse, this.game.loop.delta, tuned);

    if (!this.cycloneState.done) return;

    const score = cycloneScore(this.cycloneState, tuned);
    this.state = markMiniGameScore(this.state, 'cyclone-escape', score);
    saveState(this.state);

    if (this.cycloneState.success) {
      this.playMinigameOutcome(true);
      this.showToast(`Cyclone complete. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
    } else {
      this.playMinigameOutcome(false);
      this.cycloneState = createCycloneState();
      this.showToast('The house tipped too far. Try again.');
      this.routeToMinigame('cyclone-escape');
    }
  }

  private renderCornfield(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Scarecrow Rescue', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 206, 'Tap to untie knots. Avoid taps while crows pass.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#23352f'
    });

    const status = this.add.text(140, 286, 'Progress 0/4 | Strikes 0/3', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#1f1a16'
    });

    const dangerText = this.add.text(140, 340, 'Crow lane clear', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#2f6c50'
    });

    const action = makeButton(this, 640, 620, 460, 'Untie Knot', () => {
      if (!this.cornfieldState) return;
      this.cornfieldState = stepCornfieldRescue(
        this.cornfieldState,
        this.crowDanger ? 'crow-hit' : 'untie',
        240,
        this.miniGameConfig.cornfieldRescue ?? DEFAULT_CORNFIELD_CONFIG
      );
      status.setText(`Progress ${this.cornfieldState.progress}/4 | Strikes ${this.cornfieldState.crowsStrikes}/3`);
    }, 0x58703d);

    this.ui.add([panel, title, instr, status, dangerText, action]);

    const updater = () => {
      if (!this.cornfieldState) return;
      dangerText.setText(this.crowDanger ? 'Crow passing: do not tap' : 'Crow lane clear');
      dangerText.setColor(this.crowDanger ? '#9b2f2f' : '#2f6c50');
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private updateCornfield(): void {
    if (!this.cornfieldState) return;

    this.crowWarningMs -= this.game.loop.delta;
    if (this.crowWarningMs <= 0) {
      this.crowDanger = !this.crowDanger;
      this.crowWarningMs = this.crowDanger ? 620 : 1200;
    }

    this.cornfieldState = stepCornfieldRescue(
      this.cornfieldState,
      'wait',
      this.game.loop.delta,
      this.miniGameConfig.cornfieldRescue ?? DEFAULT_CORNFIELD_CONFIG
    );

    if (!this.cornfieldState.done) return;

    const score = cornfieldScore(this.cornfieldState, this.miniGameConfig.cornfieldRescue ?? DEFAULT_CORNFIELD_CONFIG);
    this.state = markMiniGameScore(this.state, 'cornfield-rescue', score);
    this.state = addCompanionMeter(this.state, 'scarecrow', this.cornfieldState.success ? 1 : 0, 'Stayed calm during the crow pass.');
    if (this.cornfieldState.success && this.cornfieldState.crowsStrikes === 0) {
      this.state = unlockSketches(this.state, ['field-knots-study']);
    }
    const cornfieldPerfect = this.cornfieldState.success && this.cornfieldState.crowsStrikes === 0;
    saveState(this.state);
    this.drawHud();

    if (this.cornfieldState.success) {
      this.playMinigameOutcome(true, cornfieldPerfect);
      this.showToast(`Scarecrow rescued. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
    } else {
      this.playMinigameOutcome(false);
      this.cornfieldState = createCornfieldRescueState();
      this.showToast('The crows forced a retreat. Retry the rescue.');
      this.routeToMinigame('cornfield-rescue');
    }
  }

  private renderDash(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Silver Slippers Dash', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });

    const status = this.add.text(140, 290, 'Distance 0 | Markers 0 | Falls 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#1f1a16'
    });

    const warning = this.add.text(140, 340, 'Path clear', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#2f6c50'
    });

    const hop = makeButton(this, 640, 620, 460, 'Hop', () => {
      if (!this.dashState) return;
      this.dashState = stepSilverSlippersDash(
        this.dashState,
        190,
        !this.dashDanger,
        this.dashDanger,
        this.miniGameConfig.silverSlippersDash ?? DEFAULT_SILVER_DASH_CONFIG
      );
      status.setText(`Distance ${Math.round(this.dashState.distance)} | Markers ${this.dashState.markers} | Falls ${this.dashState.falls}`);
    }, 0x4f4f6e);

    this.ui.add([panel, title, status, warning, hop]);

    const updater = () => {
      warning.setText(this.dashDanger ? 'Obstacle incoming' : 'Path clear');
      warning.setColor(this.dashDanger ? '#9b2f2f' : '#2f6c50');
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private updateDash(): void {
    if (!this.dashState) return;

    this.dashObstacleTimerMs -= this.game.loop.delta;
    if (this.dashObstacleTimerMs <= 0) {
      this.dashDanger = !this.dashDanger;
      this.dashObstacleTimerMs = this.dashDanger ? 520 : 880;
    }

    this.dashState = stepSilverSlippersDash(
      this.dashState,
      this.game.loop.delta,
      false,
      false,
      this.miniGameConfig.silverSlippersDash ?? DEFAULT_SILVER_DASH_CONFIG
    );

    if (!this.dashState.done) return;

    const score = silverSlippersDashScore(this.dashState, this.miniGameConfig.silverSlippersDash ?? DEFAULT_SILVER_DASH_CONFIG);
    this.state = markMiniGameScore(this.state, 'silver-slippers-dash', score);
    saveState(this.state);

    this.playMinigameOutcome(true);
    this.showToast(`Dash complete. Score ${score}`);
    this.startChapter(this.activeMapNode.chapterId);
  }

  private renderOilAndJoints(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Oil & Joints', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });

    const instructions = this.add.text(140, 202, 'Tap valve order 1-2-3-4 repeatedly before pressure drains.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '23px',
      color: '#23352f'
    });

    const status = this.add.text(140, 286, 'Correct 0 | Miss 0 | Pressure 72', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#1f1a16'
    });

    const valveButtons: Phaser.GameObjects.Container[] = [];
    for (let i = 0; i < 4; i += 1) {
      const valve = makeButton(this, 340 + i * 200, 620, 160, `Valve ${i + 1}`, () => {
        if (!this.oilState) return;
        this.oilState = stepOilAndJoints(this.oilState, i, 220, this.currentOilConfig());
        status.setText(`Correct ${this.oilState.corrects} | Miss ${this.oilState.misses} | Pressure ${Math.round(this.oilState.pressure)}`);
      }, 0x5b6358);
      valveButtons.push(valve);
    }

    this.ui.add([panel, title, instructions, status, ...valveButtons]);
  }

  private currentOilConfig(): OilAndJointsConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'oil-and-joints', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.oilAndJoints ?? DEFAULT_OIL_AND_JOINTS_CONFIG;
    const tuned: OilAndJointsConfig = {
      ...base,
      drainPerSecond: base.drainPerSecond * preset.multiplier
    };
    const assist = this.state.companions['tin-woodman'].acquired && this.state.companions['tin-woodman'].meter >= 3 ? 3 : 0;
    return {
      ...tuned,
      refillOnCorrect: base.refillOnCorrect + assist
    };
  }

  private updateOilAndJoints(): void {
    if (!this.oilState) return;

    this.oilState = stepOilAndJoints(this.oilState, null, this.game.loop.delta, this.currentOilConfig());
    if (!this.oilState.done) return;

    const score = oilAndJointsScore(this.oilState);
    this.state = markMiniGameScore(this.state, 'oil-and-joints', score);
    this.state = addCompanionMeter(this.state, 'tin-woodman', this.oilState.success ? 2 : 0, 'Moved freely after the oil run.');

    const oilPerfect = isOilAndJointsPerfect(this.oilState);
    if (oilPerfect) {
      this.state = unlockSketches(this.state, ['tin-polish-study']);
    }

    saveState(this.state);
    this.drawHud();

    if (this.oilState.success) {
      this.playMinigameOutcome(true, oilPerfect);
      this.showToast(`Tin restored. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
    } else {
      this.playMinigameOutcome(false);
      this.oilState = createOilAndJointsState();
      this.showToast('Joints seized. Try the valve order again.');
      this.routeToMinigame('oil-and-joints');
    }
  }

  private renderCourageTrial(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Courage Trial', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });

    const instr = this.add.text(140, 202, 'Hold left or right to keep the needle centered as sounds rise.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '23px',
      color: '#23352f'
    });

    const meterBg = this.add.rectangle(640, 350, 700, 36, 0x2a2f35, 0.25).setStrokeStyle(2, this.ink, 0.8);
    const meterNeedle = this.add.rectangle(640, 350, 20, 48, 0x7d5e42, 1);
    const status = this.add.text(140, 410, 'Steady 0% | Spikes 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });

    const left = makeButton(this, 420, 620, 260, 'Hold Left', () => {
      this.courageHold = -0.8;
      this.time.delayedCall(180, () => {
        this.courageHold = 0;
      });
    }, 0x5c4a3d);

    const right = makeButton(this, 860, 620, 260, 'Hold Right', () => {
      this.courageHold = 0.8;
      this.time.delayedCall(180, () => {
        this.courageHold = 0;
      });
    }, 0x5c4a3d);

    this.ui.add([panel, title, instr, meterBg, meterNeedle, status, left, right]);

    const updater = () => {
      if (!this.courageState) return;
      meterNeedle.x = 640 + this.courageState.needle * 330;
      const ratio = Math.round((this.courageState.steadyMs / this.currentCourageConfig().durationMs) * 100);
      status.setText(`Steady ${ratio}% | Spikes ${this.courageState.spikes}`);
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private currentCourageConfig(): CourageTrialConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'courage-trial', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.courageTrial ?? DEFAULT_COURAGE_TRIAL_CONFIG;
    const tuned: CourageTrialConfig = {
      ...base,
      menaceDrift: base.menaceDrift * preset.multiplier
    };
    const assist = this.state.companions['cowardly-lion'].acquired && this.state.companions['cowardly-lion'].meter >= 3 ? 1 : 0;
    return {
      ...tuned,
      maxSpikes: base.maxSpikes + assist
    };
  }

  private updateCourageTrial(): void {
    if (!this.courageState) return;

    const config = this.currentCourageConfig();
    const menace = Math.sin(this.time.now / 420) * 0.8 + Math.sin(this.time.now / 1110) * 0.45;
    this.courageState = stepCourageTrial(this.courageState, this.courageHold, menace, this.game.loop.delta, config);

    if (!this.courageState.done) return;

    const score = courageTrialScore(this.courageState, config);
    this.state = markMiniGameScore(this.state, 'courage-trial', score);
    this.state = addCompanionMeter(this.state, 'cowardly-lion', this.courageState.success ? 2 : 0, 'Stood ground through the forest noise.');

    const couragePerfect = isCourageTrialPerfect(this.courageState, config);
    if (couragePerfect) {
      this.state = unlockSketches(this.state, ['lion-roar-echo']);
    }

    saveState(this.state);
    this.drawHud();

    if (this.courageState.success) {
      this.playMinigameOutcome(true, couragePerfect);
      this.showToast(`Courage steadied. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
    } else {
      this.playMinigameOutcome(false);
      this.courageState = createCourageTrialState();
      this.showToast('Fear took over. Try again.');
      this.routeToMinigame('courage-trial');
    }
  }

  private renderForestCrossing(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Forest Crossing', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });

    const hint = this.add.text(140, 202, 'Tap Jump for roots, Duck for low branches.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '23px',
      color: '#23352f'
    });

    const warning = this.add.text(140, 292, 'Path clear', {
      fontFamily: 'Trebuchet MS',
      fontSize: '27px',
      color: '#2f6c50'
    });

    const status = this.add.text(140, 342, 'Distance 0 | Markers 0 | Hits 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '25px',
      color: '#1f1a16'
    });

    const jump = makeButton(this, 430, 620, 260, 'Jump', () => this.stepForestWithAction('jump', status), 0x5f5441);
    const duck = makeButton(this, 850, 620, 260, 'Duck', () => this.stepForestWithAction('duck', status), 0x5f5441);

    this.ui.add([panel, title, hint, warning, status, jump, duck]);

    const updater = () => {
      warning.setText(
        this.forestObstacle === 'root-high'
          ? 'Root ahead: Jump'
          : this.forestObstacle === 'branch-low'
            ? 'Low branch: Duck'
            : 'Path clear'
      );
      warning.setColor(this.forestObstacle ? '#9b2f2f' : '#2f6c50');
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private stepForestWithAction(action: 'jump' | 'duck', statusText: Phaser.GameObjects.Text): void {
    if (!this.forestState) return;
    this.forestState = stepForestCrossing(
      this.forestState,
      action,
      this.forestObstacle,
      this.forestObstacle === null,
      230,
      this.miniGameConfig.forestCrossing ?? DEFAULT_FOREST_CROSSING_CONFIG
    );
    statusText.setText(
      `Distance ${Math.round(this.forestState.distance)} | Markers ${this.forestState.markers} | Hits ${this.forestState.hits}`
    );
    this.forestObstacle = null;
  }

  private updateForestCrossing(): void {
    if (!this.forestState) return;

    this.forestObstacleMs -= this.game.loop.delta;
    if (this.forestObstacleMs <= 0) {
      const selector = Math.floor(((this.time.now / 13) % 3 + 3) % 3);
      this.forestObstacle = selector === 0 ? null : selector === 1 ? 'root-high' : 'branch-low';
      this.forestObstacleMs = this.state.settings.reducedMotion ? 900 : 720;
    }

    this.forestState = stepForestCrossing(
      this.forestState,
      'none',
      this.forestObstacle,
      false,
      this.game.loop.delta,
      this.miniGameConfig.forestCrossing ?? DEFAULT_FOREST_CROSSING_CONFIG
    );

    if (!this.forestState.done) return;

    const score = forestCrossingScore(this.forestState, this.miniGameConfig.forestCrossing ?? DEFAULT_FOREST_CROSSING_CONFIG);
    this.state = markMiniGameScore(this.state, 'forest-crossing', score);

    const forestPerfect = isForestCrossingPerfect(this.forestState);
    if (forestPerfect) {
      this.state = unlockSketches(this.state, ['forest-road-ink']);
    }

    saveState(this.state);
    this.drawHud();
    this.playMinigameOutcome(true, forestPerfect);
    this.showToast(`Forest crossing complete. Score ${score}`);
    this.startChapter(this.activeMapNode.chapterId);
  }

  private renderKalidahChase(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Kalidah Chase', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Swipe left or right to shift lanes. Tap Burst to widen the gap.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '23px',
      color: '#23352f'
    });
    const status = this.add.text(140, 284, 'Gap 68% | Tokens 0 | Hits 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });
    const hint = this.add.text(140, 336, 'Companion Bonus Applied: none', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#2f6c50'
    });

    const left = makeButton(this, 360, 620, 220, 'Left', () => this.stepKalidahWithAction(-1, false, false, status), 0x5f5441);
    const right = makeButton(this, 620, 620, 220, 'Right', () => this.stepKalidahWithAction(1, false, false, status), 0x5f5441);
    const burst = makeButton(this, 900, 620, 220, 'Burst', () => this.stepKalidahWithAction(0, true, false, status), 0x4a5f3f);

    this.ui.add([panel, title, instr, status, hint, left, right, burst]);

    const scarecrowBonus = this.state.companions.scarecrow.meter >= 4;
    const tinBonus = this.state.companions['tin-woodman'].meter >= 4;
    const lionBonus = this.state.companions['cowardly-lion'].meter >= 4;
    if (scarecrowBonus || tinBonus || lionBonus) {
      const parts: string[] = [];
      if (scarecrowBonus) {
        const safeLane = this.kalidahState ? safestLaneAt(this.kalidahState, this.kalidahState.nextPatternIndex) + 1 : 1;
        parts.push(`Scarecrow safe lane: ${safeLane}`);
      }
      if (tinBonus) parts.push('Tin guard active');
      if (lionBonus) parts.push('Lion roar ready');
      hint.setText(`Companion Bonus Applied: ${parts.join(' | ')}`);
    }
  }

  private stepKalidahWithAction(
    laneShift: -1 | 0 | 1,
    burst: boolean,
    roar: boolean,
    statusText: Phaser.GameObjects.Text
  ): void {
    if (!this.kalidahState) return;
    this.kalidahState = stepKalidahChase(this.kalidahState, { laneShift, burst, roar }, 230, this.miniGameConfig.kalidahChase ?? DEFAULT_KALIDAH_CONFIG);
    statusText.setText(
      `Gap ${Math.round(this.kalidahState.gap * 100)}% | Tokens ${this.kalidahState.tokens} | Hits ${this.kalidahState.hits}`
    );
  }

  private updateKalidahChase(): void {
    if (!this.kalidahState) return;
    this.kalidahState = stepKalidahChase(
      this.kalidahState,
      { laneShift: 0, burst: false, roar: false },
      this.game.loop.delta,
      this.miniGameConfig.kalidahChase ?? DEFAULT_KALIDAH_CONFIG
    );

    if (!this.kalidahState.done) return;

    const score = kalidahChaseScore(this.kalidahState);
    this.state = markMiniGameScore(this.state, 'kalidah-chase', score);
    this.state = markBossResult(this.state, 'kalidah-chase', score, this.kalidahState.elapsedMs);
    saveState(this.state);
    this.drawHud();

    if (this.kalidahState.success) {
      this.playMinigameOutcome(true);
      this.showToast(`Kalidahs outpaced. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
    } else {
      this.playMinigameOutcome(false);
      this.kalidahState = createKalidahChaseState(this.state.run.seed);
      this.showToast('The Kalidahs closed the gap. Retry.');
      this.routeToMinigame('kalidah-chase');
    }
  }

  private renderPoppyRescue(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Poppy Drift Rescue', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Drag a lane path and steer clear of drifting pollen clouds.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '23px',
      color: '#23352f'
    });
    const status = this.add.text(140, 286, 'Progress 0% | Sleep 0%', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });
    const assist = this.add.text(140, 336, 'Companion Bonus Applied: Tin and Scarecrow are immune to poppy sleep.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#2f6c50'
    });

    const left = makeButton(this, 380, 620, 260, 'Steer Left', () => this.stepPoppyWithAction(-1, status), 0x5f5441);
    const right = makeButton(this, 900, 620, 260, 'Steer Right', () => this.stepPoppyWithAction(1, status), 0x5f5441);

    if (this.state.companions['cowardly-lion'].meter >= 5) {
      assist.setText('Companion Bonus Applied: Lion courage slows sleep buildup.');
    }

    this.ui.add([panel, title, instr, status, assist, left, right]);
  }

  private stepPoppyWithAction(laneShift: -1 | 0 | 1, statusText: Phaser.GameObjects.Text): void {
    if (!this.poppyState) return;
    this.poppyState = stepPoppyRescue(
      this.poppyState,
      { laneShift, steeringHold: true },
      220,
      {
        tinAndScarecrowRescueBoost: this.state.companions['tin-woodman'].meter >= 4 ? 2 : 0,
        lionCourageResist: this.state.companions['cowardly-lion'].meter >= 5 ? 0.35 : 0
      },
      this.miniGameConfig.poppyRescue ?? DEFAULT_POPPY_RESCUE_CONFIG
    );
    statusText.setText(
      `Progress ${Math.round(this.poppyState.progress)}% | Sleep ${Math.round(this.poppyState.sleepMeter * 100)}%`
    );
  }

  private updatePoppyRescue(): void {
    if (!this.poppyState) return;
    this.poppyState = stepPoppyRescue(
      this.poppyState,
      { laneShift: 0, steeringHold: false },
      this.game.loop.delta,
      {
        tinAndScarecrowRescueBoost: this.state.companions['tin-woodman'].meter >= 4 ? 2 : 0,
        lionCourageResist: this.state.companions['cowardly-lion'].meter >= 5 ? 0.35 : 0
      },
      this.miniGameConfig.poppyRescue ?? DEFAULT_POPPY_RESCUE_CONFIG
    );

    if (!this.poppyState.done) return;

    const score = poppyRescueScore(this.poppyState, this.miniGameConfig.poppyRescue ?? DEFAULT_POPPY_RESCUE_CONFIG);
    this.state = markMiniGameScore(this.state, 'poppy-drift-rescue', score);
    this.state = markBossResult(this.state, 'poppy-drift-rescue', score, this.poppyState.elapsedMs);
    saveState(this.state);
    this.drawHud();

    if (this.poppyState.success) {
      this.playMinigameOutcome(true);
      this.showToast(`Dorothy reached safely. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
    } else {
      this.playMinigameOutcome(false);
      this.poppyState = createPoppyRescueState(this.state.run.seed);
      this.showToast('Sleep overtook the rescue. Retry.');
      this.routeToMinigame('poppy-drift-rescue');
    }
  }

  private currentSpectacleConfig(): SpectacleFasteningConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'spectacle-fastening', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.spectacleFastening ?? DEFAULT_SPECTACLE_FASTENING_CONFIG;
    return {
      ...base,
      baseToleranceMs: Math.round(base.baseToleranceMs / preset.multiplier),
      retryPenaltyMs: Math.round(base.retryPenaltyMs * preset.multiplier)
    };
  }

  private currentSpectacleDifficulty(): number {
    return resolveDeterministicPreset(this.state.run.seed, 'spectacle-fastening', this.miniGameConfig.difficultyPresets).multiplier;
  }

  private renderSpectacleFastening(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Spectacle Fastening', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Tap Fasten when the marker passes the bright seal line for each gate step.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#23352f'
    });

    const barBg = this.add.rectangle(640, 350, 760, 34, 0x2a2f35, 0.25).setStrokeStyle(2, this.ink, 0.8);
    const target = this.add.rectangle(640, 350, 18, 44, 0x3f7f4d, 0.9);
    const marker = this.add.rectangle(280, 350, 18, 44, 0x8f6d44, 0.95);
    const stepLabel = this.add.text(140, 286, 'Step 1/1', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });
    const status = this.add.text(140, 414, 'Mistakes 0 | Retry +0ms', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#1f1a16'
    });

    const action = makeButton(this, 640, 620, 420, 'Fasten', () => {
      if (!this.spectacleState) return;
      this.spectacleState = stepSpectacleFastening(this.spectacleState, true, 220, this.currentSpectacleConfig());
      this.updateSpectacleHud(stepLabel, status, target, marker);
    }, 0x3f6f52);

    this.ui.add([panel, title, instr, barBg, target, marker, stepLabel, status, action]);

    const updater = () => this.updateSpectacleHud(stepLabel, status, target, marker);
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private updateSpectacleHud(
    stepLabel: Phaser.GameObjects.Text,
    status: Phaser.GameObjects.Text,
    target: Phaser.GameObjects.Rectangle,
    marker: Phaser.GameObjects.Rectangle
  ): void {
    if (!this.spectacleState) return;
    const total = this.spectacleState.steps.length;
    const index = Math.min(this.spectacleState.currentStep, Math.max(0, total - 1));
    const step = this.spectacleState.steps[index];
    const currentLabel = step?.id ?? 'seal-check';
    const phase = phaseAtTime(this.spectacleState.elapsedMs, this.currentSpectacleConfig());
    const targetPhase = step?.targetPhase ?? 0.5;

    marker.x = 260 + phase * 760;
    target.x = 260 + targetPhase * 760;
    stepLabel.setText(
      `Step ${Math.min(this.spectacleState.currentStep + 1, total)}/${total}: ${currentLabel.replace('-', ' ')}`
    );
    status.setText(`Mistakes ${this.spectacleState.mistakes} | Retry +${this.spectacleState.retryTimeMs}ms`);
  }

  private updateSpectacleFastening(): void {
    if (!this.spectacleState) return;

    this.spectacleState = stepSpectacleFastening(this.spectacleState, false, this.game.loop.delta, this.currentSpectacleConfig());
    if (!this.spectacleState.done) return;

    const config = this.currentSpectacleConfig();
    const score = spectacleFasteningScore(this.spectacleState, config);
    const grade = spectacleFasteningGrade(this.spectacleState, config);

    this.state = markMiniGameScore(this.state, 'spectacle-fastening', score);

    const spectaclePerfect = isSpectacleFasteningPerfect(this.spectacleState, config);
    if (spectaclePerfect) {
      this.state = unlockSketches(this.state, ['green-spectacles']);
      const companionIds: CompanionId[] = ['scarecrow', 'tin-woodman', 'cowardly-lion'];
      for (let i = 0; i < companionIds.length; i += 1) {
        const companionId = companionIds[i];
        if (!this.state.companions[companionId].acquired) continue;
        this.state = addCompanionMeter(this.state, companionId, 1, 'Held steady during gate admission.');
      }
      this.showToast(`Fastening complete. Grade ${grade} (Perfect).`);
    } else if (this.spectacleState.success) {
      this.showToast(`Fastening complete. Grade ${grade}.`);
    }

    saveState(this.state);
    this.drawHud();

    if (this.spectacleState.success) {
      this.playMinigameOutcome(true, spectaclePerfect);
      this.startChapter(this.activeMapNode.chapterId);
      return;
    }

    this.playMinigameOutcome(false);
    this.spectacleState = createSpectacleFasteningState(
      this.state.run.seed,
      this.currentSpectacleDifficulty(),
      this.currentSpectacleConfig()
    );
    this.showToast('The clasp slipped. Retry the admission fitting.');
    this.routeToMinigame('spectacle-fastening');
  }

  private currentAudienceConfig(): AudiencePerceptionConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'audience-perception', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.audiencePerception ?? DEFAULT_AUDIENCE_PERCEPTION_CONFIG;
    return {
      ...base,
      tolerance: Math.max(1, Math.round(base.tolerance / preset.multiplier))
    };
  }

  private currentAudienceDifficulty(): number {
    return resolveDeterministicPreset(this.state.run.seed, 'audience-perception', this.miniGameConfig.difficultyPresets).multiplier;
  }

  private renderAudiencePerception(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Audience Perception', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Rotate fear, hope, and faith dials, then seal each audience perspective.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#23352f'
    });
    const audienceLabel = this.add.text(140, 262, 'Perspective 1: Dorothy', {
      fontFamily: 'Trebuchet MS',
      fontSize: '25px',
      color: '#1f1a16'
    });
    const dialStatus = this.add.text(140, 306, 'Fear 0 | Hope 0 | Faith 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#1f1a16'
    });
    const mistakes = this.add.text(140, 350, 'Mistakes 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#2f4b42'
    });

    const fearBtn = makeButton(this, 320, 620, 220, 'Fear +', () => this.stepAudiencePerceptionWithAction('fear'), 0x5c4a3d);
    const hopeBtn = makeButton(this, 640, 620, 220, 'Hope +', () => this.stepAudiencePerceptionWithAction('hope'), 0x3f644a);
    const faithBtn = makeButton(this, 960, 620, 220, 'Faith +', () => this.stepAudiencePerceptionWithAction('faith'), 0x405f77);
    const sealBtn = makeButton(this, 640, 548, 420, 'Seal Perspective', () => this.stepAudiencePerceptionWithAction('seal'), 0x2f6a54);

    this.ui.add([panel, title, instr, audienceLabel, dialStatus, mistakes, sealBtn, fearBtn, hopeBtn, faithBtn]);

    const updater = () => {
      if (!this.audienceState) return;
      const names = ['Dorothy', 'Scarecrow', 'Tin Woodman', 'Cowardly Lion'];
      const idx = Math.min(this.audienceState.currentAudience, names.length - 1);
      audienceLabel.setText(
        this.audienceState.currentAudience >= this.audienceState.targets.length
          ? 'Perspective stabilized'
          : `Perspective ${this.audienceState.currentAudience + 1}: ${names[idx]}`
      );
      dialStatus.setText(`Fear ${this.audienceState.fear} | Hope ${this.audienceState.hope} | Faith ${this.audienceState.faith}`);
      mistakes.setText(`Mistakes ${this.audienceState.mistakes}`);
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private stepAudiencePerceptionWithAction(action: 'fear' | 'hope' | 'faith' | 'seal'): void {
    if (!this.audienceState) return;
    this.audienceState = stepAudiencePerception(this.audienceState, action, 220, this.currentAudienceConfig());
  }

  private updateAudiencePerception(): void {
    if (!this.audienceState) return;
    this.audienceState = stepAudiencePerception(this.audienceState, 'none', this.game.loop.delta, this.currentAudienceConfig());
    if (!this.audienceState.done) return;

    const config = this.currentAudienceConfig();
    const score = audiencePerceptionScore(this.audienceState, config);
    const grade = audiencePerceptionGrade(this.audienceState, config);
    this.state = markMiniGameScore(this.state, 'audience-perception', score);

    const audiencePerfect = this.audienceState.success && isAudiencePerceptionPerfect(this.audienceState, config);
    if (audiencePerfect) {
      this.state = unlockSketches(this.state, ['wonders-behind-the-curtain']);
      this.showToast(`Perception aligned. Grade ${grade} (Perfect).`);
    } else if (this.audienceState.success) {
      this.showToast(`Perception aligned. Grade ${grade}.`);
    }

    saveState(this.state);
    this.drawHud();

    if (this.audienceState.success) {
      this.playMinigameOutcome(true, audiencePerfect);
      this.startChapter(this.activeMapNode.chapterId);
      return;
    }

    this.playMinigameOutcome(false);
    this.audienceState = createAudiencePerceptionState(
      this.state.run.seed,
      this.currentAudienceDifficulty(),
      this.currentAudienceConfig()
    );
    this.showToast('The chamber image scattered. Try again.');
    this.routeToMinigame('audience-perception');
  }

  private currentShadowConfig(): ShadowOfTheWestConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'shadow-of-the-west', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.shadowOfTheWest ?? DEFAULT_SHADOW_OF_THE_WEST_CONFIG;
    return {
      ...base,
      sweepExposurePerEvent: base.sweepExposurePerEvent * preset.multiplier,
      baseExposurePerSecond: base.baseExposurePerSecond * preset.multiplier
    };
  }

  private renderShadowOfTheWest(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Shadow of the West', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Drag to steer lanes. Tap Hide in cover when the ink sweep crosses your path.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#23352f',
      wordWrap: { width: 980 }
    });
    const status = this.add.text(140, 282, 'Exposure 0% | Tokens 0 | Lane 2', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });
    const assist = this.add.text(140, 332, 'Assists: none', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#2f6c50'
    });

    const hideBtn = makeButton(this, 640, 620, 240, 'Hide', () => {
      this.shadowHideMs = 760;
    }, 0x4a5f3f);
    const tinBtn = makeButton(this, 380, 620, 220, 'Tin Ward', () => {
      this.stepShadowWithAction(true, false);
    }, 0x58695f);
    const lionBtn = makeButton(this, 900, 620, 220, 'Steady Breath', () => {
      this.stepShadowWithAction(false, true);
    }, 0x665b40);

    const assists: string[] = [];
    if (this.state.companions.scarecrow.meter >= 5 && this.shadowState) {
      const safeLane = safestCoverLaneAt(this.shadowState, this.shadowState.nextPatternIndex, this.currentShadowConfig()) + 1;
      assists.push(`Scarecrow route hint lane ${safeLane}`);
    }
    if (this.state.companions['tin-woodman'].meter >= 5) assists.push('Tin ward ready');
    if (this.state.companions['cowardly-lion'].meter >= 5) assists.push('Lion steady breath ready');
    if (assists.length > 0) assist.setText(`Assists: ${assists.join(' | ')}`);

    this.ui.add([panel, title, instr, status, assist, hideBtn, tinBtn, lionBtn]);

    const updater = () => {
      if (!this.shadowState) return;
      status.setText(
        `Exposure ${Math.round(this.shadowState.exposure * 100)}% | Tokens ${this.shadowState.rescueTokens} | Lane ${this.shadowState.lane + 1}`
      );
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private stepShadowWithAction(triggerTinWard: boolean, triggerLionSteady: boolean): void {
    if (!this.shadowState) return;
    this.shadowState = stepShadowOfTheWest(
      this.shadowState,
      {
        laneShift: 0,
        hide: this.shadowHideMs > 0,
        triggerTinWard,
        triggerLionSteady
      },
      220,
      {
        scarecrowReveal: this.state.companions.scarecrow.meter >= 5,
        tinWard: this.state.companions['tin-woodman'].meter >= 5,
        lionSteadyBreath: this.state.companions['cowardly-lion'].meter >= 5
      },
      this.currentShadowConfig()
    );
  }

  private updateShadowOfTheWest(): void {
    if (!this.shadowState) return;
    this.shadowHideMs = Math.max(0, this.shadowHideMs - this.game.loop.delta);

    const laneShift = this.shadowTargetLane < this.shadowState.lane ? -1 : this.shadowTargetLane > this.shadowState.lane ? 1 : 0;
    this.shadowState = stepShadowOfTheWest(
      this.shadowState,
      {
        laneShift,
        hide: this.shadowHideMs > 0,
        triggerTinWard: false,
        triggerLionSteady: false
      },
      this.game.loop.delta,
      {
        scarecrowReveal: this.state.companions.scarecrow.meter >= 5,
        tinWard: this.state.companions['tin-woodman'].meter >= 5,
        lionSteadyBreath: this.state.companions['cowardly-lion'].meter >= 5
      },
      this.currentShadowConfig()
    );

    if (!this.shadowState.done) return;

    const score = shadowOfTheWestScore(this.shadowState, this.currentShadowConfig());
    this.state = markMiniGameScore(this.state, 'shadow-of-the-west', score);
    this.state = markBossResult(this.state, 'shadow-of-the-west', score, this.shadowState.elapsedMs);
    const shadowPerfect = isShadowOfTheWestPerfect(this.shadowState);
    if (shadowPerfect) {
      this.state = unlockSketches(this.state, ['ink-swirl-glyph']);
    }
    saveState(this.state);
    this.drawHud();

    if (this.shadowState.success) {
      this.playMinigameOutcome(true, shadowPerfect);
      this.showToast(`Presence evaded. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
      return;
    }

    this.playMinigameOutcome(false);
    this.showToast('The westward shadow found the party. Retry.');
    this.routeToMinigame('shadow-of-the-west');
  }

  private currentWesternHoldConfig(): WesternHoldEscapeConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'western-hold-escape', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.westernHoldEscape ?? DEFAULT_WESTERN_HOLD_ESCAPE_CONFIG;
    return {
      ...base,
      baseAlarmPerSecond: base.baseAlarmPerSecond * preset.multiplier,
      sweepAlarmPerEvent: base.sweepAlarmPerEvent * preset.multiplier
    };
  }

  private renderWesternHoldEscape(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Escape from the Western Hold', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Drag to shift lanes and tap Hide in cover pockets. Gather 3 tokens to unlock the latch.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#23352f',
      wordWrap: { width: 980 }
    });
    const status = this.add.text(140, 284, 'Alarm 0% | Tokens 0/3 | Lane 2', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });
    const assist = this.add.text(140, 334, 'Assists: none', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#2f6c50'
    });

    const hideBtn = makeButton(this, 640, 620, 240, 'Hide', () => {
      this.westernHideMs = 760;
    }, 0x4a5f3f);
    const scareBtn = makeButton(this, 250, 620, 200, 'Scarecrow', () => this.stepWesternWithAction('scarecrow'), 0x4e6245);
    const tinBtn = makeButton(this, 470, 620, 200, 'Tin Lift', () => this.stepWesternWithAction('tin'), 0x56685d);
    const lionBtn = makeButton(this, 810, 620, 200, 'Lion Pulse', () => this.stepWesternWithAction('lion'), 0x67583d);
    const capBtn = makeButton(this, 1030, 620, 200, 'Cap Command', () => this.triggerGoldenCapCommand('clear-path'), 0x66542a);

    const assists: string[] = [];
    if (this.state.companions.scarecrow.meter >= 5 && this.westernHoldState) {
      const safeLane = safestWesternLaneAt(this.westernHoldState, this.westernHoldState.nextPatternIndex, this.currentWesternHoldConfig()) + 1;
      assists.push(`Scarecrow lane ${safeLane}`);
    }
    if (this.state.companions['tin-woodman'].meter >= 5) assists.push('Tin lift once');
    if (this.state.companions['cowardly-lion'].meter >= 5) assists.push('Lion pause once');
    if (canUseGoldenCap(this.state)) assists.push('Golden Cap command ready');
    if (assists.length > 0) assist.setText(`Assists: ${assists.join(' | ')}`);

    this.ui.add([panel, title, instr, status, assist, hideBtn, scareBtn, tinBtn, lionBtn, capBtn]);

    const updater = () => {
      if (!this.westernHoldState) return;
      const targetTokens = this.currentWesternHoldConfig().targetTokens;
      status.setText(
        `Alarm ${Math.round(this.westernHoldState.alarm * 100)}% | Tokens ${this.westernHoldState.tokensCollected}/${targetTokens} | Lane ${this.westernHoldState.lane + 1}`
      );
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private stepWesternWithAction(action: 'scarecrow' | 'tin' | 'lion'): void {
    if (!this.westernHoldState) return;
    this.westernHoldState = stepWesternHoldEscape(
      this.westernHoldState,
      {
        laneShift: 0,
        hide: this.westernHideMs > 0,
        useScarecrowReveal: action === 'scarecrow',
        useTinLift: action === 'tin',
        useLionPause: action === 'lion',
        useCommand: this.westernCommandQueued
      },
      210,
      {
        scarecrowReveal: this.state.companions.scarecrow.meter >= 5,
        tinLift: this.state.companions['tin-woodman'].meter >= 5,
        lionPause: this.state.companions['cowardly-lion'].meter >= 5,
        goldenCapReady: canUseGoldenCap(this.state)
      },
      this.currentWesternHoldConfig()
    );
    if (this.westernHoldState.spentCommandThisStep) {
      this.state = useGoldenCapCommand(this.state, 'clear-path');
      this.drawHud();
    }
    this.westernCommandQueued = false;
  }

  private updateWesternHoldEscape(): void {
    if (!this.westernHoldState) return;
    this.westernHideMs = Math.max(0, this.westernHideMs - this.game.loop.delta);

    const laneShift = this.westernHoldTargetLane < this.westernHoldState.lane ? -1 : this.westernHoldTargetLane > this.westernHoldState.lane ? 1 : 0;
    this.westernHoldState = stepWesternHoldEscape(
      this.westernHoldState,
      {
        laneShift,
        hide: this.westernHideMs > 0,
        useScarecrowReveal: false,
        useTinLift: false,
        useLionPause: false,
        useCommand: this.westernCommandQueued
      },
      this.game.loop.delta,
      {
        scarecrowReveal: this.state.companions.scarecrow.meter >= 5,
        tinLift: this.state.companions['tin-woodman'].meter >= 5,
        lionPause: this.state.companions['cowardly-lion'].meter >= 5,
        goldenCapReady: canUseGoldenCap(this.state)
      },
      this.currentWesternHoldConfig()
    );

    if (this.westernHoldState.spentCommandThisStep) {
      this.state = useGoldenCapCommand(this.state, 'clear-path');
      this.drawHud();
    }
    this.westernCommandQueued = false;

    if (!this.westernHoldState.done) return;

    const score = westernHoldEscapeScore(this.westernHoldState, this.currentWesternHoldConfig());
    this.state = markMiniGameScore(this.state, 'western-hold-escape', score);
    this.state = markBossResult(this.state, 'western-hold-escape', score, this.westernHoldState.elapsedMs);
    const westernPerfect = isWesternHoldEscapePerfect(this.westernHoldState, this.currentWesternHoldConfig());
    if (westernPerfect) {
      this.state = unlockSketches(this.state, ['a-narrow-corridor']);
    }
    saveState(this.state);
    this.drawHud();

    if (this.westernHoldState.success) {
      this.playMinigameOutcome(true, westernPerfect);
      this.showToast(`Escape line opened. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
      return;
    }

    this.playMinigameOutcome(false);
    this.showToast('Alarm overtook the escape. Retry.');
    this.routeToMinigame('western-hold-escape');
  }

  private currentDousingConfig(): DousingTheShadowConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'dousing-the-shadow', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.dousingTheShadow ?? DEFAULT_DOUSING_THE_SHADOW_CONFIG;
    return {
      ...base,
      baseFearPerSecond: base.baseFearPerSecond * preset.multiplier,
      swellFearPerEvent: base.swellFearPerEvent * preset.multiplier
    };
  }

  private renderDousingTheShadow(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Dousing the Shadow', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 202, 'Drag to calm lanes and tap Ready Water during threat-swell peaks. Land three timed douses.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#23352f',
      wordWrap: { width: 980 }
    });
    const status = this.add.text(140, 286, 'Fear 0% | Douses 0/3 | Misses 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '26px',
      color: '#1f1a16'
    });
    const assist = this.add.text(140, 334, 'Assists: none', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#2f6c50'
    });

    const readyBtn = makeButton(this, 640, 620, 240, 'Ready Water', () => this.stepDousingWithAction('douse'), 0x4a5f3f);
    const scareBtn = makeButton(this, 250, 620, 200, 'Scarecrow', () => this.stepDousingWithAction('scarecrow'), 0x4e6245);
    const tinBtn = makeButton(this, 470, 620, 200, 'Tin Ward', () => this.stepDousingWithAction('tin'), 0x56685d);
    const lionBtn = makeButton(this, 810, 620, 200, 'Lion Steady', () => this.stepDousingWithAction('lion'), 0x67583d);
    const capBtn = makeButton(this, 1030, 620, 200, 'Cap Clear', () => this.triggerGoldenCapCommand('clear-path'), 0x66542a);

    const assists: string[] = [];
    if (this.state.companions.scarecrow.meter >= 5) assists.push('Scarecrow timing window');
    if (this.state.companions['tin-woodman'].meter >= 5) assists.push('Tin fear ward');
    if (this.state.companions['cowardly-lion'].meter >= 5) assists.push('Lion steady pulse');
    if (canUseGoldenCap(this.state)) assists.push('Golden Cap clear swell');
    if (assists.length > 0) assist.setText(`Assists: ${assists.join(' | ')}`);

    this.ui.add([panel, title, instr, status, assist, readyBtn, scareBtn, tinBtn, lionBtn, capBtn]);

    const updater = () => {
      if (!this.dousingState) return;
      const required = this.currentDousingConfig().requiredDouses;
      status.setText(
        `Fear ${Math.round(this.dousingState.fearMeter * 100)}% | Douses ${this.dousingState.dousesHit}/${required} | Misses ${this.dousingState.douseMisses}`
      );
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private stepDousingWithAction(action: 'douse' | 'scarecrow' | 'tin' | 'lion'): void {
    if (!this.dousingState) return;
    this.dousingState = stepDousingTheShadow(
      this.dousingState,
      {
        laneShift: 0,
        readyWater: action === 'douse',
        useScarecrowWindow: action === 'scarecrow',
        useTinWard: action === 'tin',
        useLionSteady: action === 'lion',
        useCommand: this.dousingCommandQueued
      },
      210,
      {
        scarecrowWindow: this.state.companions.scarecrow.meter >= 5,
        tinWard: this.state.companions['tin-woodman'].meter >= 5,
        lionSteady: this.state.companions['cowardly-lion'].meter >= 5,
        goldenCapReady: canUseGoldenCap(this.state)
      },
      this.currentDousingConfig()
    );
    if (this.dousingState.spentCommandThisStep) {
      this.state = useGoldenCapCommand(this.state, 'clear-path');
      this.drawHud();
    }
    this.dousingCommandQueued = false;
  }

  private updateDousingTheShadow(): void {
    if (!this.dousingState) return;
    const laneShift = this.dousingTargetLane < this.dousingState.lane ? -1 : this.dousingTargetLane > this.dousingState.lane ? 1 : 0;
    this.dousingState = stepDousingTheShadow(
      this.dousingState,
      {
        laneShift,
        readyWater: false,
        useScarecrowWindow: false,
        useTinWard: false,
        useLionSteady: false,
        useCommand: this.dousingCommandQueued
      },
      this.game.loop.delta,
      {
        scarecrowWindow: this.state.companions.scarecrow.meter >= 5,
        tinWard: this.state.companions['tin-woodman'].meter >= 5,
        lionSteady: this.state.companions['cowardly-lion'].meter >= 5,
        goldenCapReady: canUseGoldenCap(this.state)
      },
      this.currentDousingConfig()
    );

    if (this.dousingState.spentCommandThisStep) {
      this.state = useGoldenCapCommand(this.state, 'clear-path');
      this.drawHud();
    }
    this.dousingCommandQueued = false;

    if (!this.dousingState.done) return;

    const score = dousingScore(this.dousingState, this.currentDousingConfig());
    this.state = markMiniGameScore(this.state, 'dousing-the-shadow', score);
    this.state = markBossResult(this.state, 'dousing-the-shadow', score, this.dousingState.elapsedMs);
    const dousingPerfect = isDousingPerfect(this.dousingState, this.currentDousingConfig());
    if (dousingPerfect) {
      this.state = unlockSketches(this.state, ['ink-shadow-swell']);
    }
    saveState(this.state);
    this.drawHud();

    if (this.dousingState.success) {
      this.playMinigameOutcome(true, dousingPerfect);
      this.showToast(`Shadow doused. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
      return;
    }

    this.playMinigameOutcome(false);
    this.showToast('Fear overwhelmed the timing. Retry.');
    this.routeToMinigame('dousing-the-shadow');
  }

  private currentBalloonRiggingConfig(): BalloonRiggingConfig {
    const preset = resolveDeterministicPreset(this.state.run.seed, 'balloon-rigging', this.miniGameConfig.difficultyPresets);
    const base = this.miniGameConfig.balloonRigging ?? DEFAULT_BALLOON_RIGGING_CONFIG;
    return {
      ...base,
      baseToleranceMs: Math.max(85, Math.round(base.baseToleranceMs / preset.multiplier))
    };
  }

  private balloonStepLabel(stepId: BalloonRigStepType): string {
    if (stepId === 'rope-knot') return 'Tie rope knots';
    if (stepId === 'basket-latch') return 'Secure basket latch';
    if (stepId === 'wind-vane') return 'Align wind vane';
    return 'Check burner valve';
  }

  private renderBalloonRigging(): void {
    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 154, 'Balloon Rigging', {
      fontFamily: 'Georgia',
      fontSize: '36px',
      color: '#1f1a16'
    });
    const instr = this.add.text(140, 206, 'Tap Secure when the timing marker aligns to finish launch prep steps.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#23352f',
      wordWrap: { width: 980 }
    });
    const status = this.add.text(140, 286, 'Steps 0/4 | Errors 0', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#1f1a16'
    });
    const phaseReadout = this.add.text(140, 334, 'Current step: Tie rope knots', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#2f6c50'
    });
    const ringBg = this.add.rectangle(640, 430, 540, 36, 0x2a2f35, 0.25).setStrokeStyle(2, this.ink, 0.7);
    const ringNeedle = this.add.rectangle(640, 430, 18, 54, 0x475f7c, 1);

    const secureBtn = makeButton(this, 640, 620, 320, 'Secure', () => {
      if (!this.balloonState) return;
      this.balloonState = stepBalloonRigging(this.balloonState, true, 220, this.currentBalloonRiggingConfig());
    }, 0x47604f);

    this.ui.add([panel, title, instr, status, phaseReadout, ringBg, ringNeedle, secureBtn]);

    const updater = () => {
      if (!this.balloonState) return;
      const totalSteps = this.balloonState.steps.length;
      status.setText(`Steps ${this.balloonState.currentStep}/${totalSteps} | Errors ${this.balloonState.mistakes}`);

      const current = this.balloonState.steps[this.balloonState.currentStep];
      if (current) {
        phaseReadout.setText(`Current step: ${this.balloonStepLabel(current.id)}`);
      } else {
        phaseReadout.setText('Current step: Rig complete');
      }

      const phase = balloonPhaseAtTime(this.balloonState.elapsedMs, this.currentBalloonRiggingConfig());
      ringNeedle.x = 370 + phase * 540;
    };
    this.events.on('postupdate', updater);
    this.events.once('shutdown', () => this.events.off('postupdate', updater));
  }

  private updateBalloonRigging(): void {
    if (!this.balloonState) return;
    this.balloonState = stepBalloonRigging(this.balloonState, false, this.game.loop.delta, this.currentBalloonRiggingConfig());

    if (!this.balloonState.done) return;

    const score = balloonRiggingScore(this.balloonState, this.currentBalloonRiggingConfig());
    this.state = markMiniGameScore(this.state, 'balloon-rigging', score);
    const balloonPerfect = isBalloonRiggingPerfect(this.balloonState, this.currentBalloonRiggingConfig());
    if (balloonPerfect) {
      this.state = unlockSketches(this.state, ['rigging-lines']);
    }
    saveState(this.state);
    this.drawHud();

    if (this.balloonState.success) {
      this.playMinigameOutcome(true, balloonPerfect);
      this.showToast(`Rigging complete. Score ${score}`);
      this.startChapter(this.activeMapNode.chapterId);
      return;
    }

    this.playMinigameOutcome(false);
    this.showToast('Launch prep fell out of sequence. Retry.');
    this.routeToMinigame('balloon-rigging');
  }

  private routeToCredits(): void {
    this.screen = 'credits';
    clearContainer(this.ui);
    this.applyBackdrop(this.state.run.chapterId);
    this.playPageTransition();
    this.audio.setAmbientMode('credits');
    this.audio.play('credits');

    if (!this.endReported) {
      this.endReported = true;
      this.hooks.reportEvent({
        type: 'game_end',
        gameId: this.hooks.gameId,
        score: this.state.run.completedNodeIds.length * 10 + this.state.completedPackIds.length * 50,
        outcome: 'complete'
      });
    }

    const panel = makePanel(this, 640, 392, 1140, 540, this.paper, 0.97);
    const title = this.add.text(140, 160, 'Chapter Pack #9 Complete', {
      fontFamily: 'Georgia',
      fontSize: '46px',
      color: '#1f1a16'
    });

    const body = this.add.text(
      140,
      252,
      "Dorothy and her companions have returned to Emerald City, learned the Wizard's ordinary truth, and completed the balloon attempt that left Dorothy still in Oz. The road now turns toward finding another way home.\n\nInspired by the 1900 public domain novel by L. Frank Baum.\nThis game is not affiliated with any film adaptation.",
      {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#1f1a16',
        wordWrap: { width: 980 }
      }
    );

    const replay = makeButton(this, 640, 620, 460, 'Replay from Arrival', () => {
      this.state = createInitialState(this.state.run.seed);
      saveState(this.state);
      this.drawHud();
      this.routeToMap();
      this.reportGameStart();
    }, 0x2f6457);

    this.ui.add([panel, title, body, replay]);
  }

  private reportGameStart(): void {
    this.endReported = false;
    this.hooks.reportEvent({ type: 'game_start', gameId: this.hooks.gameId, mode: 'story' });
  }

  private openCompanionOverlay(companionId: CompanionId): void {
    clearContainer(this.overlay);

    const companion = this.state.companions[companionId];
    const panel = makePanel(this, 640, 390, 980, 460, 0xf4ebd4, 0.98);
    const title = this.add.text(182, 176, COMPANION_LABEL[companionId], {
      fontFamily: 'Georgia',
      fontSize: '38px',
      color: '#1f1a16'
    });

    const trait = this.add.text(182, 230, `${COMPANION_TRAIT[companionId]} Meter: ${companion.meter}/9`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '25px',
      color: '#2b3b35'
    });

    const bio = this.add.text(182, 272, COMPANION_BIO[companionId], {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#1f1a16',
      wordWrap: { width: 860 }
    });

    const actionsText = companion.recentActions.length > 0 ? companion.recentActions.join('\n') : 'No recent actions yet.';
    const actions = this.add.text(182, 330, actionsText, {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#37433d',
      wordWrap: { width: 860 }
    });

    const close = makeButton(this, 640, 584, 260, 'Close', () => clearContainer(this.overlay), 0x5a5a5a);
    this.overlay.add([panel, title, trait, bio, actions, close]);
  }

  private openSketchbookOverlay(): void {
    clearContainer(this.overlay);

    const panel = makePanel(this, 640, 390, 1060, 500, 0xf4ebd4, 0.98);
    const title = this.add.text(170, 156, 'Sketchbook', {
      fontFamily: 'Georgia',
      fontSize: '40px',
      color: '#1f1a16'
    });

    const subtitle = this.add.text(170, 206, `Unlocked ${this.state.unlockedSketches.length}/${this.sketches.length}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#2b3b35'
    });

    this.overlay.add([panel, title, subtitle]);

    for (let i = 0; i < this.sketches.length && i < 12; i += 1) {
      const sketch = this.sketches[i];
      const unlocked = this.state.unlockedSketches.includes(sketch.id);
      const line = unlocked
        ? `${sketch.title}: ${sketch.caption}`
        : `${sketch.title}: Locked (${sketch.unlockRule})`;

      const row = this.add.text(180, 250 + i * 42, line, {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: unlocked ? '#1f1a16' : '#6b6b66',
        wordWrap: { width: 920 }
      });
      this.overlay.add(row);
    }

    const close = makeButton(this, 640, 604, 260, 'Close', () => clearContainer(this.overlay), 0x5a5a5a);
    this.overlay.add(close);
  }

  private cycleSkin(): void {
    const order: OzSkinId[] = ['engraved-paper', 'night-ink', 'field-bloom'];
    const current = order.indexOf(this.visualSettings.skin);
    const next = order[(current + 1) % order.length] ?? 'engraved-paper';
    this.visualSettings = {
      ...this.visualSettings,
      skin: next
    };
    saveVisualSettings(this.visualSettings);
    this.visualTheme = buildTheme(this.visualSettings.skin);
    setUiTheme(this.visualTheme);
    this.ink = this.visualTheme.colors.ink;
    this.paper = this.visualTheme.colors.paper;
    this.vfx = new OzVfxPool(this, this.visualTheme);
    this.drawHud();
    if (this.screen === 'map') this.routeToMap();
    if (this.screen === 'story') this.routeToStory();
    this.showToast(`Skin set: ${this.visualTheme.label}`);
  }

  private openGraphicsOverlay(): void {
    clearContainer(this.overlay);

    const panel = makePanel(this, 640, 390, 980, 500, this.paper, 0.98);
    const title = this.add.text(182, 156, 'Graphics', {
      fontFamily: 'Georgia',
      fontSize: '38px',
      color: '#1f1a16'
    });

    const effects = makeButton(this, 640, 254, 760, `Effects: ${this.visualSettings.effectsQuality}`, () => {
      const next = this.visualSettings.effectsQuality === 'high' ? 'med' : this.visualSettings.effectsQuality === 'med' ? 'low' : 'high';
      this.visualSettings = { ...this.visualSettings, effectsQuality: next };
      saveVisualSettings(this.visualSettings);
      this.openGraphicsOverlay();
    }, 0x435a68);

    const density = makeButton(this, 640, 332, 760, `Particles: ${this.visualSettings.particleDensity}`, () => {
      const next = this.visualSettings.particleDensity === 'normal' ? 'low' : 'normal';
      this.visualSettings = { ...this.visualSettings, particleDensity: next };
      saveVisualSettings(this.visualSettings);
      this.openGraphicsOverlay();
    }, 0x3d6652);

    const detail = makeButton(this, 640, 410, 760, `Background: ${this.visualSettings.backgroundDetail}`, () => {
      const next = this.visualSettings.backgroundDetail === 'enhanced' ? 'basic' : this.visualSettings.backgroundDetail === 'basic' ? 'off' : 'enhanced';
      this.visualSettings = { ...this.visualSettings, backgroundDetail: next };
      saveVisualSettings(this.visualSettings);
      this.applyBackdrop(this.state.run.chapterId);
      this.openGraphicsOverlay();
    }, 0x66553d);

    const reduced = makeButton(this, 640, 488, 760, `Reduced Motion: ${this.isReducedMotion() ? 'On' : 'Off'}`, () => {
      const next = !this.visualSettings.reducedMotion;
      this.visualSettings = { ...this.visualSettings, reducedMotion: next };
      saveVisualSettings(this.visualSettings);
      this.openGraphicsOverlay();
    }, 0x5a4c68);

    const close = makeButton(this, 640, 600, 260, 'Close', () => clearContainer(this.overlay), 0x5a5a5a);
    this.overlay.add([panel, title, effects, density, detail, reduced, close]);
  }

  private openMementosOverlay(): void {
    clearContainer(this.overlay);

    const panel = makePanel(this, 640, 390, 980, 460, 0xf4ebd4, 0.98);
    const title = this.add.text(182, 170, 'Mementos of Virtue', {
      fontFamily: 'Georgia',
      fontSize: '38px',
      color: '#1f1a16'
    });

    const lines = [
      this.state.storyFlags.scarecrowGifted ? 'Token of Brains: Received' : 'Token of Brains: Not yet received',
      this.state.storyFlags.tinGifted ? 'Token of Heart: Received' : 'Token of Heart: Not yet received',
      this.state.storyFlags.lionGifted ? 'Token of Courage: Received' : 'Token of Courage: Not yet received'
    ];

    this.overlay.add([panel, title]);

    for (let i = 0; i < lines.length; i += 1) {
      const row = this.add.text(182, 248 + i * 56, lines[i], {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: lines[i].includes('Received') ? '#1f1a16' : '#6b6b66',
        wordWrap: { width: 860 }
      });
      this.overlay.add(row);
    }

    const close = makeButton(this, 640, 604, 260, 'Close', () => clearContainer(this.overlay), 0x5a5a5a);
    this.overlay.add(close);
  }

  private goldenCapCommandContext(): boolean {
    if (!canUseGoldenCap(this.state)) return false;
    if (this.screen === 'minigame' && this.westernHoldState) return true;
    if (this.screen === 'minigame' && this.dousingState) return true;
    if (this.screen === 'story') {
      return (
        this.state.run.chapterId === 'companion-rescue-chain' ||
        this.state.run.chapterId === 'pack7-cliffhanger' ||
        this.state.run.chapterId === 'golden-cap-continuity'
      );
    }
    return false;
  }

  private triggerGoldenCapCommand(command: GoldenCapCommand): void {
    if (!this.goldenCapCommandContext()) return;
    if (this.screen === 'minigame' && this.westernHoldState) {
      this.westernCommandQueued = command === 'clear-path';
      return;
    }
    if (this.screen === 'minigame' && this.dousingState) {
      this.dousingCommandQueued = command === 'clear-path';
      return;
    }
    this.showToast('Choose a command story option to spend a Golden Cap use.');
  }

  private showToast(message: string): void {
    this.toast.setText(message).setVisible(true);
    this.toastUntil = this.time.now + 1800;
    if (message.toLowerCase().includes('retry')) {
      this.vfx?.inkPuff(640, 82, {
        reducedMotion: this.isReducedMotion(),
        density: this.visualSettings.particleDensity
      });
    } else if (message.toLowerCase().includes('score')) {
      this.vfx?.sparkle(640, 82, {
        reducedMotion: this.isReducedMotion(),
        density: this.visualSettings.particleDensity
      });
    }
  }

  private threatLevelLabel(value: number): string {
    if (value >= 4) return 'IV - Imminent';
    if (value >= 3) return 'III - High';
    if (value >= 2) return 'II - Rising';
    if (value >= 1) return 'I - Watch';
    return 'None';
  }
}
