import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../../game/modules';
import { persistence } from '../../systems/persistence';
import { loadCosmeticsCatalog, loadGearCatalog, loadSpotCatalog, resolveSpotById } from './content';
import { cycleWeather, loadEnvironmentDefinition, resolveLakeZone, toggleTimeOfDay, zoneSpawnWeight } from './environment';
import {
  createFishAgentPool,
  createHookedFish,
  loadFishCatalog,
  seedFishAgents,
  stepFishAiAgents,
  stepFishBehavior,
  transitionHookedFishState
} from './fish';
import { beginSwipe, createSwipeState, finishSwipe, moveSwipe } from './input';
import {
  applyCatchProgress,
  applyDerbyTournamentResult,
  applyFightReplay,
  applyLakeStatsUpdate,
  applySeasonSessionRecord,
  applySessionHighlights,
  calculateCatchXp,
  equipBobberSkin,
  equipLureSkin,
  equipLoadoutItem,
  loadProgression,
  normalizeSpotSelectionForLevel,
  saveProgression
} from './progression';
import { detectSessionHighlights } from './highlights';
import {
  buildGraphicsRuntime,
  cycleEnvironmentDetail,
  cycleEffectsQuality,
  cycleParticleDensity,
  cycleWaterDetail,
  loadGraphicsSettings,
  saveGraphicsSettings
} from './graphicsSettings';
import {
  cycleCinematicCameraMode,
  loadCinematicSettings,
  resolveCinematicRuntime,
  saveCinematicSettings,
  type OzarkCinematicRuntime,
  type OzarkCinematicSettings
} from './cinematicSettings';
import { OzarkCameraController } from './camera';
import { computeVisualDelta, VisualSlowMoController } from './slowMo';
import { OzarkAudioMixController } from './audioMix';
import { resolveUiMotionDurations, type UiMotionDurations } from './uiMotion';
import {
  deterministicSighting,
  eligibleLegendaries,
  getSeasonForDate,
  isIceFishingAvailable,
  isoWeekKey,
  jigPatternInfluence,
  loadLegendaryRules,
  loadSeasonCatalog,
  loadWeeklyEvents,
  pickWeeklyEvent,
  spawnWeightWithSeasonEvent
} from './liveops';
import { adjustPhotoCamera, createDefaultPhotoModeState, cyclePhotoFilter, exportPhotoModePng, type PhotoModeState } from './photoMode';
import { composeScene, type SceneComposition, type SeasonId } from './sceneCompose';
import { ReplayPlayer, appendReplayEvent, appendReplaySample, createReplayDraft, finalizeReplayDraft, type ReplayDraft } from './replay';
import { FishRenderSystem } from './fishRender';
import {
  applyReelInputEvent,
  computeBiteChancePerSecond,
  computeCastFromSwipe,
  computeLoadoutModifiers,
  createCastSession,
  evaluateHookTiming,
  loadLureCatalog,
  resolveLureDepth,
  seedToRng
} from './rules';
import { renderCatchCardPng, triggerBlobDownload } from './shareCard';
import {
  activeParticleCount,
  activeRippleCount,
  createParticlePool,
  createRipplePool,
  spawnParticle,
  spawnRipple,
  updateParticles,
  updateRipples,
  type ParticlePool,
  type RipplePool
} from './vfxPool';
import { deriveP95Weight, JumpMomentController, planJumpMoment } from './jumpMoment';
import { triggerHaptic } from '../../systems/gameplayComfort';
import type {
  CastSessionState,
  CatchRecord,
  DailyChallenge,
  FishDefinition,
  HookedFish,
  LakeZone,
  OzarkMode,
  ProgressionState,
  RarityTier,
  SpotDefinition,
  TimeOfDay,
  WeatherType
} from './types';

interface OzarkFishingSceneConfig {
  hooks: GameRuntimeHooks;
}

type Phase = 'idle' | 'lure' | 'hook_window' | 'reeling' | 'catch' | 'summary';

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  len: number;
}

interface WeedStem {
  x: number;
  y: number;
  height: number;
  swayPhase: number;
  swayAmp: number;
}

interface SessionCatch extends CatchRecord {
  derbyScoreLb: number;
}

const MODE_LABELS: Record<OzarkMode, string> = {
  free_fish: 'Free Fish',
  timed_derby: 'Timed Derby',
  big_catch: 'Big Catch',
  ice_fishing: 'Ice Fishing'
};

const MODE_ORDER: OzarkMode[] = ['free_fish', 'timed_derby', 'big_catch', 'ice_fishing'];

const XP_LEVEL_TABLE = [0, 80, 190, 350, 580, 900, 1300, 1780, 2350, 3050, 3900, 4900, 6000] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function fmtLb(weightLb: number): string {
  return `${weightLb.toFixed(2)} lb`;
}

function modeDurationSec(mode: OzarkMode): number {
  if (mode === 'timed_derby') return 5 * 60;
  return 0;
}

function mmss(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  const ss = seconds < 10 ? `0${seconds}` : String(seconds);
  return `${mm}:${ss}`;
}

function rarityWeightMultiplier(tier: RarityTier): number {
  if (tier === 'Legendary') return 1.45;
  if (tier === 'Rare') return 1.25;
  if (tier === 'Uncommon') return 1.1;
  return 1;
}

function levelProgressRatio(xp: number): number {
  let idx = 0;
  for (let i = 0; i < XP_LEVEL_TABLE.length; i += 1) {
    if (xp >= XP_LEVEL_TABLE[i]) idx = i;
  }
  const current = XP_LEVEL_TABLE[idx];
  const next = XP_LEVEL_TABLE[Math.min(XP_LEVEL_TABLE.length - 1, idx + 1)];
  if (next <= current) return 1;
  return clamp((xp - current) / (next - current), 0, 1);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stableHash(text: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class OzarkFishingScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private readonly fishCatalog = loadFishCatalog();
  private readonly lureCatalog = loadLureCatalog();
  private readonly environment = loadEnvironmentDefinition();
  private readonly spots = loadSpotCatalog();
  private readonly gear = loadGearCatalog();
  private readonly cosmeticsCatalog = loadCosmeticsCatalog();
  private readonly seasonCatalog = loadSeasonCatalog();
  private readonly weeklyEvents = loadWeeklyEvents();
  private readonly legendaryRules = loadLegendaryRules();
  private readonly fishPool = createFishAgentPool(12);
  private readonly fishRender = new FishRenderSystem();
  private readonly jumpMoment = new JumpMomentController();

  private progression: ProgressionState = loadProgression();

  private phase: Phase = 'idle';
  private mode: OzarkMode = 'free_fish';
  private weather: WeatherType = 'sunny';
  private timeOfDay: TimeOfDay = 'day';
  private castAssistEnabled = true;
  private debugZonesEnabled = false;
  private sandboxAllowIceFishing = false;

  private selectedSpotId = normalizeSpotSelectionForLevel(this.progression.level, 'cove');
  private currentSeason = getSeasonForDate(new Date(), this.seasonCatalog);
  private currentWeeklyEvent = pickWeeklyEvent(isoWeekKey(new Date()), this.weeklyEvents, 0);
  private weeklyEventEnabled = true;
  private sightingHint = deterministicSighting(isoWeekKey(new Date()), 0, eligibleLegendaries(this.legendaryRules, getSeasonForDate(new Date(), this.seasonCatalog).id, pickWeeklyEvent(isoWeekKey(new Date()), this.weeklyEvents, 0).id));

  private castDistanceNorm = 0;
  private castAimOffset = 0;
  private lureElapsedSec = 0;
  private lureMotionSpeed = 0;
  private lureSleeping = false;
  private aiStepAcc = 0;

  private currentDepth: 'shallow' | 'mid' | 'deep' = 'shallow';
  private currentZone: LakeZone = 'shoreline';
  private biteFish: FishDefinition | null = null;
  private hookWindowStartMs = 0;
  private hookWindowMs = 800;

  private hookedFish: HookedFish | null = null;
  private isReeling = false;
  private reelCreakCooldownSec = 0;
  private reelStepAccSec = 0;
  private iceHoleProgress = 0;
  private jigTapTimes: number[] = [];

  private timerSec = 0;
  private totalWeightCaught = 0;
  private biggestCatch = 0;
  private catchesInRound = 0;

  private castSession: CastSessionState | null = null;
  private castRng = seedToRng(1);

  private rainDrops: RainDrop[] = [];
  private weedStems: WeedStem[] = [];
  private readonly rainRipplePool: RipplePool = createRipplePool(52);
  private readonly splashRipplePool: RipplePool = createRipplePool(36);
  private readonly underwaterParticlePool: ParticlePool = createParticlePool(84);
  private readonly splashParticlePool: ParticlePool = createParticlePool(68);
  private readonly ambientParticlePool: ParticlePool = createParticlePool(120);
  private rainRippleSpawnAcc = 0;
  private particleSpawnAcc = 0;
  private drillParticleBurstAcc = 0;
  private visualFpsSmoothed = 60;
  private lowFpsAccumSec = 0;
  private heavyEffectsAutoDisabled = false;
  private showDevFps = false;
  private lightingAlphaTarget = 0;
  private lightingAlphaCurrent = 0;
  private lightingColorTarget = 0x00122b;
  private lightingColorCurrent = new Phaser.Display.Color(0, 18, 43);
  private lineTintLerp = 0;
  private lineWidthLerp = 1;
  private previousFightBehavior: HookedFish['behavior'] | null = null;
  private xpFillTarget = 0;
  private rarePulseSec = 0;
  private reducedMotion = prefersReducedMotion() || persistence.loadSettings().reducedMotion;
  private hapticsEnabled = persistence.loadSettings().haptics;
  private graphicsSettings = loadGraphicsSettings();
  private graphicsRuntime = buildGraphicsRuntime(this.graphicsSettings, false, this.reducedMotion);
  private cinematicSettings: OzarkCinematicSettings = loadCinematicSettings();
  private cinematicRuntime: OzarkCinematicRuntime = resolveCinematicRuntime(this.cinematicSettings, this.reducedMotion, false);
  private readonly cameraController = new OzarkCameraController();
  private readonly slowMoController = new VisualSlowMoController();
  private readonly audioMix = new OzarkAudioMixController();
  private uiMotion: UiMotionDurations = resolveUiMotionDurations(this.reducedMotion, false);
  private visualClockMs = 0;
  private dramaticRunSlowMoCooldownSec = 0;
  private bobberDipSec = 0;
  private jumpVisualY = 0;
  private jumpVisualT = 0;
  private jumpVisualActive = false;
  private bigMomentActive = false;
  private bigMomentSparkleAcc = 0;
  private breathVaporAcc = 0;
  private ambientSpawnAcc = 0;
  private cloudDriftPhase = 0;
  private visualRngState = 0x9e3779b9;
  private sceneComposition: SceneComposition | null = null;
  private sceneComposeKey = '';
  private visualSessionSeed = 1;
  private lastLiveOpsRefreshAt = 0;

  private sessionCatches: SessionCatch[] = [];

  private waterBaseGfx!: Phaser.GameObjects.Graphics;
  private envBackdropGfx!: Phaser.GameObjects.Graphics;
  private skyCloudFarGfx!: Phaser.GameObjects.Graphics;
  private skyCloudNearGfx!: Phaser.GameObjects.Graphics;
  private waveFarGfx!: Phaser.GameObjects.Graphics;
  private waveMidGfx!: Phaser.GameObjects.Graphics;
  private waveNearGfx!: Phaser.GameObjects.Graphics;
  private shorelineFoamGfx!: Phaser.GameObjects.Graphics;
  private underwaterGfx!: Phaser.GameObjects.Graphics;
  private shorelineDepthGfx!: Phaser.GameObjects.Graphics;
  private lightShaftGfx!: Phaser.GameObjects.Graphics;
  private weedGfx!: Phaser.GameObjects.Graphics;
  private foregroundPropsGfx!: Phaser.GameObjects.Graphics;
  private fishGfx!: Phaser.GameObjects.Graphics;
  private rippleGfx!: Phaser.GameObjects.Graphics;
  private splashGfx!: Phaser.GameObjects.Graphics;
  private ambientGfx!: Phaser.GameObjects.Graphics;
  private rainGfx!: Phaser.GameObjects.Graphics;
  private iceFxGfx!: Phaser.GameObjects.Graphics;
  private moonPathGfx!: Phaser.GameObjects.Graphics;
  private lineGfx!: Phaser.GameObjects.Graphics;
  private lureGfx!: Phaser.GameObjects.Graphics;
  private zoneDebugGfx!: Phaser.GameObjects.Graphics;
  private bobber!: Phaser.GameObjects.Arc;
  private bobberCap!: Phaser.GameObjects.Arc;
  private tintOverlay!: Phaser.GameObjects.Rectangle;
  private rareVignette!: Phaser.GameObjects.Rectangle;
  private tensionGlow!: Phaser.GameObjects.Rectangle;
  private frostVignette!: Phaser.GameObjects.Rectangle;
  private worldLayer!: Phaser.GameObjects.Container;

  private topHud!: Phaser.GameObjects.Text;
  private topSubHud!: Phaser.GameObjects.Text;
  private messageHud!: Phaser.GameObjects.Text;
  private sideHud!: Phaser.GameObjects.Text;
  private fpsHud!: Phaser.GameObjects.Text;
  private slowMoText!: Phaser.GameObjects.Text;
  private bigMomentVignette!: Phaser.GameObjects.Rectangle;
  private bigMomentBanner!: Phaser.GameObjects.Text;
  private bigMomentHint!: Phaser.GameObjects.Text;

  private tensionFill!: Phaser.GameObjects.Rectangle;
  private staminaFill!: Phaser.GameObjects.Rectangle;
  private lineTightFill!: Phaser.GameObjects.Rectangle;
  private reelLabel!: Phaser.GameObjects.Text;

  private modeButton!: Phaser.GameObjects.Text;
  private weatherButton!: Phaser.GameObjects.Text;
  private timeButton!: Phaser.GameObjects.Text;
  private assistButton!: Phaser.GameObjects.Text;
  private spotButton!: Phaser.GameObjects.Text;
  private spotPreviewGfx!: Phaser.GameObjects.Graphics;
  private spotPreviewText!: Phaser.GameObjects.Text;
  private seasonButton!: Phaser.GameObjects.Text;
  private eventButton!: Phaser.GameObjects.Text;
  private debugButton!: Phaser.GameObjects.Text;

  private catchOverlay!: Phaser.GameObjects.Container;
  private catchText!: Phaser.GameObjects.Text;
  private fishArtText!: Phaser.GameObjects.Text;
  private trophyText!: Phaser.GameObjects.Text;
  private catchPanelRect!: Phaser.GameObjects.Rectangle;
  private xpBarFill!: Phaser.GameObjects.Rectangle;
  private catchShareButton!: Phaser.GameObjects.Text;
  private catchGlowRing!: Phaser.GameObjects.Arc;

  private loadoutPanel!: Phaser.GameObjects.Container;
  private loadoutText!: Phaser.GameObjects.Text;
  private cosmeticsPanel!: Phaser.GameObjects.Container;
  private cosmeticsText!: Phaser.GameObjects.Text;
  private cosmeticsPreviewWater!: Phaser.GameObjects.Rectangle;
  private cosmeticsPreviewBobber!: Phaser.GameObjects.Arc;
  private cosmeticsPreviewLure!: Phaser.GameObjects.Rectangle;
  private trophyPanel!: Phaser.GameObjects.Container;
  private trophyPanelText!: Phaser.GameObjects.Text;
  private summaryPanel!: Phaser.GameObjects.Container;
  private summaryText!: Phaser.GameObjects.Text;
  private replayPanel!: Phaser.GameObjects.Container;
  private replayText!: Phaser.GameObjects.Text;
  private replaySliderFill!: Phaser.GameObjects.Rectangle;
  private lakeStatsPanel!: Phaser.GameObjects.Container;
  private lakeStatsText!: Phaser.GameObjects.Text;

  private replayDraft: ReplayDraft | null = null;
  private readonly replayPlayer = new ReplayPlayer();
  private activeReplayId: string | null = null;
  private sessionReplayIds: string[] = [];
  private photoMode: PhotoModeState = createDefaultPhotoModeState();
  private photoFilterOverlay!: Phaser.GameObjects.Rectangle;
  private graphicsPanel!: Phaser.GameObjects.Container;
  private graphicsPanelText!: Phaser.GameObjects.Text;

  private swipe = createSwipeState();

  constructor(config: OzarkFishingSceneConfig) {
    super('ozark-fishing-main');
    this.hooks = config.hooks;
  }

  private updateGraphicsRuntime() {
    this.graphicsRuntime = buildGraphicsRuntime(this.graphicsSettings, this.heavyEffectsAutoDisabled, this.reducedMotion);
    this.cinematicRuntime = resolveCinematicRuntime(this.cinematicSettings, this.reducedMotion, this.heavyEffectsAutoDisabled);
    this.slowMoController.setEnabled(this.cinematicRuntime.slowMoEnabled);
    this.uiMotion = resolveUiMotionDurations(this.reducedMotion, this.heavyEffectsAutoDisabled);
  }

  private nextVisualRand(): number {
    this.visualRngState = (this.visualRngState * 1664525 + 1013904223) >>> 0;
    return this.visualRngState / 0x100000000;
  }

  private sceneSeasonId(): SeasonId {
    if (this.currentSeason.id === 'spring' || this.currentSeason.id === 'summer' || this.currentSeason.id === 'fall' || this.currentSeason.id === 'winter') {
      return this.currentSeason.id;
    }
    return 'summer';
  }

  private ensureSceneComposition() {
    const key = [
      this.visualSessionSeed,
      this.selectedSpot.id,
      this.sceneSeasonId(),
      this.weather,
      this.timeOfDay,
      this.graphicsSettings.effectsQuality,
      this.graphicsSettings.environmentDetail,
      this.reducedMotion ? 1 : 0,
      this.heavyEffectsAutoDisabled ? 1 : 0
    ].join('|');
    if (key === this.sceneComposeKey && this.sceneComposition) return;

    this.sceneComposeKey = key;
    this.sceneComposition = composeScene({
      sessionSeed: this.visualSessionSeed,
      spotId: this.selectedSpot.id,
      seasonId: this.sceneSeasonId(),
      weather: this.weather,
      timeOfDay: this.timeOfDay,
      effectsQuality: this.graphicsSettings.effectsQuality,
      environmentDetail: this.graphicsSettings.environmentDetail,
      reducedMotion: this.reducedMotion,
      lowPerfFallback: this.heavyEffectsAutoDisabled
    });
    this.initRainDrops();
    this.updateSpotPreview();
  }

  private persistGraphicsSettings() {
    saveGraphicsSettings(this.graphicsSettings);
    this.updateGraphicsRuntime();
    this.sceneComposeKey = '';
    this.ensureSceneComposition();
    this.updateGraphicsPanelText();
  }

  private persistCinematicSettings() {
    saveCinematicSettings(this.cinematicSettings);
    this.updateGraphicsRuntime();
    this.updateGraphicsPanelText();
  }

  create(): void {
    const portalSettings = persistence.loadSettings();
    this.reducedMotion = prefersReducedMotion() || this.graphicsSettings.reducedMotion || portalSettings.reducedMotion;
    this.hapticsEnabled = portalSettings.haptics;
    this.timerSec = this.mode === 'timed_derby' ? this.currentDerbyDurationSec() : modeDurationSec(this.mode);
    this.visualSessionSeed = this.hooks.multiplayer?.seed ?? stableHash(`${isoWeekKey(new Date())}|ozark-fishing`);
    this.visualRngState = (this.visualSessionSeed ^ 0x9e3779b9) >>> 0;

    this.waterBaseGfx = this.add.graphics().setDepth(2);
    this.envBackdropGfx = this.add.graphics().setDepth(2);
    this.skyCloudFarGfx = this.add.graphics().setDepth(3);
    this.skyCloudNearGfx = this.add.graphics().setDepth(3);
    this.waveFarGfx = this.add.graphics().setDepth(3);
    this.waveMidGfx = this.add.graphics().setDepth(4);
    this.waveNearGfx = this.add.graphics().setDepth(5);
    this.shorelineFoamGfx = this.add.graphics().setDepth(6);
    this.underwaterGfx = this.add.graphics().setDepth(7);
    this.shorelineDepthGfx = this.add.graphics().setDepth(7);
    this.lightShaftGfx = this.add.graphics().setDepth(8);
    this.weedGfx = this.add.graphics().setDepth(9);
    this.foregroundPropsGfx = this.add.graphics().setDepth(10);
    this.fishGfx = this.add.graphics().setDepth(10);
    this.rippleGfx = this.add.graphics().setDepth(11);
    this.splashGfx = this.add.graphics().setDepth(12);
    this.ambientGfx = this.add.graphics().setDepth(12);
    this.rainGfx = this.add.graphics().setDepth(13);
    this.iceFxGfx = this.add.graphics().setDepth(14);
    this.moonPathGfx = this.add.graphics().setDepth(15);
    this.zoneDebugGfx = this.add.graphics().setDepth(31).setVisible(false);
    this.lineGfx = this.add.graphics().setDepth(35);
    this.lureGfx = this.add.graphics().setDepth(34);
    this.bobber = this.add.circle(640, 540, 8, 0xff6b57, 1).setStrokeStyle(2, 0xffffff).setDepth(36);
    this.bobberCap = this.add.circle(640, 533, 3, 0xffffff, 0.95).setDepth(36);

    this.tintOverlay = this.add.rectangle(640, 360, 1280, 720, 0x00122b, 0).setDepth(30);
    this.rareVignette = this.add.rectangle(640, 360, 1280, 720, 0x7a1b1b, 0).setDepth(69);
    this.tensionGlow = this.add.rectangle(640, 360, 1280, 720, 0xff7b4a, 0).setDepth(68);
    this.frostVignette = this.add.rectangle(640, 360, 1280, 720, 0xc8edff, 0).setDepth(67);
    this.bigMomentVignette = this.add.rectangle(640, 360, 1280, 720, 0x05070f, 0).setDepth(75);
    this.bigMomentBanner = this.add
      .text(640, 128, 'TROPHY CATCH', { fontFamily: 'Verdana', fontSize: '36px', color: '#ffe9a8' })
      .setOrigin(0.5)
      .setDepth(76)
      .setVisible(false);
    this.bigMomentHint = this.add
      .text(640, 168, 'Tap to skip • Share card highlighted', { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#d7ebff' })
      .setOrigin(0.5)
      .setDepth(76)
      .setVisible(false);

    this.add.rectangle(640, 32, 1240, 52, 0x0a2637, 0.42).setDepth(69);
    this.add.rectangle(1110, 350, 300, 470, 0x0a2637, 0.36).setDepth(69).setStrokeStyle(1, 0x9ed4f5, 0.35);
    this.add.rectangle(360, 690, 680, 42, 0x0a2637, 0.38).setDepth(69);
    this.topHud = this.add.text(28, 12, '', { fontFamily: 'Trebuchet MS', fontSize: '21px', color: '#e7f7ff' }).setDepth(70);
    this.topSubHud = this.add.text(28, 36, '', { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#c3e3f8' }).setDepth(70);
    this.messageHud = this.add.text(28, 676, 'Swipe up to cast into the lake.', { fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#f8f2d0' }).setDepth(70);
    this.sideHud = this.add.text(978, 128, '', { fontFamily: 'Trebuchet MS', fontSize: '13px', color: '#dbf4ff', align: 'left' }).setDepth(70).setOrigin(0, 0);
    this.fpsHud = this.add.text(1130, 92, '', { fontFamily: 'monospace', fontSize: '12px', color: '#b9ffde' }).setDepth(74).setVisible(false);

    this.add.rectangle(720, 628, 520, 14, 0x274a5c).setOrigin(0, 0.5).setDepth(71);
    this.tensionFill = this.add.rectangle(720, 628, 0, 14, 0x89d6ff).setOrigin(0, 0.5).setDepth(72);
    this.add.rectangle(720, 650, 520, 14, 0x2e3c30).setOrigin(0, 0.5).setDepth(71);
    this.staminaFill = this.add.rectangle(720, 650, 0, 14, 0x8ee676).setOrigin(0, 0.5).setDepth(72);
    this.add.rectangle(720, 672, 520, 14, 0x2e2942).setOrigin(0, 0.5).setDepth(71);
    this.lineTightFill = this.add.rectangle(720, 672, 0, 14, 0xc4a7ff).setOrigin(0, 0.5).setDepth(72);

    this.reelLabel = this.add.text(720, 598, 'Reel: idle', { fontFamily: 'Verdana', fontSize: '15px', color: '#dcecff' }).setDepth(72);
    this.slowMoText = this.add
      .text(640, 88, '', { fontFamily: 'Verdana', fontSize: '20px', color: '#ffe9c4' })
      .setOrigin(0.5)
      .setDepth(74)
      .setAlpha(0);

    this.worldLayer = this.add.container(0, 0, [
      this.waterBaseGfx,
      this.envBackdropGfx,
      this.skyCloudFarGfx,
      this.skyCloudNearGfx,
      this.waveFarGfx,
      this.waveMidGfx,
      this.waveNearGfx,
      this.shorelineFoamGfx,
      this.underwaterGfx,
      this.shorelineDepthGfx,
      this.lightShaftGfx,
      this.weedGfx,
      this.foregroundPropsGfx,
      this.fishGfx,
      this.rippleGfx,
      this.splashGfx,
      this.ambientGfx,
      this.rainGfx,
      this.iceFxGfx,
      this.moonPathGfx,
      this.tintOverlay,
      this.frostVignette,
      this.tensionGlow,
      this.rareVignette,
      this.lineGfx,
      this.lureGfx,
      this.bobber,
      this.bobberCap
    ]);

    this.makeButton(60, 618, 'Cast', () => {
      if (this.phase !== 'idle') return;
      this.performCast(0, -300);
    });
    this.makeHoldButton(
      166,
      618,
      'Reel',
      () => {
        if (this.phase !== 'reeling') return;
        this.isReeling = true;
      },
      () => {
        this.isReeling = false;
      }
    );

    this.modeButton = this.makeButton(24, 76, '', () => {
      const current = MODE_ORDER.indexOf(this.mode);
      this.setMode(MODE_ORDER[(current + 1) % MODE_ORDER.length]);
    });
    this.weatherButton = this.makeButton(196, 76, '', () => {
      this.weather = cycleWeather(this.weather);
    });
    this.timeButton = this.makeButton(356, 76, '', () => {
      this.timeOfDay = toggleTimeOfDay(this.timeOfDay);
    });
    this.assistButton = this.makeButton(496, 76, '', () => {
      this.castAssistEnabled = !this.castAssistEnabled;
    });
    this.spotButton = this.makeButton(650, 76, '', () => {
      this.cycleSpot();
    });
    this.spotPreviewGfx = this.add.graphics().setDepth(73);
    this.spotPreviewText = this.add.text(650, 106, '', { fontFamily: 'Trebuchet MS', fontSize: '12px', color: '#d0eeff' }).setDepth(73);
    this.seasonButton = this.makeButton(24, 144, '', () => {
      this.toggleSummaryPanel('season');
    });
    this.eventButton = this.makeButton(220, 144, '', () => {
      this.toggleSummaryPanel('event');
    });
    this.makeButton(816, 76, 'Loadout', () => {
      this.toggleLoadoutPanel();
    });
    this.makeButton(928, 76, 'Trophy Book', () => {
      this.toggleTrophyPanel();
    });
    this.makeButton(1094, 76, 'Challenges', () => {
      this.toggleSummaryPanel('challenge');
    });
    this.makeButton(196, 110, 'Highlights', () => {
      this.toggleSummaryPanel('highlight');
    });
    this.makeButton(320, 110, 'Seasons', () => {
      this.toggleSummaryPanel('season');
    });
    this.makeButton(430, 110, 'Event', () => {
      this.toggleSummaryPanel('event');
    });
    this.makeButton(520, 110, 'Ice', () => {
      this.toggleSummaryPanel('ice');
    });
    this.makeButton(590, 110, 'Standings', () => {
      this.toggleSummaryPanel('standings');
    });
    this.makeButton(1210, 76, 'Lake Stats', () => {
      this.toggleLakeStatsPanel();
    });
    this.makeButton(1070, 110, 'Graphics', () => {
      this.toggleGraphicsPanel();
    });

    this.debugButton = this.makeButton(24, 110, 'Debug Zones', () => {
      if (!import.meta.env.DEV) return;
      this.debugZonesEnabled = !this.debugZonesEnabled;
      this.zoneDebugGfx.setVisible(this.debugZonesEnabled);
    });
    if (!import.meta.env.DEV) {
      this.debugButton.setVisible(false);
      this.debugButton.disableInteractive();
    }

    this.fishArtText = this.add.text(430, 266, '', { fontFamily: 'Verdana', fontSize: '44px', color: '#9fd7ff' }).setDepth(81);
    this.catchText = this.add.text(640, 302, '', {
      fontFamily: 'Verdana',
      fontSize: '22px',
      color: '#f4fbff',
      align: 'center'
    }).setOrigin(0.5).setDepth(81);
    this.trophyText = this.add.text(640, 468, 'TROPHY CATCH!', { fontFamily: 'Verdana', fontSize: '27px', color: '#ffe483' }).setOrigin(0.5).setDepth(81).setVisible(false);
    this.catchGlowRing = this.add.circle(640, 362, 142, 0xffffff, 0).setStrokeStyle(2, 0x9fd7ff, 0.5).setDepth(81).setVisible(false);

    const xpBarBg = this.add.rectangle(430, 430, 420, 16, 0x2e3c30).setOrigin(0, 0.5).setDepth(81);
    this.xpBarFill = this.add.rectangle(430, 430, 0, 16, 0x72f2ac).setOrigin(0, 0.5).setDepth(82);

    const panel = this.add.rectangle(640, 360, 760, 320, 0x071624, 0.93).setStrokeStyle(3, 0x89d6ff);
    this.catchPanelRect = panel;
    const release = this.add
      .text(500, 506, 'Release', { fontFamily: 'Verdana', fontSize: '22px', color: '#a8ffd0' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.dismissCatch());
    const keep = this.add
      .text(704, 506, 'Keep', { fontFamily: 'Verdana', fontSize: '22px', color: '#ffd9a3' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.dismissCatch());
    const watchReplay = this.add
      .text(430, 538, 'Watch Replay', { fontFamily: 'Verdana', fontSize: '18px', color: '#b2e5ff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.openLatestReplay());
    const photoMode = this.add
      .text(620, 538, 'Photo Mode', { fontFamily: 'Verdana', fontSize: '18px', color: '#f0d8ff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.togglePhotoMode());
    const shareCard = this.add
      .text(785, 538, 'Share Card', { fontFamily: 'Verdana', fontSize: '18px', color: '#ffd9a3' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => void this.shareLatestCatchCard());
    this.bindButtonMicroInteraction(release);
    this.bindButtonMicroInteraction(keep);
    this.bindButtonMicroInteraction(watchReplay);
    this.bindButtonMicroInteraction(photoMode);
    this.bindButtonMicroInteraction(shareCard);
    this.catchShareButton = shareCard;

    this.catchOverlay = this.add
      .container(0, 0, [panel, this.catchGlowRing, this.fishArtText, this.catchText, xpBarBg, this.xpBarFill, this.trophyText, release, keep, watchReplay, photoMode, shareCard])
      .setDepth(80)
      .setVisible(false);

    this.loadoutText = this.add.text(360, 218, '', { fontFamily: 'Verdana', fontSize: '16px', color: '#ecf6ff', align: 'left', wordWrap: { width: 560 } });
    this.loadoutPanel = this.makePanel(this.loadoutText, [
      { x: 370, y: 500, label: 'Rod', onClick: () => this.cycleLoadout('rodId') },
      { x: 500, y: 500, label: 'Reel', onClick: () => this.cycleLoadout('reelId') },
      { x: 640, y: 500, label: 'Line', onClick: () => this.cycleLoadout('lineId') },
      { x: 770, y: 500, label: 'Lure', onClick: () => this.cycleLoadout('lureId') },
      { x: 860, y: 500, label: 'Cosmetics', onClick: () => this.toggleCosmeticsPanel() },
      { x: 980, y: 500, label: 'Close', onClick: () => this.setPanelVisible(this.loadoutPanel, false) }
    ]);

    this.cosmeticsText = this.add.text(325, 208, '', { fontFamily: 'Verdana', fontSize: '15px', color: '#ecf6ff', align: 'left', wordWrap: { width: 640 } });
    this.cosmeticsPreviewWater = this.add.rectangle(640, 372, 420, 128, 0x2f6c94, 0.5).setStrokeStyle(1, 0xa6daff, 0.36);
    this.cosmeticsPreviewBobber = this.add.circle(560, 360, 14, 0xff5e58, 1).setStrokeStyle(2, 0xffffff, 1);
    this.cosmeticsPreviewLure = this.add.rectangle(708, 382, 38, 10, 0x7aa6bf, 1).setStrokeStyle(1, 0xe7f4ff, 0.9);
    this.cosmeticsPanel = this.makePanel(this.cosmeticsText, [
      { x: 360, y: 500, label: 'Bobber Next', onClick: () => this.cycleBobberSkin() },
      { x: 520, y: 500, label: 'Lure Skin', onClick: () => this.cycleCurrentLureSkin() },
      { x: 700, y: 500, label: 'Back', onClick: () => this.toggleCosmeticsPanel() },
      { x: 790, y: 500, label: 'Close', onClick: () => this.setPanelVisible(this.cosmeticsPanel, false) }
    ]);
    this.cosmeticsPanel.add([this.cosmeticsPreviewWater, this.cosmeticsPreviewBobber, this.cosmeticsPreviewLure]);

    this.trophyPanelText = this.add.text(300, 188, '', { fontFamily: 'Verdana', fontSize: '14px', color: '#f1f7ff', align: 'left', wordWrap: { width: 680 } });
    this.trophyPanel = this.makePanel(this.trophyPanelText, [
      { x: 700, y: 500, label: 'Photo', onClick: () => this.togglePhotoMode() },
      { x: 790, y: 500, label: 'Share Card', onClick: () => void this.shareLatestCatchCard() },
      { x: 930, y: 500, label: 'Close', onClick: () => this.setPanelVisible(this.trophyPanel, false) }
    ]);

    this.summaryText = this.add.text(300, 200, '', { fontFamily: 'Verdana', fontSize: '15px', color: '#f5fbff', align: 'left', wordWrap: { width: 700 } });
    this.summaryPanel = this.makePanel(this.summaryText, [{ x: 900, y: 500, label: 'Close', onClick: () => this.setPanelVisible(this.summaryPanel, false) }]);

    this.replayText = this.add.text(320, 210, '', { fontFamily: 'Verdana', fontSize: '15px', color: '#f5fbff', align: 'left', wordWrap: { width: 680 } });
    this.replaySliderFill = this.add.rectangle(340, 468, 0, 12, 0x72f2ac).setOrigin(0, 0.5);
    const replaySliderTrack = this.add.rectangle(640, 468, 600, 12, 0x2e3c30).setInteractive({ useHandCursor: true });
    replaySliderTrack.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const local = clamp((pointer.x - (640 - 300)) / 600, 0, 1);
      this.replayPlayer.scrub(local);
      this.updateReplayPanelText();
      this.replaySliderFill.width = 600 * local;
    });
    this.replayPanel = this.add
      .container(0, 0, [
        this.add.rectangle(640, 360, 760, 360, 0x061522, 0.94).setStrokeStyle(3, 0x7eb8de),
        this.replayText,
        replaySliderTrack,
        this.replaySliderFill,
        this.makeButton(360, 500, 'Play/Pause', () => this.replayPlayer.setPlaying(!this.replayPlayer.isPlaying())),
        this.makeButton(500, 500, '2x', () => this.replayPlayer.toggleSpeed()),
        this.makeButton(590, 500, 'Photo', () => this.togglePhotoMode()),
        this.makeButton(690, 500, 'Share', () => void this.shareLatestCatchCard()),
        this.makeButton(790, 500, 'Close', () => this.setPanelVisible(this.replayPanel, false))
      ])
      .setDepth(90)
      .setVisible(false);

    this.lakeStatsText = this.add.text(300, 200, '', { fontFamily: 'Verdana', fontSize: '15px', color: '#f5fbff', align: 'left', wordWrap: { width: 700 } });
    this.lakeStatsPanel = this.makePanel(this.lakeStatsText, [{ x: 900, y: 500, label: 'Close', onClick: () => this.setPanelVisible(this.lakeStatsPanel, false) }]);
    this.graphicsPanelText = this.add.text(300, 200, '', { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#f5fbff', align: 'left', wordWrap: { width: 700 } });
    this.graphicsPanel = this.makePanel(this.graphicsPanelText, [
      { x: 340, y: 500, label: 'Quality', onClick: () => this.cycleGraphicsQuality() },
      { x: 462, y: 500, label: 'Water', onClick: () => this.cycleGraphicsWaterDetail() },
      { x: 564, y: 500, label: 'Particles', onClick: () => this.cycleGraphicsParticleDensity() },
      { x: 686, y: 500, label: 'Env', onClick: () => this.cycleEnvironmentDetailSetting() },
      { x: 760, y: 500, label: 'Motion', onClick: () => this.toggleGraphicsReducedMotion() },
      { x: 782, y: 500, label: 'Camera', onClick: () => this.cycleCinematicCamera() },
      { x: 876, y: 500, label: 'Slow-Mo', onClick: () => this.toggleCinematicSlowMo() },
      { x: 978, y: 500, label: 'Dyn Mix', onClick: () => this.toggleDynamicMix() },
      { x: 340, y: 536, label: 'Music Vol', onClick: () => this.bumpMusicVolume() },
      { x: 462, y: 536, label: 'SFX Vol', onClick: () => this.bumpSfxVolume() },
      { x: 548, y: 536, label: 'Aura', onClick: () => this.toggleGraphicsLegendaryAura() },
      { x: 620, y: 536, label: 'FPS', onClick: () => this.toggleDevFpsHud() },
      { x: 686, y: 536, label: 'Close', onClick: () => this.setPanelVisible(this.graphicsPanel, false) }
    ]);
    this.photoFilterOverlay = this.add.rectangle(640, 360, 1280, 720, 0xffc48a, 0).setDepth(68);

    this.refreshLiveOpsState();
    this.initWeedField();
    this.updateGraphicsRuntime();
    this.ensureSceneComposition();
    this.initAudioMix();
    this.applyBobberSkin();
    this.updateCosmeticsPanel();
    this.showDevFps = import.meta.env.DEV && this.graphicsSettings.showFpsCounter;
    this.fpsHud.setVisible(this.showDevFps);
    this.updateGraphicsPanelText();
    this.bindInput();
    this.refreshHud();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audioMix.dispose();
      this.tweens.killAll();
    });
  }

  update(_time: number, deltaMs: number): void {
    const simDt = Math.min(0.05, deltaMs / 1000);
    const rawFps = simDt > 0 ? 1 / simDt : 60;
    this.visualFpsSmoothed = this.visualFpsSmoothed * 0.92 + rawFps * 0.08;
    if (this.visualFpsSmoothed < 40) this.lowFpsAccumSec += simDt;
    else this.lowFpsAccumSec = Math.max(0, this.lowFpsAccumSec - simDt * 1.6);
    const shouldAutoDisable = this.lowFpsAccumSec >= 2;
    if (shouldAutoDisable !== this.heavyEffectsAutoDisabled) {
      this.heavyEffectsAutoDisabled = shouldAutoDisable;
      this.updateGraphicsRuntime();
      if (this.heavyEffectsAutoDisabled) this.endBigMoment();
    }
    if (this.showDevFps) {
      this.fpsHud.setText(
        `FPS ${this.visualFpsSmoothed.toFixed(1)}\nEffects ${this.heavyEffectsAutoDisabled ? 'LOW*' : this.graphicsSettings.effectsQuality.toUpperCase()}\nRipples ${activeRippleCount(this.rainRipplePool) + activeRippleCount(this.splashRipplePool)} Particles ${activeParticleCount(this.underwaterParticlePool) + activeParticleCount(this.splashParticlePool)}`
      );
    }
    if (this.time.now - this.lastLiveOpsRefreshAt > 30_000) {
      this.refreshLiveOpsState();
      this.lastLiveOpsRefreshAt = this.time.now;
    }

    const slowMoState = this.slowMoController.update(deltaMs, !this.cinematicRuntime.slowMoEnabled);
    const visualDt = computeVisualDelta(simDt, slowMoState.timeScale);
    this.visualClockMs += visualDt * 1000;
    this.slowMoText.setText(slowMoState.label);
    this.slowMoText.alpha = slowMoState.labelAlpha * 0.92;

    this.audioMix.update(simDt, {
      muted: this.sound.mute,
      musicVolume: this.cinematicRuntime.musicVolume,
      sfxVolume: this.cinematicRuntime.sfxVolume,
      dynamicMix: this.cinematicRuntime.dynamicMix,
      tension: this.castSession?.reelState.tension ?? 0,
      inFight: this.phase === 'reeling'
    });

    if (this.replayPanel.visible) {
      this.replayPlayer.step(deltaMs);
      this.updateReplayPanelText();
      this.replaySliderFill.width = 600 * this.replayPlayer.getProgress();
    }

    if (this.photoMode.active) {
      this.refreshHud();
      return;
    }

    if (this.mode === 'timed_derby' && this.phase !== 'catch' && this.phase !== 'summary') {
      this.timerSec = Math.max(0, this.timerSec - simDt);
      if (this.timerSec <= 0 && this.phase !== 'idle') {
        this.resetToIdle('Derby finished.');
      }
      if (this.timerSec <= 0 && this.phase === 'idle') {
        this.onSessionEnd();
      }
    }

    if (this.phase === 'lure') {
      this.lureElapsedSec += simDt;
      this.lureMotionSpeed = Math.max(0, this.lureMotionSpeed - simDt * 0.18);
      this.lureSleeping = this.lureMotionSpeed < 0.03;
    }

    if (this.rarePulseSec > 0) {
      this.rarePulseSec = Math.max(0, this.rarePulseSec - simDt);
      this.rareVignette.alpha = clamp(this.rarePulseSec * 1.8, 0, 0.28);
    } else {
      this.rareVignette.alpha = 0;
    }

    if (this.dramaticRunSlowMoCooldownSec > 0) {
      this.dramaticRunSlowMoCooldownSec = Math.max(0, this.dramaticRunSlowMoCooldownSec - simDt);
    }
    if (this.bobberDipSec > 0) {
      this.bobberDipSec = Math.max(0, this.bobberDipSec - simDt);
    }

    if (this.bigMomentActive) {
      this.bigMomentVignette.alpha = Math.min(0.24, this.bigMomentVignette.alpha + simDt * 0.9);
      this.bigMomentBanner.setVisible(true);
      this.bigMomentHint.setVisible(true);
      this.bigMomentSparkleAcc += simDt;
      while (this.bigMomentSparkleAcc >= 0.06) {
        this.bigMomentSparkleAcc -= 0.06;
        spawnRipple(
          this.splashRipplePool,
          this.bobber.x + (this.nextVisualRand() - 0.5) * 36,
          this.bobber.y + (this.nextVisualRand() - 0.5) * 18,
          4 + this.nextVisualRand() * 6,
          48 + this.nextVisualRand() * 16,
          0.52,
          0.48
        );
      }
    }

    this.applyPhotoFilterOverlay();

    this.updateWaterVisuals(visualDt);
    updateRipples(this.rainRipplePool, visualDt);
    updateRipples(this.splashRipplePool, visualDt);
    updateParticles(this.underwaterParticlePool, visualDt);
    updateParticles(this.splashParticlePool, visualDt);

    if (this.phase === 'lure') {
      this.updateLurePhase(simDt);
    } else if (this.phase === 'hook_window') {
      this.updateHookWindow();
    } else if (this.phase === 'reeling') {
      this.updateReelPhase(simDt);
    }

    if (this.catchOverlay.visible) {
      const target = this.xpFillTarget * 420;
      const smooth = 1 - Math.exp(-visualDt * 8);
      this.xpBarFill.width += (target - this.xpBarFill.width) * smooth;
    }

    const fishCueX = this.hookedFish ? this.bobber.x + (this.hookedFish.aggression - 1) * 80 : this.bobber.x;
    const fishCueY = this.hookedFish ? this.bobber.y + (this.hookedFish.behavior === 'run_left' || this.hookedFish.behavior === 'run_right' ? -12 : 8) : this.bobber.y;
    const cameraFrame = this.cameraController.update({
      dt: simDt,
      mode: this.cinematicRuntime.cameraMode,
      reducedMotion: this.reducedMotion,
      lowPerf: this.heavyEffectsAutoDisabled,
      phase: this.phase === 'lure' ? 'cast' : this.phase === 'reeling' ? 'fight' : this.bigMomentActive ? 'reveal' : 'idle',
      bobberX: this.bobber.x,
      bobberY: this.bobber.y,
      castAimOffset: this.castAimOffset,
      castProgress: clamp(this.lureElapsedSec / 0.65, 0, 1),
      fishCueX,
      fishCueY
    });
    this.applyCameraFrame(cameraFrame.offsetX, cameraFrame.offsetY, cameraFrame.zoom);

    this.refreshHud();
  }

  private get selectedSpot(): SpotDefinition {
    return resolveSpotById(this.spots, this.selectedSpotId);
  }

  private cycleSpot() {
    const unlocked = this.spots.filter((spot) => this.progression.level >= spot.unlockLevel);
    const idx = Math.max(0, unlocked.findIndex((spot) => spot.id === this.selectedSpotId));
    this.selectedSpotId = unlocked[(idx + 1) % unlocked.length].id;
    this.sceneComposeKey = '';
    this.ensureSceneComposition();
    this.messageHud.setText(`Spot selected: ${this.selectedSpot.name}`);
  }

  private updateSpotPreview() {
    if (!this.spotPreviewGfx || !this.spotPreviewText) return;
    const composition = this.sceneComposition;
    if (!composition) return;
    this.spotPreviewGfx.clear();
    this.spotPreviewGfx.fillStyle(0x062033, 0.9);
    this.spotPreviewGfx.fillRoundedRect(646, 124, 166, 74, 10);
    this.spotPreviewGfx.lineStyle(1, 0x9ed4f5, 0.35);
    this.spotPreviewGfx.strokeRoundedRect(646, 124, 166, 74, 10);
    this.spotPreviewGfx.fillGradientStyle(composition.layers.sky.topColor, composition.layers.sky.topColor, composition.layers.sky.bottomColor, composition.layers.sky.bottomColor, 1, 1, 1, 1);
    this.spotPreviewGfx.fillRect(654, 132, 150, 28);
    this.spotPreviewGfx.fillStyle(composition.layers.treeline.color, 0.9);
    this.spotPreviewGfx.fillRect(654, 152, 150, 6);
    this.spotPreviewGfx.fillStyle(composition.layers.shoreline.color, 0.8);
    this.spotPreviewGfx.fillRect(654, 158, 150, 8);
    this.spotPreviewGfx.fillStyle(0x2f8bc0, 0.82);
    this.spotPreviewGfx.fillRect(654, 166, 150, 24);
    this.spotPreviewGfx.fillStyle(composition.spotPreview.tintColor, 0.22);
    this.spotPreviewGfx.fillRect(654, 132, 150, 58);
    this.spotPreviewText.setText(`Preview: ${this.selectedSpot.name}`);
  }

  private refreshLiveOpsState() {
    const now = new Date();
    this.currentSeason = getSeasonForDate(now, this.seasonCatalog);
    const weekKey = isoWeekKey(now);
    this.currentWeeklyEvent = pickWeeklyEvent(weekKey, this.weeklyEvents, 0);
    const eligibles = eligibleLegendaries(this.legendaryRules, this.currentSeason.id, this.weeklyEventEnabled ? this.currentWeeklyEvent.id : null);
    this.sightingHint = deterministicSighting(weekKey, 0, eligibles);
    if (this.mode === 'ice_fishing' && !isIceFishingAvailable(this.currentSeason.id, this.sandboxAllowIceFishing)) {
      this.setMode('free_fish');
    }
  }

  private currentDerbyDurationSec(): number {
    if (!this.weeklyEventEnabled) return 300;
    return this.currentWeeklyEvent.scoring?.durationSecOverride ?? 300;
  }

  private cycleLoadout(slot: 'rodId' | 'reelId' | 'lineId' | 'lureId') {
    const list =
      slot === 'rodId'
        ? this.progression.inventory.rods
        : slot === 'reelId'
          ? this.progression.inventory.reels
          : slot === 'lineId'
            ? this.progression.inventory.lines
            : this.progression.inventory.lures;
    if (list.length === 0) return;

    const currentId = this.progression.loadout[slot];
    const idx = Math.max(0, list.indexOf(currentId));
    const next = list[(idx + 1) % list.length];

    this.progression = equipLoadoutItem(this.progression, slot, next);
    saveProgression(this.progression);
    this.updateLoadoutPanel();
  }

  private applyCameraFrame(offsetX: number, offsetY: number, zoom: number) {
    if (!this.worldLayer) return;
    this.worldLayer.setScale(zoom);
    this.worldLayer.setPosition(640 - 640 * zoom - offsetX, 360 - 360 * zoom - offsetY);
  }

  private initAudioMix() {
    const manager = this.sound as Phaser.Sound.WebAudioSoundManager | Phaser.Sound.NoAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager;
    if (!('context' in manager)) {
      this.audioMix.init(null);
      return;
    }
    this.audioMix.init(manager.context);
  }

  private setPanelVisible(panel: Phaser.GameObjects.Container, visible: boolean) {
    if (!visible) {
      if (this.uiMotion.panelTransitionMs <= 0) {
        panel.setVisible(false);
        panel.alpha = 1;
        panel.scale = 1;
        return;
      }
      this.tweens.killTweensOf(panel);
      this.tweens.add({
        targets: panel,
        alpha: 0,
        scale: 0.985,
        duration: this.uiMotion.panelTransitionMs,
        onComplete: () => {
          panel.setVisible(false);
          panel.alpha = 1;
          panel.scale = 1;
        }
      });
      return;
    }
    panel.setVisible(true);
    if (this.uiMotion.panelTransitionMs <= 0) {
      panel.alpha = 1;
      panel.scale = 1;
      return;
    }
    panel.alpha = 0;
    panel.scale = 0.985;
    this.tweens.killTweensOf(panel);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      scale: 1,
      duration: this.uiMotion.panelTransitionMs
    });
  }

  private makePanel(bodyText: Phaser.GameObjects.Text, buttons: Array<{ x: number; y: number; label: string; onClick: () => void }>): Phaser.GameObjects.Container {
    const panel = this.add.rectangle(640, 360, 760, 360, 0x0a2231, 0.78).setStrokeStyle(2, 0x9dd8ff, 0.52);
    const panelGlass = this.add.rectangle(640, 274, 734, 84, 0x89d6ff, 0.06).setStrokeStyle(1, 0xd5f2ff, 0.2);
    const children: Phaser.GameObjects.GameObject[] = [panel, panelGlass, bodyText];
    for (let i = 0; i < buttons.length; i += 1) {
      const btn = this.add
        .text(buttons[i].x, buttons[i].y, buttons[i].label, { fontFamily: 'Verdana', fontSize: '16px', color: '#e5f5ff', backgroundColor: '#0d3650d0' })
        .setPadding(8, 4, 8, 4)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => buttons[i].onClick());
      this.bindButtonMicroInteraction(btn);
      children.push(btn);
    }
    return this.add.container(0, 0, children).setDepth(90).setVisible(false);
  }

  private toggleLoadoutPanel() {
    const next = !this.loadoutPanel.visible;
    this.setPanelVisible(this.loadoutPanel, next);
    if (next) {
      this.setPanelVisible(this.trophyPanel, false);
      this.setPanelVisible(this.summaryPanel, false);
      this.setPanelVisible(this.cosmeticsPanel, false);
      this.updateLoadoutPanel();
    }
  }

  private updateLoadoutPanel() {
    const rod = this.gear.rods.find((item) => item.id === this.progression.loadout.rodId) ?? this.gear.rods[0];
    const reel = this.gear.reels.find((item) => item.id === this.progression.loadout.reelId) ?? this.gear.reels[0];
    const line = this.gear.lines.find((item) => item.id === this.progression.loadout.lineId) ?? this.gear.lines[0];
    const lure = this.lureCatalog.find((item) => item.id === this.progression.loadout.lureId) ?? this.lureCatalog[0];
    const mods = computeLoadoutModifiers(rod, reel, line);

    const nextUnlock = Math.min(this.progression.level + 1, 12);

    this.loadoutText.setText(
      [
        'Loadout (XP Unlock Shop)',
        `Rod: ${rod.name}`,
        `Reel: ${reel.name}`,
        `Line: ${line.name}`,
        `Lure: ${lure.name}`,
        '',
        'Preview',
        `Tension control: ${(rod.tensionControl * reel.dragStability).toFixed(2)}`,
        `Drag stability: ${reel.dragStability.toFixed(2)}`,
        `Hook forgiveness: ${mods.hookForgiveness.toFixed(2)}`,
        `Snap threshold: ${mods.snapThresholdMultiplier.toFixed(2)}`,
        '',
        `Bobber skin: ${this.progression.cosmetics.bobberSkinId}`,
        `Lure skin: ${this.progression.cosmetics.lureSkinByLureId[this.progression.loadout.lureId] ?? this.cosmeticsCatalog.lureSkins[0].id}`,
        '',
        `Shop model: XP-only unlocks by level (no currency).`,
        `Current Level ${this.progression.level}. Next unlock checkpoint at Level ${nextUnlock}.`
      ].join('\n')
    );
  }

  private toggleCosmeticsPanel() {
    const next = !this.cosmeticsPanel.visible;
    this.setPanelVisible(this.cosmeticsPanel, next);
    if (next) {
      this.setPanelVisible(this.loadoutPanel, false);
      this.setPanelVisible(this.trophyPanel, false);
      this.setPanelVisible(this.summaryPanel, false);
      this.updateCosmeticsPanel();
    }
  }

  private cycleBobberSkin() {
    const skins = this.cosmeticsCatalog.bobberSkins.filter((entry) => this.isCosmeticUnlocked(entry.unlock));
    if (skins.length === 0) return;
    const currentId = this.progression.cosmetics.bobberSkinId;
    const idx = Math.max(0, skins.findIndex((entry) => entry.id === currentId));
    const next = skins[(idx + 1) % skins.length];
    this.progression = equipBobberSkin(this.progression, next.id);
    saveProgression(this.progression);
    this.updateCosmeticsPanel();
    this.applyBobberSkin();
  }

  private cycleCurrentLureSkin() {
    const lureId = this.progression.loadout.lureId;
    const skins = this.cosmeticsCatalog.lureSkins.filter((entry) => this.isCosmeticUnlocked(entry.unlock));
    if (skins.length === 0) return;
    const currentId = this.progression.cosmetics.lureSkinByLureId[lureId] ?? skins[0].id;
    const idx = Math.max(0, skins.findIndex((entry) => entry.id === currentId));
    const next = skins[(idx + 1) % skins.length];
    this.progression = equipLureSkin(this.progression, lureId, next.id);
    saveProgression(this.progression);
    this.updateCosmeticsPanel();
  }

  private updateCosmeticsPanel() {
    const lureId = this.progression.loadout.lureId;
    const bobber = this.cosmeticsCatalog.bobberSkins.find((entry) => entry.id === this.progression.cosmetics.bobberSkinId) ?? this.cosmeticsCatalog.bobberSkins[0];
    const lureSkinId = this.progression.cosmetics.lureSkinByLureId[lureId] ?? this.cosmeticsCatalog.lureSkins[0].id;
    const lure = this.cosmeticsCatalog.lureSkins.find((entry) => entry.id === lureSkinId) ?? this.cosmeticsCatalog.lureSkins[0];

    this.cosmeticsText.setText(
      [
        'Cosmetics (visual-only)',
        `Bobber Skin: ${bobber.name}`,
        `Lure Skin for ${lureId}: ${lure.name}`,
        `Unlocked Bobbers: ${this.cosmeticsCatalog.bobberSkins.filter((entry) => this.isCosmeticUnlocked(entry.unlock)).length}/${this.cosmeticsCatalog.bobberSkins.length}`,
        `Unlocked Lure Skins: ${this.cosmeticsCatalog.lureSkins.filter((entry) => this.isCosmeticUnlocked(entry.unlock)).length}/${this.cosmeticsCatalog.lureSkins.length}`,
        '',
        'Unlock paths',
        '- Level milestones',
        '- Challenge completions',
        '- Season reward cosmetics',
        '',
        'Party fairness: cosmetics are always allowed and do not modify lure stats.'
      ].join('\n')
    );

    this.cosmeticsPreviewBobber.setFillStyle(Number.parseInt(bobber.primaryColor.slice(1), 16), 1).setStrokeStyle(2, Number.parseInt(bobber.ringColor.slice(1), 16), 1);
    this.cosmeticsPreviewLure.setFillStyle(Number.parseInt(lure.palette[0].slice(1), 16), 1).setStrokeStyle(1, Number.parseInt(lure.palette[1].slice(1), 16), 0.9);
  }

  private applyBobberSkin() {
    const skin = this.cosmeticsCatalog.bobberSkins.find((entry) => entry.id === this.progression.cosmetics.bobberSkinId) ?? this.cosmeticsCatalog.bobberSkins[0];
    const primary = Number.parseInt(skin.primaryColor.slice(1), 16);
    const secondary = Number.parseInt(skin.secondaryColor.slice(1), 16);
    const ring = Number.parseInt(skin.ringColor.slice(1), 16);
    this.bobber.setFillStyle(primary, 1).setStrokeStyle(2, ring, 1);
    this.bobberCap.setFillStyle(secondary, 0.96).setStrokeStyle(1, ring, 0.75);
  }

  private isCosmeticUnlocked(unlock: { type: 'level' | 'challenge' | 'season_reward'; value: number | string }): boolean {
    if (unlock.type === 'level') return this.progression.level >= Number(unlock.value);
    if (unlock.type === 'challenge') {
      const target = String(unlock.value);
      return this.progression.daily.challenges.some((entry) => entry.completed && (entry.challengeId === target || entry.kind === target));
    }
    const reward = String(unlock.value);
    return this.progression.seasons.some((entry) => entry.earnedRewards.includes(reward));
  }

  private toggleTrophyPanel() {
    const next = !this.trophyPanel.visible;
    this.setPanelVisible(this.trophyPanel, next);
    if (next) {
      this.setPanelVisible(this.loadoutPanel, false);
      this.setPanelVisible(this.summaryPanel, false);
      this.setPanelVisible(this.cosmeticsPanel, false);
      this.updateTrophyPanel();
    }
  }

  private updateTrophyPanel() {
    const lines: string[] = ['Trophy Book'];
    const legendaryWall: string[] = [];

    for (let i = 0; i < this.fishCatalog.length; i += 1) {
      const fish = this.fishCatalog[i];
      const trophy = this.progression.trophies[fish.id];
      const silhouette = trophy ? fish.name : '????';
      const best = trophy ? fmtLb(trophy.bestWeightLb) : '--';
      const count = trophy?.countCaught ?? 0;
      const where = trophy ? trophy.caughtSpots.join(', ') : '--';
      const when = trophy ? trophy.caughtTimes.join(', ') : '--';
      lines.push(`${silhouette} | ${fish.rarityTier} | Best ${best} | Count ${count} | ${where} | ${when}`);
      if (fish.rarityTier === 'Legendary' && trophy) {
        legendaryWall.push(`${fish.name} ${fmtLb(trophy.bestWeightLb)}`);
      }
    }

    lines.push('');
    lines.push(`Legendary Wall: ${legendaryWall.length > 0 ? legendaryWall.join(' • ') : 'No legendary catches yet'}`);

    this.trophyPanelText.setText(lines.join('\n'));
  }

  private toggleSummaryPanel(kind: 'challenge' | 'session' | 'highlight' | 'season' | 'event' | 'ice' | 'standings') {
    const next = !this.summaryPanel.visible;
    this.setPanelVisible(this.summaryPanel, next);
    if (!next) return;

    this.setPanelVisible(this.loadoutPanel, false);
    this.setPanelVisible(this.trophyPanel, false);
    this.setPanelVisible(this.cosmeticsPanel, false);

    if (kind === 'challenge') {
      const lines: string[] = ['Daily Challenges'];
      for (let i = 0; i < this.progression.daily.challenges.length; i += 1) {
        const c = this.progression.daily.challenges[i];
        lines.push(`[${c.completed ? 'x' : ' '}] ${c.description} (${c.progress.toFixed(1)}/${c.target}) +${c.xpReward} XP`);
      }
      lines.push('');
      lines.push(`Weekly Tournament (${this.progression.weeklyTournament.weekKey}) best derby: ${fmtLb(this.progression.weeklyTournament.bestDerbyWeightLb)}`);
      this.summaryText.setText(lines.join('\n'));
      return;
    }

    if (kind === 'highlight') {
      const lines: string[] = ['Highlights'];
      for (let i = Math.max(0, this.progression.highlights.length - 12); i < this.progression.highlights.length; i += 1) {
        const h = this.progression.highlights[i];
        lines.push(`${h.title}: ${h.fishName} ${fmtLb(h.weightLb)} (${h.rarityTier}) v=${h.value.toFixed(2)}`);
      }
      if (lines.length === 1) lines.push('No highlights yet.');
      this.summaryText.setText(lines.join('\n'));
      return;
    }

    if (kind === 'season') {
      const nextSeasonMonth = this.currentSeason.id === 'winter' ? 'March' : this.currentSeason.id === 'spring' ? 'June' : this.currentSeason.id === 'summer' ? 'September' : 'December';
      this.summaryText.setText(
        [
          `Season: ${this.currentSeason.name}`,
          `Theme tint: ${this.currentSeason.visualTheme.tint}`,
          `Theme particles: ${this.currentSeason.visualTheme.particle}`,
          '',
          'Fish boosts',
          ...Object.entries(this.currentSeason.fishBoosts).slice(0, 8).map(([id, v]) => `${id} x${v.toFixed(2)}`),
          '',
          `Approx next season starts in ${nextSeasonMonth} (UTC month roll).`
        ].join('\n')
      );
      return;
    }

    if (kind === 'event') {
      const event = this.currentWeeklyEvent;
      const eligibles = eligibleLegendaries(this.legendaryRules, this.currentSeason.id, this.weeklyEventEnabled ? event.id : null);
      this.summaryText.setText(
        [
          `Weekly Event: ${this.weeklyEventEnabled ? event.name : 'Disabled'}`,
          this.weeklyEventEnabled ? event.description : 'Host/Event toggle disabled.',
          '',
          `Bite multiplier: x${event.biteRateMultiplier.toFixed(2)}`,
          `Rarity odds multiplier: x${event.rarityOddsMultiplier.toFixed(2)}`,
          '',
          `Eligible legendaries: ${eligibles.map((e) => e.name).join(', ') || 'None'}`,
          this.sightingHint ? `Sighting: ${this.sightingHint.text}` : 'Sighting: none this week'
        ].join('\n')
      );
      return;
    }

    if (kind === 'ice') {
      this.summaryText.setText(
        [
          'Ice Fishing',
          `Available now: ${isIceFishingAvailable(this.currentSeason.id, this.sandboxAllowIceFishing) ? 'Yes' : 'No'}`,
          `Season requirement: Winter`,
          `Sandbox override: ${this.sandboxAllowIceFishing ? 'On' : 'Off'}`,
          '',
          'Controls',
          '- Build hole via repeated Cast presses.',
          '- Reel taps create jig rhythm.',
          '- Better rhythm improves bite weighting.',
          '',
          'Party uses deterministic seed/event config; no fairness changes from cosmetics.'
        ].join('\n')
      );
      return;
    }

    if (kind === 'standings') {
      const season = this.progression.seasons.find((entry) => entry.seasonId === this.currentSeason.id);
      const rewards = season?.earnedRewards ?? [];
      const records = season?.weeklyRecords ?? [];
      const lines = [
        `Season Standings: ${this.currentSeason.name}`,
        `Weeks tracked: ${records.length}`,
        `Cosmetic rewards: ${rewards.join(', ') || 'None'}`,
        '',
        'Recent weekly records'
      ];
      for (let i = Math.max(0, records.length - 8); i < records.length; i += 1) {
        lines.push(`${records[i].weekKey}: Derby ${fmtLb(records[i].bestDerbyWeightLb)} | Big ${fmtLb(records[i].bestBigCatchLb)} | Rares ${records[i].raresCaught}`);
      }
      this.summaryText.setText(lines.join('\n'));
      return;
    }

    this.summaryText.setText(this.buildSessionSummaryText());
  }

  private toggleLakeStatsPanel() {
    const next = !this.lakeStatsPanel.visible;
    this.setPanelVisible(this.lakeStatsPanel, next);
    if (!next) return;
    this.setPanelVisible(this.loadoutPanel, false);
    this.setPanelVisible(this.trophyPanel, false);
    this.setPanelVisible(this.summaryPanel, false);
    this.setPanelVisible(this.replayPanel, false);
    this.setPanelVisible(this.cosmeticsPanel, false);
    const stats = this.progression.lakeStats;
    const avgLines = Object.entries(stats.averageWeightBySpecies)
      .slice(0, 8)
      .map(([fishId, avg]) => `${fishId}: ${avg.toFixed(2)} lb`);
    this.lakeStatsText.setText(
      [
        'Lake Stats',
        `Total fish caught: ${stats.totalFishCaught}`,
        `Most caught species: ${stats.mostCaughtSpecies}`,
        `Legendary count: ${stats.legendaryCount}`,
        `Longest fight: ${(stats.longestFightDurationMs / 1000).toFixed(2)} s`,
        `Highest tension survived: ${stats.highestTensionSurvived.toFixed(2)}`,
        `Best derby finish: ${stats.bestDerbyFinish === 999 ? '-' : stats.bestDerbyFinish}`,
        '',
        'Average weight by species',
        ...avgLines
      ].join('\\n')
    );
  }

  private openLatestReplay() {
    if (this.progression.replays.length === 0) {
      this.messageHud.setText('No replay available yet.');
      return;
    }
    const replay = this.progression.replays[this.progression.replays.length - 1];
    this.activeReplayId = replay.id;
    this.replayPlayer.load(replay);
    this.setPanelVisible(this.replayPanel, true);
    this.setPanelVisible(this.loadoutPanel, false);
    this.setPanelVisible(this.trophyPanel, false);
    this.setPanelVisible(this.summaryPanel, false);
    this.setPanelVisible(this.cosmeticsPanel, false);
    this.updateReplayPanelText();
  }

  private updateReplayPanelText() {
    if (!this.activeReplayId) return;
    const replay = this.progression.replays.find((item) => item.id === this.activeReplayId);
    if (!replay) return;
    const frame = this.replayPlayer.getCurrent();
    this.replayText.setText(
      [
        `Replay: ${replay.fishName} (${replay.rarityTier})`,
        `Weight: ${fmtLb(replay.weightLb)} | Hook: ${replay.hookQuality} | Speed: ${this.replayPlayer.getSpeed()}x`,
        `Tension: ${frame.tension.toFixed(2)} | Fish stamina: ${frame.fishStamina.toFixed(2)}`,
        `Progress: ${(this.replayPlayer.getProgress() * 100).toFixed(0)}%`,
        `Seed: ${replay.seed} | Samples: ${replay.samples.length} | Events: ${replay.eventLog.length}`
      ].join('\\n')
    );
  }

  private togglePhotoMode() {
    this.photoMode = {
      ...this.photoMode,
      active: !this.photoMode.active
    };
    if (!this.photoMode.active) {
      this.cameras.main.setZoom(1);
      this.cameras.main.setScroll(0, 0);
      this.topHud.setVisible(true);
      this.topSubHud.setVisible(true);
      this.sideHud.setVisible(true);
      this.messageHud.setVisible(true);
      this.spotPreviewGfx.setVisible(true);
      this.spotPreviewText.setVisible(true);
      return;
    }
    this.applyPhotoCamera();
  }

  private applyPhotoCamera() {
    this.cameras.main.setZoom(this.photoMode.zoom);
    this.cameras.main.setScroll(this.photoMode.panX, this.photoMode.panY);
    this.topHud.setVisible(this.photoMode.uiVisible);
    this.topSubHud.setVisible(this.photoMode.uiVisible);
    this.sideHud.setVisible(this.photoMode.uiVisible);
    this.messageHud.setVisible(this.photoMode.uiVisible);
    this.spotPreviewGfx.setVisible(this.photoMode.uiVisible);
    this.spotPreviewText.setVisible(this.photoMode.uiVisible);
  }

  private applyPhotoFilterOverlay() {
    if (!this.photoMode.active || this.photoMode.filter === 'none') {
      this.photoFilterOverlay.alpha = 0;
      return;
    }
    if (this.photoMode.filter === 'warm_sunset') {
      this.photoFilterOverlay.fillColor = 0xffb56b;
      this.photoFilterOverlay.alpha = 0.12;
      return;
    }
    if (this.photoMode.filter === 'cool_morning') {
      this.photoFilterOverlay.fillColor = 0x8bbcff;
      this.photoFilterOverlay.alpha = 0.1;
      return;
    }
    if (this.photoMode.filter === 'high_contrast') {
      this.photoFilterOverlay.fillColor = 0xffffff;
      this.photoFilterOverlay.alpha = 0.06;
      return;
    }
    this.photoFilterOverlay.fillColor = 0x222222;
    this.photoFilterOverlay.alpha = 0.18;
  }

  private async shareLatestCatchCard() {
    const latest = this.sessionCatches[this.sessionCatches.length - 1];
    if (!latest) {
      this.messageHud.setText('No catch card available yet.');
      return;
    }
    const fishVisual = this.fishRender.getVisualForSpecies(latest.fishId);
    const lureSkinId = this.progression.cosmetics.lureSkinByLureId[this.progression.loadout.lureId] ?? this.cosmeticsCatalog.lureSkins[0].id;
    const result = await renderCatchCardPng({
      fishId: latest.fishId,
      fishName: latest.fishName,
      fishArtGlyph: `><(((('>`,
      speciesRenderKey: fishVisual.spriteKeys.idle.replace('-idle', '-hero'),
      weightLb: latest.weightLb,
      rarityTier: latest.rarityTier,
      spotName: this.selectedSpot.name,
      weather: latest.weather,
      timeOfDay: latest.timeOfDay,
      level: this.progression.level,
      dateLabel: new Date(latest.timestamp).toISOString().slice(0, 10),
      bobberSkinId: this.progression.cosmetics.bobberSkinId,
      lureSkinId
    });
    triggerBlobDownload(result.blob, `ozark-catch-card-${latest.fishId}.png`);
  }

  private async exportPhotoModeSnapshot() {
    const latest = this.sessionCatches[this.sessionCatches.length - 1];
    const blob = await exportPhotoModePng({
      width: 1200,
      height: 1200,
      filter: this.photoMode.filter,
      backgroundPack: this.sceneComposition?.photoPackId ?? 'env-default',
      uiHidden: true,
      title: 'Ozark Fishing Photo',
      overlayInfo: latest
        ? {
            species: latest.fishName,
            weightLabel: fmtLb(latest.weightLb),
            rarity: latest.rarityTier,
            spot: this.selectedSpot.name,
            weather: latest.weather,
            dateLabel: new Date(latest.timestamp).toISOString().slice(0, 10)
          }
        : undefined
    });
    triggerBlobDownload(blob, `ozark-photo-${Date.now()}.png`);
  }

  private buildSessionSummaryText(): string {
    const byRarity = {
      Common: 0,
      Uncommon: 0,
      Rare: 0,
      Legendary: 0
    };

    for (let i = 0; i < this.sessionCatches.length; i += 1) {
      byRarity[this.sessionCatches[i].rarityTier] += 1;
    }

    const top3 = [...this.sessionCatches]
      .sort((a, b) => b.weightLb - a.weightLb)
      .slice(0, 3)
      .map((item, idx) => `${idx + 1}. ${item.fishName} ${fmtLb(item.weightLb)} (${item.rarityTier})`)
      .join('\n');

    const challengeLines = this.progression.daily.challenges
      .map((c: DailyChallenge, idx) => `${idx + 1}. ${c.progress.toFixed(1)}/${c.target} ${c.completed ? 'Complete' : 'In Progress'} - ${c.name}`)
      .join('\n');

    return [
      'Session Summary',
      `Spot: ${this.selectedSpot.name}`,
      `Total catch score: ${fmtLb(this.totalWeightCaught)}`,
      `Biggest fish: ${fmtLb(this.biggestCatch)}`,
      `Catches by rarity: C:${byRarity.Common} U:${byRarity.Uncommon} R:${byRarity.Rare} L:${byRarity.Legendary}`,
      '',
      'Top 3 Biggest',
      top3 || 'No catches',
      '',
      'Daily Challenge Progress',
      challengeLines || 'No active challenges'
    ].join('\n');
  }

  private onSessionEnd() {
    if (this.phase === 'summary') return;
    this.phase = 'summary';

    this.progression = applyDerbyTournamentResult(this.progression, this.totalWeightCaught);
    const raresCaught = this.sessionCatches.filter((entry) => entry.rarityTier === 'Rare' || entry.rarityTier === 'Legendary').length;
    this.progression = applySeasonSessionRecord(this.progression, {
      seasonId: this.currentSeason.id,
      weekKey: isoWeekKey(new Date()),
      mode: this.mode,
      bestDerbyWeightLb: this.mode === 'timed_derby' ? this.totalWeightCaught : 0,
      bestBigCatchLb: this.biggestCatch,
      raresCaught
    });
    const sessionReplays = this.progression.replays.filter((replay) => this.sessionReplayIds.includes(replay.id));
    const highlights = detectSessionHighlights(
      this.sessionCatches.map((catchRecord) => ({
        fishId: catchRecord.fishId,
        fishName: catchRecord.fishName,
        weightLb: catchRecord.weightLb,
        rarityTier: catchRecord.rarityTier
      })),
      sessionReplays
    );
    this.progression = applySessionHighlights(this.progression, highlights);
    if (this.mode === 'timed_derby' && this.totalWeightCaught > 0) {
      this.progression = {
        ...this.progression,
        lakeStats: {
          ...this.progression.lakeStats,
          bestDerbyFinish: Math.min(this.progression.lakeStats.bestDerbyFinish, 1)
        }
      };
    }
    saveProgression(this.progression);

    this.setPanelVisible(this.summaryPanel, true);
    this.summaryText.setText(this.buildSessionSummaryText());
    this.messageHud.setText('Session complete. Review your summary and challenges.');

    this.hooks.reportEvent({ type: 'game_end', gameId: this.hooks.gameId, score: Math.round(this.totalWeightCaught * 100) });
  }

  private initRainDrops(): void {
    this.rainDrops.length = 0;
    const composition = this.sceneComposition;
    const count = composition?.layers.ambient.quality === 'high' ? 52 : composition?.layers.ambient.quality === 'medium' ? 44 : 30;
    for (let i = 0; i < count; i += 1) {
      const rand = this.nextVisualRand();
      const rand2 = this.nextVisualRand();
      const rand3 = this.nextVisualRand();
      const rand4 = this.nextVisualRand();
      this.rainDrops.push({
        x: rand * this.scale.width,
        y: rand2 * this.scale.height,
        speed: 180 + rand3 * 160,
        len: 6 + rand4 * 8
      });
    }
  }

  private initWeedField(): void {
    this.weedStems.length = 0;
    for (let i = 0; i < 34; i += 1) {
      this.weedStems.push({
        x: 220 + i * 22,
        y: 590 + (i % 3) * 8,
        height: 32 + (i % 5) * 6,
        swayPhase: i * 0.32,
        swayAmp: 4 + (i % 4)
      });
    }
  }

  private toggleGraphicsPanel() {
    const next = !this.graphicsPanel.visible;
    this.setPanelVisible(this.graphicsPanel, next);
    if (!next) return;
    this.setPanelVisible(this.loadoutPanel, false);
    this.setPanelVisible(this.trophyPanel, false);
    this.setPanelVisible(this.summaryPanel, false);
    this.setPanelVisible(this.replayPanel, false);
    this.setPanelVisible(this.lakeStatsPanel, false);
    this.setPanelVisible(this.cosmeticsPanel, false);
    this.updateGraphicsPanelText();
  }

  private updateGraphicsPanelText() {
    this.graphicsPanelText.setText(
      [
        'Graphics + Cinematic Settings',
        `Effects Quality: ${this.graphicsSettings.effectsQuality}`,
        `Environment Detail: ${this.graphicsSettings.environmentDetail}`,
        `Water Detail: ${this.graphicsSettings.waterDetail}`,
        `Particle Density: ${this.graphicsSettings.particleDensity}`,
        `Reduced Motion: ${this.reducedMotion ? 'On' : 'Off'}`,
        `Cinematic Camera: ${this.cinematicRuntime.cameraMode}`,
        `Cinematic Slow-Mo: ${this.cinematicRuntime.slowMoEnabled ? 'On' : 'Off'}`,
        `Dynamic Mix: ${this.cinematicRuntime.dynamicMix ? 'On' : 'Off'}`,
        `Music Volume: ${(this.cinematicRuntime.musicVolume * 100).toFixed(0)}%`,
        `SFX Volume: ${(this.cinematicRuntime.sfxVolume * 100).toFixed(0)}%`,
        `Legendary Aura: ${this.graphicsSettings.legendaryAura ? 'On' : 'Off'}`,
        `FPS HUD (dev): ${this.graphicsSettings.showFpsCounter ? 'On' : 'Off'}`,
        '',
        `Adaptive mode: ${this.heavyEffectsAutoDisabled ? 'Performance fallback active (<40 FPS)' : 'Normal'}`,
        `UI transitions: ${this.uiMotion.panelTransitionMs > 0 ? `${this.uiMotion.panelTransitionMs}ms` : 'disabled'}`,
        `Runtime waves: ${this.graphicsRuntime.waveLayers}`,
        `Runtime particles target: ${this.graphicsRuntime.particleCount}`,
        `Scene objects: ${this.sceneComposition?.objectCount ?? 0}/${this.sceneComposition?.objectLimit ?? 220}`,
        `Quality map: low=static sky/min props/no particles | medium=clouds+props/light particles | high=all layers`,
        '',
        'Settings are visual-only and do not change gameplay balance.'
      ].join('\n')
    );
  }

  private cycleGraphicsQuality() {
    this.graphicsSettings.effectsQuality = cycleEffectsQuality(this.graphicsSettings.effectsQuality);
    this.persistGraphicsSettings();
  }

  private cycleGraphicsWaterDetail() {
    this.graphicsSettings.waterDetail = cycleWaterDetail(this.graphicsSettings.waterDetail);
    this.persistGraphicsSettings();
  }

  private cycleGraphicsParticleDensity() {
    this.graphicsSettings.particleDensity = cycleParticleDensity(this.graphicsSettings.particleDensity);
    this.persistGraphicsSettings();
  }

  private cycleEnvironmentDetailSetting() {
    this.graphicsSettings.environmentDetail = cycleEnvironmentDetail(this.graphicsSettings.environmentDetail);
    this.persistGraphicsSettings();
  }

  private toggleGraphicsReducedMotion() {
    this.graphicsSettings.reducedMotion = !this.graphicsSettings.reducedMotion;
    this.reducedMotion = prefersReducedMotion() || this.graphicsSettings.reducedMotion || persistence.loadSettings().reducedMotion;
    this.persistGraphicsSettings();
  }

  private toggleGraphicsLegendaryAura() {
    this.graphicsSettings.legendaryAura = !this.graphicsSettings.legendaryAura;
    this.persistGraphicsSettings();
  }

  private toggleDevFpsHud() {
    if (!import.meta.env.DEV) return;
    this.graphicsSettings.showFpsCounter = !this.graphicsSettings.showFpsCounter;
    this.showDevFps = this.graphicsSettings.showFpsCounter;
    this.fpsHud.setVisible(this.showDevFps);
    this.persistGraphicsSettings();
  }

  private cycleCinematicCamera() {
    this.cinematicSettings.cameraMode = cycleCinematicCameraMode(this.cinematicSettings.cameraMode);
    this.persistCinematicSettings();
  }

  private toggleCinematicSlowMo() {
    this.cinematicSettings.cinematicSlowMo = !this.cinematicSettings.cinematicSlowMo;
    this.persistCinematicSettings();
  }

  private toggleDynamicMix() {
    this.cinematicSettings.dynamicMix = !this.cinematicSettings.dynamicMix;
    this.persistCinematicSettings();
  }

  private bumpMusicVolume() {
    this.cinematicSettings.musicVolume = this.cinematicSettings.musicVolume >= 1 ? 0 : Math.min(1, this.cinematicSettings.musicVolume + 0.1);
    this.persistCinematicSettings();
  }

  private bumpSfxVolume() {
    this.cinematicSettings.sfxVolume = this.cinematicSettings.sfxVolume >= 1 ? 0 : Math.min(1, this.cinematicSettings.sfxVolume + 0.1);
    this.persistCinematicSettings();
  }

  private bindInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.bigMomentActive) {
        this.endBigMoment();
      }
      beginSwipe(this.swipe, pointer.x, pointer.y, this.time.now);
      if (this.phase === 'hook_window') this.tryHookSet();
      if (this.mode === 'ice_fishing' && this.phase === 'lure') {
        this.jigTapTimes.push(Math.floor(this.time.now));
        if (this.jigTapTimes.length > 8) this.jigTapTimes.shift();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      moveSwipe(this.swipe, pointer.x, pointer.y, this.time.now);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const swipe = finishSwipe(this.swipe, pointer.x, pointer.y, this.time.now);
      if (!swipe || this.phase !== 'idle') return;
      if (swipe.distance < 32 || swipe.dy > -26) return;
      this.performCast(swipe.dx, swipe.dy);
    });

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (import.meta.env.DEV && event.key === 'F8') {
        this.toggleDevFpsHud();
        return;
      }
      if (!this.photoMode.active && event.key.toLowerCase() === 'g') {
        this.toggleGraphicsPanel();
        return;
      }
      if (!this.photoMode.active) return;
      if (event.key === '=') this.photoMode = adjustPhotoCamera(this.photoMode, 0.04, 0, 0);
      if (event.key === '-') this.photoMode = adjustPhotoCamera(this.photoMode, -0.04, 0, 0);
      if (event.key === 'ArrowLeft') this.photoMode = adjustPhotoCamera(this.photoMode, 0, -8, 0);
      if (event.key === 'ArrowRight') this.photoMode = adjustPhotoCamera(this.photoMode, 0, 8, 0);
      if (event.key === 'ArrowUp') this.photoMode = adjustPhotoCamera(this.photoMode, 0, 0, -8);
      if (event.key === 'ArrowDown') this.photoMode = adjustPhotoCamera(this.photoMode, 0, 0, 8);
      if (event.key.toLowerCase() === 'f') this.photoMode = { ...this.photoMode, filter: cyclePhotoFilter(this.photoMode.filter) };
      if (event.key.toLowerCase() === 'u') this.photoMode = { ...this.photoMode, uiVisible: !this.photoMode.uiVisible };
      if (event.key.toLowerCase() === 'i') this.photoMode = { ...this.photoMode, infoOverlayVisible: !this.photoMode.infoOverlayVisible };
      if (event.key.toLowerCase() === 'e') void this.exportPhotoModeSnapshot();
      if (event.key === 'Escape') this.photoMode = { ...this.photoMode, active: false };
      this.applyPhotoCamera();
      this.applyPhotoFilterOverlay();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      this.input.keyboard?.removeAllListeners();
    });
  }

  private performCast(dx: number, dy: number): void {
    if (this.mode === 'ice_fishing') {
      if (!isIceFishingAvailable(this.currentSeason.id, this.sandboxAllowIceFishing)) {
        this.messageHud.setText('Ice Fishing is available in Winter unless Sandbox override is enabled.');
        return;
      }
      if (this.iceHoleProgress < 1) {
        this.iceHoleProgress = clamp(this.iceHoleProgress + 0.34, 0, 1);
        for (let i = 0; i < 5; i += 1) {
          spawnParticle(
            this.splashParticlePool,
            640 + (this.nextVisualRand() - 0.5) * 18,
            430 + (this.nextVisualRand() - 0.5) * 8,
            (this.nextVisualRand() - 0.5) * 30,
            -18 - this.nextVisualRand() * 30,
            1.2 + this.nextVisualRand() * 1.1,
            0.75,
            0.55 + this.nextVisualRand() * 0.2
          );
        }
        this.messageHud.setText(`Drilling hole ${(this.iceHoleProgress * 100).toFixed(0)}%`);
        if (this.iceHoleProgress < 1) return;
      }
      dx = 0;
      dy = -260;
    }

    const cast = computeCastFromSwipe(dx, dy, this.castAssistEnabled);
    if (cast.power < 0.08) {
      this.messageHud.setText('Swipe up harder to cast.');
      return;
    }

    this.castDistanceNorm = cast.distanceNorm;
    this.castAimOffset = cast.aimOffset;
    this.currentZone = resolveLakeZone(this.castDistanceNorm, this.environment);
    this.lureElapsedSec = 0;
    this.lureMotionSpeed = cast.power;
    this.lureSleeping = false;
    this.aiStepAcc = 0;
    this.biteFish = null;
    this.phase = 'lure';

    const seed = (Math.floor(this.time.now) ^ Math.floor(this.castDistanceNorm * 100000)) >>> 0;
    this.castRng = seedToRng(seed);
    this.castSession = createCastSession(seed, 140);
    this.castSession.eventLog.push({
      tMs: Math.floor(this.time.now),
      type: 'cast',
      payload: { distanceNorm: this.castDistanceNorm, aimOffset: this.castAimOffset, zone: this.currentZone, spot: this.selectedSpot.id }
    });

    const currentEvent = this.weeklyEventEnabled ? this.currentWeeklyEvent : null;
    const eligibleLegendarySet = new Set(eligibleLegendaries(this.legendaryRules, this.currentSeason.id, currentEvent?.id ?? null).map((entry) => entry.legendaryId));

    seedFishAgents(
      this.fishPool,
      this.fishCatalog.filter((fish) => {
        if (!fish.seasonActive || fish.seasonActive.length === 0) return true;
        return fish.seasonActive.includes(this.currentSeason.id);
      }),
      this.currentZone,
      this.selectedSpot,
      (fish, zone, spot) =>
        (() => {
          let weight = spawnWeightWithSeasonEvent(
          zoneSpawnWeight(this.environment, zone, fish.id, spot),
          fish.id,
          zone,
          this.currentSeason,
            currentEvent
          );
          if (fish.rarityTier === 'Legendary') {
            weight *= eligibleLegendarySet.has(fish.id) ? 1.28 : 0.08;
          }
          return weight;
        })(),
      this.castRng
    );

    this.audioMix.noteSplash((seed ^ 0x9e3779b9) >>> 0);
    this.messageHud.setText(`Cast at ${this.selectedSpot.name} (${this.currentZone.replace('_', ' ')}). Watch for a bite.`);
  }

  private updateLurePhase(dt: number): void {
    const lure = this.lureCatalog.find((item) => item.id === this.progression.loadout.lureId) ?? this.lureCatalog[0];
    const line = this.gear.lines.find((item) => item.id === this.progression.loadout.lineId) ?? this.gear.lines[0];

    this.currentDepth = resolveLureDepth(this.castDistanceNorm, this.lureElapsedSec, lure.sinkRate, this.environment, this.selectedSpot);
    this.currentZone = resolveLakeZone(this.castDistanceNorm, this.environment);

    const lineVisibilityPenalty = clamp(line.visibility - 1, -0.3, 0.4);

    this.aiStepAcc += dt;
    const aiInterval = this.lureSleeping ? 0.22 : 0.12;
    if (this.aiStepAcc < aiInterval) return;
    this.aiStepAcc = 0;

    const strikeAgent = stepFishAiAgents(
      this.fishPool,
      (fish) => ({
        lure,
        fish,
        depth: this.currentDepth,
        zone: this.currentZone,
        weather: this.weather,
        timeOfDay: this.timeOfDay,
        environment: this.environment,
        spot: this.selectedSpot,
        lineVisibilityPenalty,
        lureDistanceNorm: this.castRng()
      }),
      aiInterval,
      this.castRng
    );

    if (!strikeAgent) return;

    const biteChance = computeBiteChancePerSecond({
      lure,
      fish: strikeAgent.fish,
      depth: this.currentDepth,
      zone: this.currentZone,
      weather: this.weather,
      timeOfDay: this.timeOfDay,
      environment: this.environment,
      spot: this.selectedSpot,
      lineVisibilityPenalty
    });

    const event = this.weeklyEventEnabled ? this.currentWeeklyEvent : null;
    const jigIntervals: number[] = [];
    for (let i = 1; i < this.jigTapTimes.length; i += 1) {
      jigIntervals.push(this.jigTapTimes[i] - this.jigTapTimes[i - 1]);
    }
    const jigFactor = this.mode === 'ice_fishing' ? jigPatternInfluence(jigIntervals) : 1;
    const eventWeatherGate = event?.weatherRequired ? (event.weatherRequired === this.weather ? 1 : 0.6) : 1;
    const eventNight = event?.nightMultiplier && this.timeOfDay === 'night' ? event.nightMultiplier : 1;
    const boostedBiteChance = biteChance * (event?.biteRateMultiplier ?? 1) * jigFactor * eventWeatherGate * eventNight;

    if (this.castRng() > clamp(boostedBiteChance * 1.5, 0.03, 0.9)) return;

    this.biteFish = strikeAgent.fish;
    this.hookWindowStartMs = this.time.now;
    this.hookWindowMs = 760;
    this.phase = 'hook_window';
    this.messageHud.setText('Hook Now! Tap to set the hook.');
    this.castSession?.eventLog.push({
      tMs: Math.floor(this.time.now),
      type: 'bite',
      payload: { fishId: strikeAgent.fish.id, zone: this.currentZone, depth: this.currentDepth, spot: this.selectedSpot.id }
    });

    if (strikeAgent.fish.rarityTier === 'Rare' || strikeAgent.fish.rarityTier === 'Legendary') {
      this.rarePulseSec = 0.22;
      if (strikeAgent.fish.rarityTier === 'Legendary') {
        this.slowMoController.trigger('legendary_strike', 420, 'LEGENDARY STRIKE');
      }
      if (this.graphicsRuntime.enableCameraShake) {
        this.cameras.main.shake(80, 0.0015);
      }
    }

    this.vibrate(26);
    this.audioMix.noteBiteCue();
    this.bobberDipSec = 0.18;
  }

  private updateHookWindow(): void {
    if (this.time.now - this.hookWindowStartMs <= this.hookWindowMs) return;
    this.resetToIdle('Missed bite window. Fish spooked.');
  }

  private tryHookSet(): void {
    if (this.phase !== 'hook_window' || !this.biteFish) return;

    const rod = this.gear.rods.find((item) => item.id === this.progression.loadout.rodId) ?? this.gear.rods[0];
    const reel = this.gear.reels.find((item) => item.id === this.progression.loadout.reelId) ?? this.gear.reels[0];
    const line = this.gear.lines.find((item) => item.id === this.progression.loadout.lineId) ?? this.gear.lines[0];
    const mods = computeLoadoutModifiers(rod, reel, line);

    const center = this.hookWindowStartMs + this.hookWindowMs * 0.5;
    const hook = evaluateHookTiming(this.time.now - center, this.hookWindowMs, mods.hookForgiveness);
    this.castSession?.eventLog.push({
      tMs: Math.floor(this.time.now),
      type: 'hook',
      payload: { quality: hook.quality, success: hook.success, offsetMs: hook.offsetMs }
    });

    if (!hook.success) {
      this.resetToIdle('Bad hook timing. Fish got away.');
      this.audioMix.noteTensionCreak(0.8);
      return;
    }

    this.hookedFish = createHookedFish(this.biteFish, hook.quality, this.castRng());
    this.phase = 'reeling';
    this.reelStepAccSec = 0;

    const replaySeed = (this.castSession?.seed ?? 1) >>> 0;
    this.castSession = createCastSession(replaySeed, this.hookedFish.stamina);
    this.replayDraft = createReplayDraft({
      fishId: this.biteFish.id,
      fishName: this.biteFish.name,
      rarityTier: this.biteFish.rarityTier,
      weightLb: this.hookedFish.weightLb,
      spotId: this.selectedSpot.id,
      weather: this.weather,
      timeOfDay: this.timeOfDay,
      playerLevel: this.progression.level,
      seed: replaySeed,
      hookQuality: hook.quality,
      initialFishStamina: this.hookedFish.stamina
    });
    this.jumpMoment.arm(
      planJumpMoment(
        replaySeed,
        this.castSession.eventLog.length + 1,
        this.biteFish.rarityTier,
        this.hookedFish.weightLb,
        deriveP95Weight(this.hookedFish)
      )
    );
    this.jumpVisualActive = false;
    this.jumpVisualY = 0;
    this.jumpVisualT = 0;
    this.messageHud.setText(`Hooked ${this.biteFish.name}! Balance tension and line tightness.`);
    this.vibrate([40, 18, 46]);
    this.audioMix.noteHookSet();
    if (hook.quality === 'perfect') {
      this.slowMoController.trigger('perfect_hook', 340, 'PERFECT HOOK');
    }
  }

  private updateReelPhase(dt: number): void {
    if (!this.hookedFish || !this.castSession) return;

    const rod = this.gear.rods.find((item) => item.id === this.progression.loadout.rodId) ?? this.gear.rods[0];
    const reel = this.gear.reels.find((item) => item.id === this.progression.loadout.reelId) ?? this.gear.reels[0];
    const line = this.gear.lines.find((item) => item.id === this.progression.loadout.lineId) ?? this.gear.lines[0];
    const mods = computeLoadoutModifiers(rod, reel, line);

    const behavior = stepFishBehavior(this.hookedFish, dt, this.castRng());
    this.hookedFish = behavior.fish;
    const jumpState = this.jumpMoment.update(dt, this.reducedMotion, !this.heavyEffectsAutoDisabled);
    this.jumpVisualActive = jumpState.active;
    this.jumpVisualY = jumpState.yOffsetPx;
    this.jumpVisualT = jumpState.tNorm;
    if (jumpState.justStarted) {
      this.audioMix.noteSplash(jumpState.splashSeed);
      spawnRipple(this.splashRipplePool, this.bobber.x, this.bobber.y, 6, 56, 0.42, 0.5);
      if (jumpState.shakeSuggested) this.cameraController.onImpactBump(0.55);
    }
    const bobberX = this.bobber.x;
    const bobberY = this.bobber.y;
    if (this.previousFightBehavior !== this.hookedFish.behavior) {
      spawnRipple(this.splashRipplePool, bobberX, bobberY, 8, 42, 0.34, 0.52);
      this.previousFightBehavior = this.hookedFish.behavior;
    }
    if (behavior.pullForce > 0.95 && this.graphicsRuntime.enableCameraShake) {
      this.cameras.main.shake(55, 0.0012);
      this.cameraController.onImpactBump(0.85);
      if (this.dramaticRunSlowMoCooldownSec <= 0 && this.castSession.reelState.tension > 0.9) {
        this.slowMoController.trigger('dramatic_run', 300, 'DRAMATIC RUN');
        this.dramaticRunSlowMoCooldownSec = 1.3;
      }
    }
    if (this.hookedFish.behavior === 'thrash' && this.graphicsRuntime.particleCount > 18) {
      this.drillParticleBurstAcc += dt;
      if (this.drillParticleBurstAcc >= 0.08) {
        this.drillParticleBurstAcc = 0;
        spawnRipple(this.splashRipplePool, bobberX + (this.nextVisualRand() - 0.5) * 24, bobberY + (this.nextVisualRand() - 0.5) * 12, 6, 54, 0.38, 0.48);
        for (let i = 0; i < 3; i += 1) {
          spawnParticle(
            this.splashParticlePool,
            bobberX + (this.nextVisualRand() - 0.5) * 18,
            bobberY + (this.nextVisualRand() - 0.5) * 8,
            (this.nextVisualRand() - 0.5) * 60,
            -30 - this.nextVisualRand() * 40,
            1.6 + this.nextVisualRand() * 1.4,
            0.9,
            0.45 + this.nextVisualRand() * 0.35
          );
        }
      }
    }

    this.reelStepAccSec += dt;
    while (this.reelStepAccSec >= 1 / 30 && this.castSession.reelState.outcome === 'active') {
      this.reelStepAccSec -= 1 / 30;

      const reelPower = this.isReeling ? 0.88 * mods.reelPowerScale : 0;

      const reelState = applyReelInputEvent(
        this.castSession,
        Math.floor(this.time.now),
        reelPower,
        mods.rodFlexMultiplier,
        mods.dragSetting,
        mods.snapThresholdMultiplier,
        mods.slackRecoveryMultiplier
      );

      const combinedPull = behavior.pullForce * this.hookedFish.aggression;
      reelState.tension = clamp(reelState.tension + combinedPull * 0.005, 0, 1.35);
      reelState.lineTightness = clamp(reelState.lineTightness + combinedPull * 0.003, 0, 1);
      this.castSession.reelState = reelState;

      this.hookedFish.stamina = reelState.fishStamina;
      const lastEvent = this.castSession.eventLog[this.castSession.eventLog.length - 1];
      if (lastEvent && lastEvent.type === 'reel' && this.replayDraft) {
        appendReplayEvent(this.replayDraft, lastEvent);
      }
      if (this.replayDraft) {
        appendReplaySample(this.replayDraft, {
          tMs: Math.floor(this.time.now),
          reelPower,
          tension: reelState.tension,
          fishStamina: reelState.fishStamina
        });
      }

      if (reelState.tension > 0.82) {
        this.reelCreakCooldownSec -= 1 / 30;
        if (this.reelCreakCooldownSec <= 0) {
          this.audioMix.noteTensionCreak(clamp((reelState.tension - 0.82) / 0.3, 0, 1));
          this.reelCreakCooldownSec = 0.22;
        }
      }
      if (reelPower > 0.01) {
        this.audioMix.noteReelClick(clamp(reelPower, 0, 1));
      }
    }

    if (this.castSession.reelState.outcome === 'active') return;

    this.hookedFish = transitionHookedFishState(this.hookedFish, this.castSession.reelState.outcome, this.castRng);

    if (this.castSession.reelState.outcome === 'snapped') {
      this.audioMix.noteTensionCreak(1);
      this.replayDraft = null;
      this.resetToIdle('Line snapped. Tension peaked too high.');
      return;
    }

    if (this.castSession.reelState.outcome === 'escaped') {
      this.audioMix.noteSplash((this.time.now ^ 0xa5a5a5a5) >>> 0);
      this.replayDraft = null;
      this.resetToIdle('Fish escaped after slack line opened.');
      return;
    }

    this.onCatchLanded();
  }

  private onCatchLanded(): void {
    if (!this.hookedFish) return;

    const tier = this.hookedFish.fish.rarityTier;
    const eventScore = this.weeklyEventEnabled ? this.currentWeeklyEvent.scoring : undefined;
    const derbyBonus = this.mode === 'timed_derby' ? (eventScore?.derbyWeightBonus ?? 1) : 1;
    const bigCatchBonus = this.mode === 'big_catch' ? (eventScore?.bigCatchBonus ?? 1) : 1;
    const derbyMultiplier = this.mode === 'timed_derby' ? rarityWeightMultiplier(tier) * derbyBonus : bigCatchBonus;
    const xp = calculateCatchXp(this.hookedFish.weightLb, this.hookedFish.fish.difficulty, derbyMultiplier);

    const catchRecord: CatchRecord = {
      fishId: this.hookedFish.fish.id,
      fishName: this.hookedFish.fish.name,
      weightLb: this.hookedFish.weightLb,
      xp,
      rarityTier: tier,
      timestamp: Date.now(),
      spotId: this.selectedSpot.id,
      weather: this.weather,
      timeOfDay: this.timeOfDay
    };

    this.progression = applyCatchProgress(this.progression, catchRecord);
    if (this.replayDraft) {
      const finalized = finalizeReplayDraft(this.replayDraft);
      this.progression = applyFightReplay(this.progression, finalized);
      this.sessionReplayIds.push(finalized.id);
      this.replayDraft = null;
    }
    this.progression = applyLakeStatsUpdate(
      this.progression,
      catchRecord,
      this.castSession?.eventLog.length ? this.castSession.eventLog[this.castSession.eventLog.length - 1].tMs - this.castSession.eventLog[0].tMs : 0,
      this.castSession?.reelState.tension ?? 0
    );
    saveProgression(this.progression);

    this.totalWeightCaught += this.hookedFish.weightLb * derbyMultiplier;
    this.biggestCatch = Math.max(this.biggestCatch, this.hookedFish.weightLb);
    this.catchesInRound += 1;

    this.sessionCatches.push({ ...catchRecord, derbyScoreLb: this.hookedFish.weightLb * derbyMultiplier });

    const personalBest = this.progression.personalBestBySpecies[catchRecord.fishId] ?? catchRecord.weightLb;
    const fishVisual = this.fishRender.getVisualForSpecies(catchRecord.fishId);
    const family = catchRecord.fishId.includes('bass')
      ? 'BASS'
      : catchRecord.fishId.includes('catfish')
        ? 'CATFISH'
        : catchRecord.fishId.includes('trout')
          ? 'TROUT'
          : catchRecord.fishId.includes('carp')
            ? 'CARP'
            : 'PANFISH';
    const rarityFrameColor = catchRecord.rarityTier === 'Legendary' ? 0xffd36f : catchRecord.rarityTier === 'Rare' ? 0x88ccff : 0x89d6ff;
    this.catchPanelRect.setFillStyle(catchRecord.rarityTier === 'Legendary' ? 0x1e1622 : family === 'CATFISH' ? 0x0c1e29 : 0x071624, 0.93).setStrokeStyle(3, rarityFrameColor, 0.95);
    const weightPct = clamp((catchRecord.weightLb - this.hookedFish.fish.minWeightLb) / Math.max(0.001, this.hookedFish.fish.maxWeightLb - this.hookedFish.fish.minWeightLb), 0, 1);
    const scaleTicks = Math.round(weightPct * 10);
    const ruler = `[${'='.repeat(scaleTicks)}|${'-'.repeat(10 - scaleTicks)}]`;

    this.fishArtText.setText(`${fishVisual.spriteKeys.idle.replace('-idle', '').toUpperCase()}`);
    this.fishArtText.setColor(fishVisual.rarityEffects.aura === 'gold' ? '#ffe8ac' : '#9fd7ff');
    this.catchText.setText(
      [
        `${catchRecord.fishName}`,
        `${family} PRESENTATION`,
        `${fmtLb(catchRecord.weightLb)}  •  [${catchRecord.rarityTier.toUpperCase()}]`,
        `Scale ruler ${ruler}`,
        `XP +${catchRecord.xp} (Level ${this.progression.level})`,
        `PB: ${fmtLb(personalBest)}  Spot: ${this.selectedSpot.name}`,
        `Caught at ${this.timeOfDay} / ${this.weather}`
      ].join('\n')
    );

    this.catchOverlay.setVisible(true);
    if (this.uiMotion.panelTransitionMs > 0) {
      this.catchOverlay.alpha = 0;
      this.catchOverlay.scale = 0.98;
      this.tweens.add({
        targets: this.catchOverlay,
        alpha: 1,
        scale: 1,
        duration: this.uiMotion.panelTransitionMs
      });
    }
    this.phase = 'catch';

    this.xpBarFill.width = 0;
    this.xpFillTarget = levelProgressRatio(this.progression.xp);

    const fish = this.hookedFish.fish;
    const trophyThreshold = fish.minWeightLb + (fish.maxWeightLb - fish.minWeightLb) * 0.95;
    const showTrophy = catchRecord.weightLb >= trophyThreshold || fish.rarityTier === 'Legendary';
    this.trophyText.setVisible(showTrophy);
    this.trophyText.setColor(
      fish.rarityTier === 'Legendary'
        ? '#ffd66f'
        : fish.rarityTier === 'Rare'
          ? '#8fd6ff'
          : fish.rarityTier === 'Uncommon'
            ? '#9ce39b'
            : '#f4f4f4'
    );
    const ringColor = fish.rarityTier === 'Legendary' ? 0xffe08f : fish.rarityTier === 'Rare' ? 0x8fd6ff : fish.rarityTier === 'Uncommon' ? 0x9ce39b : 0xb3d9ef;
    this.catchGlowRing.setVisible(true).setStrokeStyle(2, ringColor, 0.45);
    if (this.uiMotion.panelTransitionMs > 0) {
      this.catchGlowRing.setScale(0.92).setAlpha(0.3);
      this.tweens.add({
        targets: this.catchGlowRing,
        scale: 1.03,
        alpha: 0.75,
        duration: this.uiMotion.panelTransitionMs,
        yoyo: true
      });
    } else {
      this.catchGlowRing.setScale(1).setAlpha(0.7);
    }
    if (showTrophy && this.uiMotion.badgePopMs > 0) {
      this.tweens.add({
        targets: this.trophyText,
        scale: { from: 0.7, to: 1.08 },
        alpha: { from: 0.45, to: 1 },
        yoyo: true,
        repeat: 2,
        duration: this.uiMotion.badgePopMs
      });
    }

    this.audioMix.noteCatch();
    if (showTrophy) {
      this.cameraController.startReveal(fish.rarityTier === 'Legendary' ? 520 : 380);
    }
    if (fish.rarityTier === 'Rare' || fish.rarityTier === 'Legendary' || catchRecord.weightLb >= trophyThreshold) {
      this.startBigMoment();
    }
    this.messageHud.setText('Catch secured. Release or keep (cosmetic).');
  }

  private startBigMoment() {
    if (this.reducedMotion || this.heavyEffectsAutoDisabled) return;
    this.bigMomentActive = true;
    this.bigMomentSparkleAcc = 0;
    this.bigMomentVignette.alpha = 0;
    this.bigMomentBanner.setVisible(true).setScale(0.92).setAlpha(0);
    this.bigMomentHint.setVisible(true).setAlpha(0);
    if (this.uiMotion.panelTransitionMs > 0) {
      this.tweens.add({
        targets: [this.bigMomentBanner, this.bigMomentHint],
        alpha: 1,
        scale: 1,
        duration: this.uiMotion.panelTransitionMs
      });
      if (this.catchShareButton) {
        this.tweens.add({
          targets: this.catchShareButton,
          scale: { from: 1, to: 1.06 },
          yoyo: true,
          repeat: 2,
          duration: this.uiMotion.panelTransitionMs
        });
      }
    } else {
      this.bigMomentBanner.setAlpha(1).setScale(1);
      this.bigMomentHint.setAlpha(1);
    }
  }

  private endBigMoment() {
    this.bigMomentActive = false;
    this.bigMomentSparkleAcc = 0;
    this.bigMomentVignette.alpha = 0;
    this.bigMomentBanner.setVisible(false).setAlpha(0);
    this.bigMomentHint.setVisible(false).setAlpha(0);
    if (this.catchShareButton) this.catchShareButton.setScale(1);
  }

  private dismissCatch(): void {
    this.catchOverlay.setVisible(false);
    this.catchGlowRing.setVisible(false);
    this.endBigMoment();
    this.cameraController.cancelReveal();
    this.resetToIdle('Swipe up for the next cast.');
  }

  private resetToIdle(message: string): void {
    this.phase = 'idle';
    this.biteFish = null;
    this.hookedFish = null;
    this.castSession = null;
    this.replayDraft = null;
    this.previousFightBehavior = null;
    this.isReeling = false;
    this.lureElapsedSec = 0;
    this.lureMotionSpeed = 0;
    this.lureSleeping = false;
    this.endBigMoment();
    this.cameraController.cancelReveal();
    this.jumpMoment.reset();
    this.jumpVisualActive = false;
    this.jumpVisualY = 0;
    this.jumpVisualT = 0;
    this.messageHud.setText(message);
    this.bobber.setY(540);
  }

  private setMode(nextMode: OzarkMode): void {
    if (nextMode === 'ice_fishing' && !isIceFishingAvailable(this.currentSeason.id, this.sandboxAllowIceFishing)) {
      this.messageHud.setText('Ice Fishing unavailable outside Winter unless Sandbox override is enabled.');
      return;
    }
    this.mode = nextMode;
    this.timerSec = nextMode === 'timed_derby' ? this.currentDerbyDurationSec() : modeDurationSec(nextMode);
    this.totalWeightCaught = 0;
    this.biggestCatch = 0;
    this.catchesInRound = 0;
    this.sessionCatches.length = 0;
    this.sessionReplayIds.length = 0;
    this.replayDraft = null;
    this.iceHoleProgress = 0;
    this.jigTapTimes.length = 0;
    this.catchOverlay.setVisible(false);
    this.catchGlowRing.setVisible(false);
    this.endBigMoment();
    this.setPanelVisible(this.cosmeticsPanel, false);
    this.setPanelVisible(this.summaryPanel, false);
    this.resetToIdle(`${MODE_LABELS[nextMode]} selected.`);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#e9f7ff', backgroundColor: '#13425eaa' })
      .setPadding(9, 5, 9, 5)
      .setDepth(73)
      .setInteractive({ useHandCursor: true })
      .setShadow(0, 1, '#03131f', 3, false, true)
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        onClick();
      });
    this.bindButtonMicroInteraction(button);
    return button;
  }

  private bindButtonMicroInteraction(button: Phaser.GameObjects.Text) {
    const pressScale = this.uiMotion.buttonPressMs > 0 ? 0.97 : 1;
    button.on('pointerdown', () => {
      if (this.uiMotion.buttonPressMs > 0) {
        this.tweens.killTweensOf(button);
        this.tweens.add({
          targets: button,
          scale: pressScale,
          duration: this.uiMotion.buttonPressMs
        });
      }
      button.setShadow(0, 0, '#03131f', 1, false, true);
      this.vibrate(12);
    });
    const release = () => {
      if (this.uiMotion.buttonPressMs > 0) {
        this.tweens.killTweensOf(button);
        this.tweens.add({
          targets: button,
          scale: 1,
          duration: this.uiMotion.buttonPressMs
        });
      } else {
        button.setScale(1);
      }
      button.setShadow(0, 1, '#03131f', 3, false, true);
    };
    button.on('pointerup', release);
    button.on('pointerout', release);
  }

  private makeHoldButton(
    x: number,
    y: number,
    label: string,
    onPress: () => void,
    onRelease: () => void
  ): Phaser.GameObjects.Text {
    const button = this.makeButton(x, y, label, onPress);
    button.on('pointerup', onRelease);
    button.on('pointerout', onRelease);
    return button;
  }

  private updateWaterVisuals(dt: number): void {
    this.ensureSceneComposition();
    const composition = this.sceneComposition;
    if (!composition) return;
    const visualNowMs = this.visualClockMs;
    const width = this.scale.width;
    const height = this.scale.height;
    const lakeTop = 120;
    const isWinter = this.currentSeason.id === 'winter';
    const isNight = this.timeOfDay === 'night';
    const isRain = this.weather === 'light_rain';
    const isOvercast = this.weather === 'overcast';
    const seasonalTint = isWinter ? 0.9 : this.currentSeason.id === 'fall' ? 1.04 : this.currentSeason.id === 'summer' ? 1.06 : 1;

    // Dynamic lighting target and smooth interpolation.
    if (isNight) {
      this.lightingColorTarget = isRain ? 0x061321 : 0x071a31;
      this.lightingAlphaTarget = isRain ? 0.42 : 0.34;
    } else if (isOvercast) {
      this.lightingColorTarget = 0x203041;
      this.lightingAlphaTarget = 0.18;
    } else if (isRain) {
      this.lightingColorTarget = 0x10263a;
      this.lightingAlphaTarget = 0.26;
    } else {
      this.lightingColorTarget = 0x00122b;
      this.lightingAlphaTarget = 0.07;
    }
    const targetColor = Phaser.Display.Color.ValueToColor(this.lightingColorTarget);
    this.lightingColorCurrent.red += Math.round((targetColor.red - this.lightingColorCurrent.red) * (1 - Math.exp(-dt * 3.2)));
    this.lightingColorCurrent.green += Math.round((targetColor.green - this.lightingColorCurrent.green) * (1 - Math.exp(-dt * 3.2)));
    this.lightingColorCurrent.blue += Math.round((targetColor.blue - this.lightingColorCurrent.blue) * (1 - Math.exp(-dt * 3.2)));
    this.lightingAlphaCurrent += (this.lightingAlphaTarget - this.lightingAlphaCurrent) * (1 - Math.exp(-dt * 3.2));
    this.tintOverlay.fillColor = Phaser.Display.Color.GetColor(this.lightingColorCurrent.red, this.lightingColorCurrent.green, this.lightingColorCurrent.blue);
    this.tintOverlay.alpha = this.lightingAlphaCurrent;

    const deepColor = isNight ? 0x123b58 : 0x2f8bc0;
    const midColor = isNight ? 0x1a5372 : 0x3f97c8;
    const shallowColor = isNight ? 0x305d76 : 0x67b5dc;
    const surfaceMix = isWinter ? 0xb8d8ec : 0x96cfe9;
    const skyTop = composition.layers.sky.topColor;
    const skyBottom = composition.layers.sky.bottomColor;
    const shallowRgb = Phaser.Display.Color.ValueToColor(shallowColor);
    const surfaceRgb = Phaser.Display.Color.ValueToColor(surfaceMix);
    const blendT = clamp(0.24 * seasonalTint, 0.12, 0.36);
    const topWaterColor = Phaser.Display.Color.GetColor(
      Math.round(shallowRgb.red + (surfaceRgb.red - shallowRgb.red) * blendT),
      Math.round(shallowRgb.green + (surfaceRgb.green - shallowRgb.green) * blendT),
      Math.round(shallowRgb.blue + (surfaceRgb.blue - shallowRgb.blue) * blendT)
    );

    this.waterBaseGfx.clear();
    this.waterBaseGfx.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1, 1, 1, 1);
    this.waterBaseGfx.fillRect(0, 0, width, lakeTop);
    this.waterBaseGfx.fillGradientStyle(
      topWaterColor,
      topWaterColor,
      midColor,
      deepColor,
      1,
      1,
      1,
      1
    );
    this.waterBaseGfx.fillRect(0, lakeTop, width, height - lakeTop);

    this.underwaterGfx.clear();
    this.underwaterGfx.fillGradientStyle(0x2f7ca3, 0x2f7ca3, 0x1d3b57, 0x1d3b57, 0.08, 0.08, 0.38, 0.38);
    this.underwaterGfx.fillRect(0, lakeTop + 90, width, height - (lakeTop + 90));

    this.envBackdropGfx.clear();
    this.envBackdropGfx.fillStyle(composition.layers.treeline.color, 0.92);
    const horizonY = Math.floor(lakeTop * (0.8 + composition.layers.treeline.horizonY));
    this.envBackdropGfx.beginPath();
    this.envBackdropGfx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 28) {
      const y = horizonY - 18 - Math.sin(x * 0.017 + composition.layers.treeline.horizonY * 10) * 10 - Math.cos(x * 0.031) * 5;
      this.envBackdropGfx.lineTo(x, y);
    }
    this.envBackdropGfx.lineTo(width, lakeTop);
    this.envBackdropGfx.lineTo(0, lakeTop);
    this.envBackdropGfx.closePath();
    this.envBackdropGfx.fillPath();
    if (composition.layers.shoreline.enabled) {
      this.envBackdropGfx.fillStyle(composition.layers.shoreline.color, 0.66);
      this.envBackdropGfx.fillRoundedRect(0, lakeTop + 4, width, 24, 6);
    }

    this.cloudDriftPhase += dt;
    this.skyCloudFarGfx.clear();
    this.skyCloudNearGfx.clear();
    for (let i = 0; i < composition.clouds.length; i += 1) {
      const cloud = composition.clouds[i];
      const drift = composition.animateClouds ? this.cloudDriftPhase * cloud.speed : 0;
      const x = ((cloud.xNorm + drift) % 1) * width;
      const y = cloud.yNorm * lakeTop;
      const sx = 38 * cloud.scale;
      const sy = 14 * cloud.scale;
      const layer = cloud.parallax === 0 ? this.skyCloudFarGfx : this.skyCloudNearGfx;
      layer.fillStyle(0xffffff, cloud.alpha * (cloud.parallax === 0 ? 0.75 : 1));
      if (cloud.variant === 0) {
        layer.fillEllipse(x, y, sx, sy);
        layer.fillEllipse(x + sx * 0.28, y + 3, sx * 0.6, sy * 0.7);
      } else if (cloud.variant === 1) {
        layer.fillEllipse(x, y, sx * 1.2, sy);
        layer.fillEllipse(x - sx * 0.22, y + 2, sx * 0.48, sy * 0.65);
      } else {
        layer.fillEllipse(x, y, sx * 0.9, sy * 0.9);
        layer.fillEllipse(x + sx * 0.36, y + 1, sx * 0.55, sy * 0.6);
        layer.fillEllipse(x - sx * 0.3, y + 2, sx * 0.44, sy * 0.52);
      }
    }

    this.lightShaftGfx.clear();
    if (!isNight && this.weather === 'sunny' && this.graphicsRuntime.lightShafts) {
      this.lightShaftGfx.fillStyle(0xffffff, 0.06);
      for (let i = 0; i < 5; i += 1) {
        const px = 120 + i * 230 + Math.sin(visualNowMs * 0.0004 + i) * 24;
        this.lightShaftGfx.fillRect(px, lakeTop + 18, 28, 520);
      }
    }

    this.weedGfx.clear();
    this.weedGfx.lineStyle(2, 0x4f8a59, 0.34);
    for (let i = 0; i < this.weedStems.length; i += 1) {
      const stem = this.weedStems[i];
      const sway = Math.sin(visualNowMs * 0.0013 + stem.swayPhase) * stem.swayAmp;
      this.weedGfx.beginPath();
      this.weedGfx.moveTo(stem.x, stem.y);
      this.weedGfx.lineTo(stem.x + sway * 0.22, stem.y - stem.height * 0.35);
      this.weedGfx.lineTo(stem.x + sway, stem.y - stem.height);
      this.weedGfx.strokePath();
    }

    // Waves: multi-layer parallax.
    const waveTime = visualNowMs * 0.001;
    this.waveFarGfx.clear();
    this.waveMidGfx.clear();
    this.waveNearGfx.clear();
    const waveLayers = this.graphicsRuntime.waveLayers;
    if (waveLayers > 0) {
      this.waveFarGfx.lineStyle(1.4, 0xffffff, 0.1 * this.graphicsRuntime.rippleAlpha);
      for (let y = lakeTop + 32; y < 510; y += 54) {
        this.waveFarGfx.beginPath();
        this.waveFarGfx.moveTo(0, y + Math.sin(waveTime * 0.8 + y * 0.016) * 3 * this.graphicsRuntime.waveAmplitudeScale);
        for (let x = 20; x <= width; x += 20) {
          this.waveFarGfx.lineTo(x, y + Math.sin(waveTime * 0.8 + x * 0.011 + y * 0.016) * 3 * this.graphicsRuntime.waveAmplitudeScale);
        }
        this.waveFarGfx.strokePath();
      }
    }
    if (waveLayers > 1) {
      this.waveMidGfx.lineStyle(1.7, 0xe7fbff, 0.16 * this.graphicsRuntime.rippleAlpha);
      for (let y = lakeTop + 20; y < 525; y += 42) {
        this.waveMidGfx.beginPath();
        this.waveMidGfx.moveTo(0, y + Math.sin(waveTime * 1.2 + y * 0.02) * 5 * this.graphicsRuntime.waveAmplitudeScale);
        for (let x = 22; x <= width; x += 22) {
          this.waveMidGfx.lineTo(x, y + Math.sin(waveTime * 1.2 + x * 0.013 + y * 0.02) * 5 * this.graphicsRuntime.waveAmplitudeScale);
        }
        this.waveMidGfx.strokePath();
      }
    }
    if (waveLayers > 2) {
      this.waveNearGfx.lineStyle(2.1, 0xffffff, 0.22 * this.graphicsRuntime.rippleAlpha);
      for (let y = lakeTop + 18; y < 535; y += 32) {
        this.waveNearGfx.beginPath();
        this.waveNearGfx.moveTo(0, y + Math.sin(waveTime * 1.7 + y * 0.024) * 7 * this.graphicsRuntime.waveAmplitudeScale);
        for (let x = 24; x <= width; x += 24) {
          this.waveNearGfx.lineTo(x, y + Math.sin(waveTime * 1.7 + x * 0.015 + y * 0.024) * 7 * this.graphicsRuntime.waveAmplitudeScale);
        }
        this.waveNearGfx.strokePath();
      }
    }

    this.shorelineFoamGfx.clear();
    this.shorelineFoamGfx.lineStyle(2, 0xffffff, 0.22);
    this.shorelineFoamGfx.beginPath();
    this.shorelineFoamGfx.moveTo(0, lakeTop + 8);
    for (let x = 18; x <= width; x += 18) {
      this.shorelineFoamGfx.lineTo(x, lakeTop + 8 + Math.sin(waveTime * 1.8 + x * 0.03) * 3);
    }
    this.shorelineFoamGfx.strokePath();

    this.shorelineDepthGfx.clear();
    this.shorelineDepthGfx.fillStyle(composition.shorelineCues.shallowBandColor, composition.shorelineCues.shallowBandAlpha);
    this.shorelineDepthGfx.fillRect(0, lakeTop + 20, width, 56);
    this.shorelineDepthGfx.fillStyle(0x25425a, composition.shorelineCues.bottomTextureAlpha);
    for (let x = 0; x <= width; x += 34) {
      this.shorelineDepthGfx.fillRect(x, lakeTop + 60 + Math.sin(x * 0.03 + waveTime * 1.6) * 6, 14, 3);
    }
    if (composition.shorelineCues.submergedGrass) {
      this.shorelineDepthGfx.lineStyle(1, 0x4f8a59, 0.28);
      for (let i = 0; i < 12; i += 1) {
        const x = 90 + i * 62;
        this.shorelineDepthGfx.beginPath();
        this.shorelineDepthGfx.moveTo(x, lakeTop + 100);
        this.shorelineDepthGfx.lineTo(x + Math.sin(waveTime + i) * 6, lakeTop + 74);
        this.shorelineDepthGfx.strokePath();
      }
    }
    if (composition.shorelineCues.currentStreaks > 0) {
      this.shorelineDepthGfx.lineStyle(1.4, 0xd4ecff, 0.22);
      for (let i = 0; i < composition.shorelineCues.currentStreaks; i += 1) {
        const y = lakeTop + 120 + i * 28;
        const offset = Math.sin(waveTime * 1.4 + i) * 10;
        this.shorelineDepthGfx.beginPath();
        this.shorelineDepthGfx.moveTo(120 + offset, y);
        this.shorelineDepthGfx.lineTo(width - 140 + offset, y + Math.sin(i + waveTime) * 4);
        this.shorelineDepthGfx.strokePath();
      }
    }

    this.moonPathGfx.clear();
    this.moonPathGfx.fillStyle(composition.layers.reflection.tintColor, composition.layers.reflection.alpha);
    const reflectionDrift = composition.layers.reflection.shimmer ? Math.sin(waveTime * 0.8) * 22 : 0;
    this.moonPathGfx.fillEllipse(640 + reflectionDrift, 338, isNight ? 280 : 240, isNight ? 420 : 320);

    // Rain and rain ripples.
    this.rainGfx.clear();
    if (isRain || (this.mode === 'ice_fishing' && isWinter)) {
      this.rainGfx.lineStyle(1.4, 0xd0ecff, 0.28);
      for (let i = 0; i < this.rainDrops.length; i += 1) {
        const d = this.rainDrops[i];
        d.y += d.speed * dt;
        d.x += 12 * dt;
        if (d.y > height) {
          d.y = -20;
          d.x = (d.x + 280) % width;
        }
        if (d.x > width) d.x -= width;

        this.rainGfx.beginPath();
        this.rainGfx.moveTo(d.x, d.y);
        this.rainGfx.lineTo(d.x + 3, d.y + d.len);
        this.rainGfx.strokePath();
      }

      if (this.graphicsSettings.waterDetail !== 'off') {
        this.rainRippleSpawnAcc += dt;
        const interval = this.graphicsSettings.effectsQuality === 'high' ? 0.04 : 0.08;
        while (this.rainRippleSpawnAcc >= interval) {
          this.rainRippleSpawnAcc -= interval;
          spawnRipple(
            this.rainRipplePool,
            100 + this.nextVisualRand() * (width - 200),
            lakeTop + 20 + this.nextVisualRand() * (height - lakeTop - 120),
            2 + this.nextVisualRand() * 3,
            30 + this.nextVisualRand() * 18,
            0.5,
            0.62
          );
        }
      }
    } else {
      this.rainRippleSpawnAcc = 0;
    }

    // Underwater particles.
    if (this.graphicsRuntime.particleCount > 0 && !this.reducedMotion && !this.heavyEffectsAutoDisabled) {
      this.particleSpawnAcc += dt;
      const targetInterval = 1 / Math.max(8, this.graphicsRuntime.particleCount * 0.42);
      while (this.particleSpawnAcc >= targetInterval) {
        this.particleSpawnAcc -= targetInterval;
        spawnParticle(
          this.underwaterParticlePool,
          90 + this.nextVisualRand() * (width - 180),
          lakeTop + 130 + this.nextVisualRand() * (height - lakeTop - 190),
          -6 + this.nextVisualRand() * 12,
          -5 - this.nextVisualRand() * 12,
          0.8 + this.nextVisualRand() * 1.8,
          0.55,
          1.8 + this.nextVisualRand() * 1.8
        );
      }
    }

    // Draw fish silhouettes with wag + depth shadows.
    this.fishGfx.clear();
    this.fishRender.renderAmbient(this.fishGfx, this.fishPool, waveTime * (this.heavyEffectsAutoDisabled ? 0.62 : 1));

    // Ripples and splash particles.
    this.rippleGfx.clear();
    this.rippleGfx.lineStyle(1.5, 0xe2f6ff, 0.22);
    for (let i = 0; i < this.rainRipplePool.items.length; i += 1) {
      const r = this.rainRipplePool.items[i];
      if (!r.active) continue;
      this.rippleGfx.strokeCircle(r.x, r.y, r.radius);
    }
    for (let i = 0; i < this.splashRipplePool.items.length; i += 1) {
      const r = this.splashRipplePool.items[i];
      if (!r.active) continue;
      this.rippleGfx.lineStyle(2, 0xdff4ff, 0.28);
      this.rippleGfx.strokeCircle(r.x, r.y, r.radius);
    }

    this.splashGfx.clear();
    for (let i = 0; i < this.underwaterParticlePool.items.length; i += 1) {
      const p = this.underwaterParticlePool.items[i];
      if (!p.active) continue;
      this.splashGfx.fillStyle(0xbfe8ff, p.alpha * 0.25);
      this.splashGfx.fillCircle(p.x, p.y, p.size);
    }
    for (let i = 0; i < this.splashParticlePool.items.length; i += 1) {
      const p = this.splashParticlePool.items[i];
      if (!p.active) continue;
      this.splashGfx.fillStyle(0xd9f1ff, p.alpha * 0.55);
      this.splashGfx.fillCircle(p.x, p.y, p.size);
    }

    this.foregroundPropsGfx.clear();
    if (composition.layers.foreground.enabled) {
      for (let i = 0; i < composition.layers.foreground.props.length; i += 1) {
        const prop = composition.layers.foreground.props[i];
        const px = prop.xNorm * width;
        const py = prop.yNorm * height;
        const scale = prop.scale;
        if (prop.kind === 'lily_pad') {
          this.foregroundPropsGfx.fillStyle(0x5b8a56, prop.alpha * 0.8);
          this.foregroundPropsGfx.fillEllipse(px, py, 20 * scale, 12 * scale);
        } else if (prop.kind === 'reeds' || prop.kind === 'cattail') {
          this.foregroundPropsGfx.lineStyle(2, 0x5e8f63, prop.alpha * 0.7);
          this.foregroundPropsGfx.beginPath();
          this.foregroundPropsGfx.moveTo(px, py);
          this.foregroundPropsGfx.lineTo(px + Math.sin(waveTime + i) * 4, py - 22 * scale);
          this.foregroundPropsGfx.strokePath();
          if (prop.kind === 'cattail') {
            this.foregroundPropsGfx.fillStyle(0x7f5f36, prop.alpha * 0.65);
            this.foregroundPropsGfx.fillEllipse(px + 2, py - 26 * scale, 5 * scale, 8 * scale);
          }
        } else if (prop.kind === 'dock_post') {
          this.foregroundPropsGfx.fillStyle(0x5f4e3d, prop.alpha * 0.75);
          this.foregroundPropsGfx.fillRect(px - 3, py - 28 * scale, 6, 32 * scale);
        } else if (prop.kind === 'rope_float') {
          this.foregroundPropsGfx.lineStyle(1.5, 0xdbc9ab, prop.alpha * 0.7);
          this.foregroundPropsGfx.beginPath();
          this.foregroundPropsGfx.moveTo(px - 10 * scale, py - 8 * scale);
          this.foregroundPropsGfx.lineTo(px + 12 * scale, py - 8 * scale);
          this.foregroundPropsGfx.strokePath();
          this.foregroundPropsGfx.fillStyle(0xff9256, prop.alpha * 0.85);
          this.foregroundPropsGfx.fillCircle(px + 12 * scale, py - 8 * scale, 3.4 * scale);
        } else if (prop.kind === 'island') {
          this.foregroundPropsGfx.fillStyle(0x3b5d47, prop.alpha * 0.55);
          this.foregroundPropsGfx.fillEllipse(px, py - 120 * scale, 46 * scale, 14 * scale);
        } else if (prop.kind === 'wave_band' || prop.kind === 'current_streak') {
          this.foregroundPropsGfx.lineStyle(1.5, 0xcde8fb, prop.alpha * 0.4);
          this.foregroundPropsGfx.beginPath();
          this.foregroundPropsGfx.moveTo(px - 16 * scale, py);
          this.foregroundPropsGfx.lineTo(px + 16 * scale, py + Math.sin(waveTime + i) * 3);
          this.foregroundPropsGfx.strokePath();
        } else if (prop.kind === 'driftwood') {
          this.foregroundPropsGfx.fillStyle(0x73583b, prop.alpha * 0.7);
          this.foregroundPropsGfx.fillEllipse(px, py, 18 * scale, 6 * scale);
        } else {
          this.foregroundPropsGfx.fillStyle(0x587482, prop.alpha * 0.64);
          this.foregroundPropsGfx.fillEllipse(px, py, 14 * scale, 9 * scale);
        }
      }
    }

    this.iceFxGfx.clear();
    this.frostVignette.alpha = 0;
    if (this.mode === 'ice_fishing') {
      this.iceFxGfx.fillStyle(0xe9f6ff, 0.5);
      this.iceFxGfx.fillRect(0, lakeTop, width, height - lakeTop);
      this.iceFxGfx.lineStyle(1.2, 0xb7d6ea, 0.4);
      for (let i = 0; i < 18; i += 1) {
        const x = 80 + i * 70 + Math.sin(waveTime + i) * 10;
        this.iceFxGfx.beginPath();
        this.iceFxGfx.moveTo(x, 210 + (i % 4) * 85);
        this.iceFxGfx.lineTo(x + 22, 260 + (i % 5) * 70);
        this.iceFxGfx.strokePath();
      }
      this.iceFxGfx.fillStyle(0x1b3145, 0.92);
      this.iceFxGfx.fillCircle(640, 430, 28 + this.iceHoleProgress * 18);
      this.iceFxGfx.lineStyle(2, 0x9bd5f5, 0.45);
      this.iceFxGfx.strokeCircle(640 + Math.sin(waveTime * 1.6) * 1.6, 430 + Math.cos(waveTime * 1.8) * 1.2, 30 + this.iceHoleProgress * 18);
      this.frostVignette.alpha = 0.12;
      if (this.graphicsRuntime.particleCount > 14) {
        this.breathVaporAcc += dt;
        if (this.breathVaporAcc >= 0.18) {
          this.breathVaporAcc = 0;
          spawnParticle(this.underwaterParticlePool, 636 + (this.nextVisualRand() - 0.5) * 24, 620, (this.nextVisualRand() - 0.5) * 8, -16 - this.nextVisualRand() * 8, 2.2, 0.35, 1.2);
        }
      }
    }

    this.ambientGfx.clear();
    if (composition.layers.ambient.enabled && composition.layers.ambient.density > 0) {
      this.ambientSpawnAcc += dt;
      const ambientInterval = 1 / Math.max(1, composition.layers.ambient.density * 0.6);
      while (this.ambientSpawnAcc >= ambientInterval) {
        this.ambientSpawnAcc -= ambientInterval;
        const x = 40 + this.nextVisualRand() * (width - 80);
        const y = composition.layers.ambient.fireflies ? lakeTop + 40 + this.nextVisualRand() * 140 : lakeTop + 20 + this.nextVisualRand() * (height - lakeTop - 40);
        const vy = composition.layers.ambient.snow ? 22 + this.nextVisualRand() * 26 : composition.layers.ambient.leaves ? 28 + this.nextVisualRand() * 36 : -4 - this.nextVisualRand() * 16;
        const vx = composition.layers.ambient.fireflies ? (this.nextVisualRand() - 0.5) * 20 : (this.nextVisualRand() - 0.5) * 10;
        spawnParticle(this.ambientParticlePool, x, y, vx, vy, 1.6 + this.nextVisualRand() * 2.4, 0.3 + this.nextVisualRand() * 0.35, 1.1 + this.nextVisualRand() * 2.2);
      }
    } else {
      this.ambientSpawnAcc = 0;
    }
    updateParticles(this.ambientParticlePool, dt);
    for (let i = 0; i < this.ambientParticlePool.items.length; i += 1) {
      const p = this.ambientParticlePool.items[i];
      if (!p.active) continue;
      if (composition.layers.ambient.fireflies) {
        this.ambientGfx.fillStyle(0xfde890, p.alpha * 0.6);
      } else if (composition.layers.ambient.snow) {
        this.ambientGfx.fillStyle(0xe9f6ff, p.alpha * 0.7);
      } else if (composition.layers.ambient.leaves) {
        this.ambientGfx.fillStyle(0xd7a15f, p.alpha * 0.55);
      } else {
        this.ambientGfx.fillStyle(0xd6e8f6, p.alpha * 0.34);
      }
      this.ambientGfx.fillCircle(p.x, p.y, p.size);
    }
    if (composition.layers.ambient.mist) {
      this.ambientGfx.fillStyle(0xe3f2ff, 0.06);
      this.ambientGfx.fillEllipse(width * 0.5, lakeTop + 86 + Math.sin(waveTime * 0.4) * 3, width * 0.92, 108);
    }
    if (composition.shorelineCues.shoreVignetteAlpha > 0) {
      this.ambientGfx.fillStyle(0x0d2232, composition.shorelineCues.shoreVignetteAlpha);
      this.ambientGfx.fillRect(0, lakeTop + 8, 78, height - lakeTop);
      this.ambientGfx.fillRect(width - 78, lakeTop + 8, 78, height - lakeTop);
    }

    if (this.debugZonesEnabled) {
      this.zoneDebugGfx.clear();
      const map = this.environment.lakeDepthMap;
      this.zoneDebugGfx.fillStyle(0x7fe2aa, 0.12).fillRect(0, lakeTop, width * map.shorelineMaxX, height - lakeTop);
      this.zoneDebugGfx.fillStyle(0x8de57f, 0.12).fillRect(width * map.weedBandStartX, lakeTop, width * (map.weedBandEndX - map.weedBandStartX), height - lakeTop);
      this.zoneDebugGfx.fillStyle(0x7fc4e2, 0.08).fillRect(width * map.weedBandEndX, lakeTop, width * (map.dropoffStartX - map.weedBandEndX), height - lakeTop);
      this.zoneDebugGfx.fillStyle(0x7f85e2, 0.12).fillRect(width * map.dropoffStartX, lakeTop, width * (1 - map.dropoffStartX), height - lakeTop);
    }

    const bobberX = 640 + this.castAimOffset * 340;
    const bobberYBase = 560 - this.castDistanceNorm * 360;
    let bobberY = bobberYBase;

    if (this.phase === 'hook_window') {
      bobberY += Math.sin(visualNowMs * 0.04) * 10 + 6;
    } else if (this.phase === 'lure' || this.phase === 'reeling') {
      bobberY += Math.sin(visualNowMs * 0.012) * 4;
    }
    if (this.bobberDipSec > 0) {
      bobberY += Math.sin((1 - this.bobberDipSec / 0.18) * Math.PI) * 8;
    }

    this.bobber.setPosition(bobberX, bobberY);
    this.bobberCap.setPosition(bobberX, bobberY - 6);

    this.lureGfx.clear();
    const lureSkinId = this.progression.cosmetics.lureSkinByLureId[this.progression.loadout.lureId] ?? this.cosmeticsCatalog.lureSkins[0].id;
    const lureSkin = this.cosmeticsCatalog.lureSkins.find((entry) => entry.id === lureSkinId) ?? this.cosmeticsCatalog.lureSkins[0];
    const lurePrimary = Number.parseInt(lureSkin.palette[0].slice(1), 16);
    const lureAccent = Number.parseInt(lureSkin.palette[1].slice(1), 16);
    this.lureGfx.fillStyle(lurePrimary, 0.95);
    this.lureGfx.fillEllipse(bobberX + 13, bobberY + 11, 16, 6);
    this.lureGfx.fillStyle(lureAccent, 0.8);
    this.lureGfx.fillCircle(bobberX + 18, bobberY + 10, 1.8);
    this.lureGfx.lineStyle(1, lureAccent, 0.65);
    this.lureGfx.beginPath();
    this.lureGfx.moveTo(bobberX + 6, bobberY + 8);
    this.lureGfx.lineTo(bobberX + 12, bobberY + 10);
    this.lureGfx.strokePath();

    const tightness = this.castSession?.reelState.lineTightness ?? 0.35;
    const tension = this.castSession?.reelState.tension ?? 0;
    this.lineTintLerp += ((tension > 0.85 ? 1 : 0) - this.lineTintLerp) * (1 - Math.exp(-dt * 9));
    this.lineWidthLerp += (((1 + tightness * 2.6 + tension * 1.4) * (this.graphicsSettings.effectsQuality === 'high' ? 1 : 0.85)) - this.lineWidthLerp) * (1 - Math.exp(-dt * 10));
    this.lineGfx.clear();
    const warm = Math.floor(196 + this.lineTintLerp * 58);
    const cool = Math.floor(230 - this.lineTintLerp * 84);
    const lineColor = Phaser.Display.Color.GetColor(warm, cool, cool);
    this.lineGfx.lineStyle(this.lineWidthLerp, lineColor, 0.5 + tightness * 0.45);
    this.lineGfx.beginPath();
    this.lineGfx.moveTo(640, 640);
    this.lineGfx.lineTo(bobberX, bobberY);
    this.lineGfx.strokePath();

    this.tensionGlow.alpha = clamp((tension - 0.85) * 0.9, 0, 0.18);
    if (this.hookedFish) {
      const hookedY = this.jumpVisualActive ? bobberY - this.jumpVisualY : bobberY + 7;
      this.fishRender.renderHooked(this.fishGfx, this.hookedFish, bobberX, hookedY, waveTime);
      if (this.jumpVisualActive) {
        this.splashGfx.fillStyle(0xe9f8ff, 0.45 + (1 - this.jumpVisualT) * 0.2);
        this.splashGfx.fillCircle(bobberX, bobberY + 3, 2 + this.jumpVisualT * 3.5);
      }
    }
    if (this.hookedFish?.fish.rarityTier === 'Legendary' && this.graphicsRuntime.enableLegendaryAura) {
      this.rippleGfx.lineStyle(1.7, 0xffe1a1, 0.26 + Math.sin(waveTime * 5) * 0.05);
      this.rippleGfx.strokeCircle(this.bobber.x, this.bobber.y, 18 + Math.sin(waveTime * 4) * 2);
    }
  }

  private refreshHud(): void {
    const modeName = MODE_LABELS[this.mode];
    const timerText = this.mode === 'timed_derby' ? mmss(this.timerSec) : '--:--';
    const fishOnHook = this.hookedFish ? `${this.hookedFish.fish.name} ${fmtLb(this.hookedFish.weightLb)}` : 'None';

    const eventLabel = this.weeklyEventEnabled ? this.currentWeeklyEvent.name : 'Event Off';
    this.topHud.setText(`Mode: ${modeName}   Time: ${timerText}   Season: ${this.currentSeason.name}   Event: ${eventLabel}`);
    this.topSubHud.setText(`On Hook: ${fishOnHook}   Spot: ${this.selectedSpot.name}   Zone: ${this.currentZone}   Depth: ${this.currentDepth}   ${this.weather}/${this.timeOfDay}`);

    this.modeButton.setText(`Mode: ${modeName}`);
    this.weatherButton.setText(`Weather: ${this.weather}`);
    this.timeButton.setText(`Time: ${this.timeOfDay}`);
    this.assistButton.setText(`Assist: ${this.castAssistEnabled ? 'On' : 'Off'}`);
    this.spotButton.setText(`Spot: ${this.selectedSpot.name}`);
    this.seasonButton.setText(`Season: ${this.currentSeason.name}`);
    this.eventButton.setText(`Event: ${eventLabel}`);

    const tension = this.castSession?.reelState.tension ?? 0;
    const staminaRatio = this.hookedFish ? clamp(this.hookedFish.stamina / Math.max(1, this.hookedFish.staminaMax), 0, 1) : 0;
    const lineTight = this.castSession?.reelState.lineTightness ?? 0;

    this.tensionFill.width = 520 * clamp(tension, 0, 1);
    this.tensionFill.fillColor = tension > 0.82 ? 0xff6b6b : tension < 0.2 ? 0x7ad5ff : 0x89d6ff;
    this.staminaFill.width = 520 * staminaRatio;
    this.lineTightFill.width = 520 * lineTight;

    const reelStatus = this.phase === 'reeling' ? (this.isReeling ? 'reeling' : 'pause') : 'idle';
    this.reelLabel.setText(`Reel: ${reelStatus} | Tension ${(tension * 100).toFixed(0)}% | Tight ${(lineTight * 100).toFixed(0)}%`);

    const challengeLines = this.progression.daily.challenges.slice(0, 3).map((c, i) => `${i + 1}. ${c.progress.toFixed(1)}/${c.target} ${c.completed ? 'x' : '-'} ${c.name}`);
    this.sideHud.setText(
      [
        'Session',
        `Score: ${fmtLb(this.totalWeightCaught)}`,
        `Biggest: ${fmtLb(this.biggestCatch)}`,
        `Catches: ${this.catchesInRound}`,
        '',
        'Daily Challenges',
        ...challengeLines,
        '',
        'Graphics',
        `${this.graphicsSettings.effectsQuality}/${this.graphicsSettings.environmentDetail}/${this.graphicsSettings.waterDetail}/${this.graphicsSettings.particleDensity}`,
        this.heavyEffectsAutoDisabled ? 'Auto: Performance mode' : 'Auto: Normal',
        '',
        'Sighting',
        this.sightingHint?.text ?? '-'
      ].join('\n')
    );

    if (this.photoMode.active) {
      this.messageHud.setText('Photo Mode: +/- zoom, arrows pan, F filter, U UI, I info, E export, Esc exit.');
    }
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled) return;
    if (this.reducedMotion) return;
    triggerHaptic(pattern);
  }
}
