export type EffectsQuality = 'low' | 'medium' | 'high';
export type WaterDetail = 'off' | 'basic' | 'enhanced';
export type ParticleDensity = 'low' | 'normal';
export type EnvironmentDetail = 'off' | 'basic' | 'enhanced';

export interface OzarkGraphicsSettings {
  effectsQuality: EffectsQuality;
  waterDetail: WaterDetail;
  particleDensity: ParticleDensity;
  environmentDetail: EnvironmentDetail;
  reducedMotion: boolean;
  legendaryAura: boolean;
  showFpsCounter: boolean;
}

export interface OzarkGraphicsRuntime {
  waveLayers: number;
  waveAmplitudeScale: number;
  rippleAlpha: number;
  particleCount: number;
  lightShafts: boolean;
  caustics: boolean;
  enableCameraShake: boolean;
  enableLegendaryAura: boolean;
}

const STORAGE_KEY = 'gamegrid.ozark-fishing.graphics.v1';

const DEFAULT_SETTINGS: OzarkGraphicsSettings = {
  effectsQuality: 'high',
  waterDetail: 'enhanced',
  particleDensity: 'normal',
  environmentDetail: 'enhanced',
  reducedMotion: false,
  legendaryAura: true,
  showFpsCounter: false
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function defaultGraphicsSettings(): OzarkGraphicsSettings {
  return { ...DEFAULT_SETTINGS };
}

export function loadGraphicsSettings(): OzarkGraphicsSettings {
  try {
    if (typeof localStorage === 'undefined') return defaultGraphicsSettings();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGraphicsSettings();
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return defaultGraphicsSettings();

    const effectsQuality = parsed.effectsQuality === 'low' || parsed.effectsQuality === 'medium' || parsed.effectsQuality === 'high' ? parsed.effectsQuality : DEFAULT_SETTINGS.effectsQuality;
    const waterDetail = parsed.waterDetail === 'off' || parsed.waterDetail === 'basic' || parsed.waterDetail === 'enhanced' ? parsed.waterDetail : DEFAULT_SETTINGS.waterDetail;
    const particleDensity = parsed.particleDensity === 'low' || parsed.particleDensity === 'normal' ? parsed.particleDensity : DEFAULT_SETTINGS.particleDensity;
    const environmentDetail =
      parsed.environmentDetail === 'off' || parsed.environmentDetail === 'basic' || parsed.environmentDetail === 'enhanced'
        ? parsed.environmentDetail
        : DEFAULT_SETTINGS.environmentDetail;

    return {
      effectsQuality,
      waterDetail,
      particleDensity,
      environmentDetail,
      reducedMotion: parsed.reducedMotion === true,
      legendaryAura: parsed.legendaryAura !== false,
      showFpsCounter: parsed.showFpsCounter === true
    };
  } catch {
    return defaultGraphicsSettings();
  }
}

export function saveGraphicsSettings(settings: OzarkGraphicsSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function buildGraphicsRuntime(settings: OzarkGraphicsSettings, autoLowPerf = false, systemReducedMotion = false): OzarkGraphicsRuntime {
  const effectiveQuality: EffectsQuality = autoLowPerf ? 'low' : settings.effectsQuality;
  const reducedMotion = systemReducedMotion || settings.reducedMotion;

  const waveLayers = settings.waterDetail === 'off' ? 0 : settings.waterDetail === 'basic' ? 2 : effectiveQuality === 'high' ? 3 : 2;
  const particleCount = effectiveQuality === 'high' ? (settings.particleDensity === 'normal' ? 48 : 28) : settings.particleDensity === 'normal' ? 24 : 14;

  return {
    waveLayers,
    waveAmplitudeScale: effectiveQuality === 'high' ? 1 : effectiveQuality === 'medium' ? 0.78 : 0.56,
    rippleAlpha: settings.waterDetail === 'off' ? 0 : effectiveQuality === 'high' ? 0.28 : 0.18,
    particleCount,
    lightShafts: settings.waterDetail !== 'off' && effectiveQuality !== 'low',
    caustics: settings.waterDetail === 'enhanced' && effectiveQuality === 'high',
    enableCameraShake: !reducedMotion,
    enableLegendaryAura: settings.legendaryAura && !reducedMotion
  };
}

export function shouldApplyCameraShake(settings: OzarkGraphicsSettings, systemReducedMotion = false): boolean {
  return !settings.reducedMotion && !systemReducedMotion;
}

export function cycleEffectsQuality(current: EffectsQuality): EffectsQuality {
  if (current === 'low') return 'medium';
  if (current === 'medium') return 'high';
  return 'low';
}

export function cycleWaterDetail(current: WaterDetail): WaterDetail {
  if (current === 'off') return 'basic';
  if (current === 'basic') return 'enhanced';
  return 'off';
}

export function cycleParticleDensity(current: ParticleDensity): ParticleDensity {
  return current === 'low' ? 'normal' : 'low';
}

export function cycleEnvironmentDetail(current: EnvironmentDetail): EnvironmentDetail {
  if (current === 'off') return 'basic';
  if (current === 'basic') return 'enhanced';
  return 'off';
}
