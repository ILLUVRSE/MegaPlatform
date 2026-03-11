export type OzSkinId = 'engraved-paper' | 'night-ink' | 'field-bloom';
export type EffectsQuality = 'low' | 'med' | 'high';
export type ParticleDensity = 'low' | 'normal';
export type BackgroundDetail = 'off' | 'basic' | 'enhanced';

export interface OzVisualSettings {
  skin: OzSkinId;
  effectsQuality: EffectsQuality;
  particleDensity: ParticleDensity;
  backgroundDetail: BackgroundDetail;
  reducedMotion: boolean;
  autoFallbackApplied: boolean;
}

const VISUAL_KEY = 'gamegrid.oz-chronicle.visual.v1';

const DEFAULTS: OzVisualSettings = {
  skin: 'engraved-paper',
  effectsQuality: 'high',
  particleDensity: 'normal',
  backgroundDetail: 'enhanced',
  reducedMotion: false,
  autoFallbackApplied: false
};

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function asSkin(value: unknown): OzSkinId {
  if (value === 'night-ink' || value === 'field-bloom' || value === 'engraved-paper') return value;
  return DEFAULTS.skin;
}

function asEffects(value: unknown): EffectsQuality {
  if (value === 'low' || value === 'med' || value === 'high') return value;
  return DEFAULTS.effectsQuality;
}

function asDensity(value: unknown): ParticleDensity {
  if (value === 'low' || value === 'normal') return value;
  return DEFAULTS.particleDensity;
}

function asBackground(value: unknown): BackgroundDetail {
  if (value === 'off' || value === 'basic' || value === 'enhanced') return value;
  return DEFAULTS.backgroundDetail;
}

export function defaultVisualSettings(reducedMotion = false): OzVisualSettings {
  return {
    ...DEFAULTS,
    reducedMotion
  };
}

export function loadVisualSettings(reducedMotionMirror: boolean): OzVisualSettings {
  const storage = getStorage();
  if (!storage) return defaultVisualSettings(reducedMotionMirror);

  try {
    const raw = storage.getItem(VISUAL_KEY);
    if (!raw) return defaultVisualSettings(reducedMotionMirror);
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return defaultVisualSettings(reducedMotionMirror);

    return {
      skin: asSkin(parsed.skin),
      effectsQuality: asEffects(parsed.effectsQuality),
      particleDensity: asDensity(parsed.particleDensity),
      backgroundDetail: asBackground(parsed.backgroundDetail),
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : reducedMotionMirror,
      autoFallbackApplied: !!parsed.autoFallbackApplied
    };
  } catch {
    return defaultVisualSettings(reducedMotionMirror);
  }
}

export function saveVisualSettings(settings: OzVisualSettings): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(VISUAL_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
}

export function degradeVisualSettings(settings: OzVisualSettings): OzVisualSettings {
  if (settings.effectsQuality === 'high') {
    return {
      ...settings,
      effectsQuality: 'med',
      backgroundDetail: settings.backgroundDetail === 'enhanced' ? 'basic' : settings.backgroundDetail,
      autoFallbackApplied: true
    };
  }

  if (settings.effectsQuality === 'med') {
    return {
      ...settings,
      effectsQuality: 'low',
      particleDensity: 'low',
      backgroundDetail: 'off',
      autoFallbackApplied: true
    };
  }

  return settings;
}
