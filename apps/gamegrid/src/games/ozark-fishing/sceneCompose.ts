import envRaw from '../../content/ozark-environment-visuals.json';
import type { EffectsQuality } from './graphicsSettings';
import type { SpotId, TimeOfDay, WeatherType } from './types';

export type SeasonId = 'spring' | 'summer' | 'fall' | 'winter';
export type EnvironmentDetail = 'off' | 'basic' | 'enhanced';
export type SkyPhase = 'day' | 'sunset' | 'night' | 'dawn';
export type LayerType =
  | 'sky_gradient'
  | 'distant_treeline'
  | 'midground_shoreline'
  | 'water_reflection_overlay'
  | 'foreground_props'
  | 'ambient_particles';

export interface ComposeSceneInput {
  sessionSeed: number;
  spotId: SpotId;
  seasonId: SeasonId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  effectsQuality: EffectsQuality;
  environmentDetail: EnvironmentDetail;
  reducedMotion: boolean;
  lowPerfFallback: boolean;
}

export interface SceneLayer {
  type: LayerType;
  enabled: boolean;
  quality: EffectsQuality;
}

export interface SkyGradientLayer extends SceneLayer {
  type: 'sky_gradient';
  phase: SkyPhase;
  topColor: number;
  bottomColor: number;
}

export interface TreelineLayer extends SceneLayer {
  type: 'distant_treeline';
  silhouetteId: string;
  color: number;
  horizonY: number;
}

export interface MidgroundShorelineLayer extends SceneLayer {
  type: 'midground_shoreline';
  shorelineId: string;
  color: number;
  y: number;
}

export interface ReflectionLayer extends SceneLayer {
  type: 'water_reflection_overlay';
  tintColor: number;
  alpha: number;
  shimmer: boolean;
}

export interface ForegroundPropPlacement {
  kind: string;
  xNorm: number;
  yNorm: number;
  scale: number;
  alpha: number;
  variant: number;
}

export interface ForegroundPropsLayer extends SceneLayer {
  type: 'foreground_props';
  props: ForegroundPropPlacement[];
}

export interface AmbientParticleLayer extends SceneLayer {
  type: 'ambient_particles';
  mist: boolean;
  fireflies: boolean;
  snow: boolean;
  leaves: boolean;
  density: number;
}

export interface CloudInstance {
  xNorm: number;
  yNorm: number;
  scale: number;
  alpha: number;
  variant: 0 | 1 | 2;
  parallax: 0 | 1;
  speed: number;
}

export interface ShorelineDepthCues {
  shallowBandColor: number;
  shallowBandAlpha: number;
  bottomTextureAlpha: number;
  shoreVignetteAlpha: number;
  submergedGrass: boolean;
  currentStreaks: number;
}

export interface SceneComposition {
  layers: {
    sky: SkyGradientLayer;
    treeline: TreelineLayer;
    shoreline: MidgroundShorelineLayer;
    reflection: ReflectionLayer;
    foreground: ForegroundPropsLayer;
    ambient: AmbientParticleLayer;
  };
  clouds: CloudInstance[];
  shorelineCues: ShorelineDepthCues;
  spotPreview: {
    image: string;
    tintColor: number;
    title: string;
  };
  photoPackId: string;
  objectCount: number;
  objectLimit: number;
  animateClouds: boolean;
}

interface SpotEnvProfile {
  signatureProps: string[];
  distantSilhouette: string;
  midground: string;
  previewImage: string;
}

interface EnvCatalog {
  spots: Record<SpotId, SpotEnvProfile>;
  seasonalPalette: Record<SeasonId, { tint: string; skyBias: number }>;
}

const ENV = envRaw as EnvCatalog;
const MAX_OBJECTS = 220;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const m = clamp(t, 0, 1);
  const r = Math.round(ar + (br - ar) * m);
  const g = Math.round(ag + (bg - ag) * m);
  const bl = Math.round(ab + (bb - ab) * m);
  return (r << 16) | (g << 8) | bl;
}

function parseHexColor(hex: string, fallback: number): number {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '';
  if (!normalized) return fallback;
  return Number.parseInt(normalized, 16);
}

function hashString(input: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function inferSkyPhase(input: ComposeSceneInput, rng: () => number): SkyPhase {
  if (input.timeOfDay === 'night') return 'night';
  if (input.seasonId === 'winter') return 'dawn';
  if (input.seasonId === 'fall' && input.weather !== 'light_rain') return 'sunset';
  if (input.seasonId === 'spring' && rng() > 0.46) return 'dawn';
  return 'day';
}

function resolveEffectiveQuality(input: ComposeSceneInput): EffectsQuality {
  if (input.lowPerfFallback || input.environmentDetail === 'off') return 'low';
  if (input.effectsQuality === 'high' && input.environmentDetail === 'enhanced') return 'high';
  return input.effectsQuality === 'low' ? 'low' : 'medium';
}

function qualityPropBudget(quality: EffectsQuality, detail: EnvironmentDetail): number {
  if (detail === 'off') return 2;
  if (quality === 'low') return detail === 'basic' ? 5 : 7;
  if (quality === 'medium') return detail === 'enhanced' ? 12 : 9;
  return detail === 'enhanced' ? 18 : 13;
}

function qualityParticleDensity(quality: EffectsQuality, detail: EnvironmentDetail): number {
  if (detail === 'off' || quality === 'low') return 0;
  if (quality === 'medium') return detail === 'enhanced' ? 8 : 5;
  return detail === 'enhanced' ? 14 : 9;
}

function skyBaseColors(phase: SkyPhase, weather: WeatherType): { top: number; bottom: number } {
  if (phase === 'night') return { top: 0x061526, bottom: 0x1a304a };
  if (phase === 'sunset') return { top: 0xd68254, bottom: 0xf3c38d };
  if (phase === 'dawn') return { top: 0x7ba8ca, bottom: 0xe8c7a4 };
  if (weather === 'overcast') return { top: 0x8099ab, bottom: 0xb7c7d3 };
  if (weather === 'light_rain') return { top: 0x6e8fa8, bottom: 0x9db6c7 };
  return { top: 0x8cc9ef, bottom: 0xcbeeff };
}

function shouldEnableAmbientFx(input: ComposeSceneInput) {
  const reduced = input.reducedMotion || input.lowPerfFallback || input.environmentDetail === 'off';
  const isSummerNight = input.seasonId === 'summer' && input.timeOfDay === 'night';
  const isDawnMist = input.timeOfDay === 'day' && (input.seasonId === 'spring' || input.seasonId === 'fall');
  const isWinter = input.seasonId === 'winter';
  const fallLeaves = input.seasonId === 'fall' && input.timeOfDay === 'day';
  return {
    mist: !reduced && (isDawnMist || isWinter),
    fireflies: !reduced && isSummerNight,
    snow: !reduced && isWinter,
    leaves: !reduced && fallLeaves
  };
}

export function composeScene(input: ComposeSceneInput): SceneComposition {
  const spotProfile = ENV.spots[input.spotId] ?? ENV.spots.cove;
  const seasonPalette = ENV.seasonalPalette[input.seasonId] ?? { tint: '#9fc6dd', skyBias: 0 };
  const seed = hashString(`${input.sessionSeed}|${input.spotId}|${input.seasonId}|${input.weather}|${input.timeOfDay}`);
  const rng = createRng(seed);
  const quality = resolveEffectiveQuality(input);
  const particleDensity = qualityParticleDensity(quality, input.environmentDetail);
  const propBudget = qualityPropBudget(quality, input.environmentDetail);
  const phase = inferSkyPhase(input, rng);
  const sky = skyBaseColors(phase, input.weather);
  const tintColor = parseHexColor(seasonPalette.tint, 0x9fc6dd);
  const weatherMute = input.weather === 'overcast' ? 0.2 : input.weather === 'light_rain' ? 0.14 : 0;

  const skyTop = mixHex(sky.top, tintColor, clamp(0.13 + seasonPalette.skyBias, 0, 0.35));
  const skyBottom = mixHex(sky.bottom, tintColor, clamp(0.08 + seasonPalette.skyBias * 0.8, 0, 0.28));
  const treelineColor = mixHex(0x1f3d32, tintColor, 0.2 + weatherMute);
  const shorelineColor = mixHex(0x3f5b4f, tintColor, 0.22 + weatherMute);

  const clouds: CloudInstance[] = [];
  const cloudCount = quality === 'high' ? 7 : quality === 'medium' ? 4 : 2;
  for (let i = 0; i < cloudCount; i += 1) {
    clouds.push({
      xNorm: rng(),
      yNorm: 0.06 + rng() * 0.28,
      scale: 0.7 + rng() * 1.1,
      alpha: quality === 'low' ? 0.12 : 0.16 + rng() * 0.2,
      variant: Math.floor(rng() * 3) as 0 | 1 | 2,
      parallax: i % 2 === 0 ? 0 : 1,
      speed: input.reducedMotion ? 0 : (i % 2 === 0 ? 0.004 : 0.009)
    });
  }

  const props: ForegroundPropPlacement[] = [];
  const signatures = spotProfile.signatureProps;
  for (let i = 0; i < propBudget; i += 1) {
    const source = i < signatures.length ? signatures[i] : signatures[Math.floor(rng() * signatures.length)] ?? 'rock';
    props.push({
      kind: source,
      xNorm: 0.06 + rng() * 0.88,
      yNorm: 0.72 + rng() * 0.24,
      scale: 0.68 + rng() * 0.8,
      alpha: 0.58 + rng() * 0.34,
      variant: Math.floor(rng() * 3)
    });
  }

  const ambientFx = shouldEnableAmbientFx(input);
  const reflectionAlphaBase = phase === 'night' ? 0.11 : phase === 'sunset' ? 0.14 : phase === 'dawn' ? 0.12 : 0.09;
  const objectCount = clouds.length + props.length + particleDensity;

  return {
    layers: {
      sky: {
        type: 'sky_gradient',
        enabled: true,
        quality,
        phase,
        topColor: skyTop,
        bottomColor: skyBottom
      },
      treeline: {
        type: 'distant_treeline',
        enabled: true,
        quality,
        silhouetteId: spotProfile.distantSilhouette,
        color: treelineColor,
        horizonY: input.spotId === 'open-water' ? 0.27 : input.spotId === 'river-mouth' ? 0.24 : 0.22
      },
      shoreline: {
        type: 'midground_shoreline',
        enabled: input.environmentDetail !== 'off',
        quality,
        shorelineId: spotProfile.midground,
        color: shorelineColor,
        y: input.spotId === 'open-water' ? 0.37 : 0.34
      },
      reflection: {
        type: 'water_reflection_overlay',
        enabled: true,
        quality,
        tintColor: phase === 'night' ? 0xcbe4ff : phase === 'sunset' ? 0xffd2a0 : 0xfff3d6,
        alpha: input.weather === 'light_rain' ? reflectionAlphaBase * 0.62 : reflectionAlphaBase,
        shimmer: !input.reducedMotion && !input.lowPerfFallback
      },
      foreground: {
        type: 'foreground_props',
        enabled: props.length > 0,
        quality,
        props
      },
      ambient: {
        type: 'ambient_particles',
        enabled: particleDensity > 0,
        quality,
        mist: ambientFx.mist,
        fireflies: ambientFx.fireflies,
        snow: ambientFx.snow,
        leaves: ambientFx.leaves,
        density: particleDensity
      }
    },
    clouds,
    shorelineCues: {
      shallowBandColor: mixHex(0x72b6d7, tintColor, 0.25),
      shallowBandAlpha: quality === 'low' ? 0.08 : 0.14,
      bottomTextureAlpha: quality === 'high' ? 0.16 : quality === 'medium' ? 0.1 : 0.04,
      shoreVignetteAlpha: input.environmentDetail === 'off' ? 0 : quality === 'high' ? 0.19 : 0.12,
      submergedGrass: input.environmentDetail === 'enhanced' && input.spotId === 'cove',
      currentStreaks: input.spotId === 'river-mouth' ? (quality === 'high' ? 10 : quality === 'medium' ? 6 : 3) : 0
    },
    spotPreview: {
      image: spotProfile.previewImage,
      tintColor,
      title: input.spotId
    },
    photoPackId: `env-${input.spotId}-${input.seasonId}-${phase}-${input.weather}`,
    objectCount,
    objectLimit: MAX_OBJECTS,
    animateClouds: !input.reducedMotion && !input.lowPerfFallback && quality !== 'low'
  };
}

export function shouldDisableAnimatedEnvironment(input: Pick<ComposeSceneInput, 'reducedMotion' | 'lowPerfFallback'>): boolean {
  return input.reducedMotion || input.lowPerfFallback;
}
