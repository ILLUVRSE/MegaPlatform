export type CinematicCameraMode = 'off' | 'subtle' | 'full';

export interface OzarkCinematicSettings {
  cameraMode: CinematicCameraMode;
  cinematicSlowMo: boolean;
  musicVolume: number;
  sfxVolume: number;
  dynamicMix: boolean;
}

export interface OzarkCinematicRuntime {
  cameraMode: CinematicCameraMode;
  slowMoEnabled: boolean;
  transitionsEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  dynamicMix: boolean;
}

const STORAGE_KEY = 'gamegrid.ozark-fishing.cinematic.v1';

const DEFAULT_SETTINGS: OzarkCinematicSettings = {
  cameraMode: 'subtle',
  cinematicSlowMo: true,
  musicVolume: 0.64,
  sfxVolume: 0.82,
  dynamicMix: true
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(1, value));
}

export function defaultCinematicSettings(): OzarkCinematicSettings {
  return { ...DEFAULT_SETTINGS };
}

export function loadCinematicSettings(): OzarkCinematicSettings {
  try {
    if (typeof localStorage === 'undefined') return defaultCinematicSettings();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCinematicSettings();
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return defaultCinematicSettings();

    const cameraMode = parsed.cameraMode === 'off' || parsed.cameraMode === 'subtle' || parsed.cameraMode === 'full' ? parsed.cameraMode : DEFAULT_SETTINGS.cameraMode;
    const musicVolume = clamp01(Number(parsed.musicVolume), DEFAULT_SETTINGS.musicVolume);
    const sfxVolume = clamp01(Number(parsed.sfxVolume), DEFAULT_SETTINGS.sfxVolume);

    return {
      cameraMode,
      cinematicSlowMo: parsed.cinematicSlowMo !== false,
      musicVolume,
      sfxVolume,
      dynamicMix: parsed.dynamicMix !== false
    };
  } catch {
    return defaultCinematicSettings();
  }
}

export function saveCinematicSettings(settings: OzarkCinematicSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function resolveCinematicRuntime(
  settings: OzarkCinematicSettings,
  reducedMotion: boolean,
  autoLowPerf = false
): OzarkCinematicRuntime {
  const forceMinimal = reducedMotion || autoLowPerf;
  return {
    cameraMode: reducedMotion ? 'off' : settings.cameraMode,
    slowMoEnabled: settings.cinematicSlowMo && !forceMinimal,
    transitionsEnabled: !forceMinimal,
    musicVolume: settings.musicVolume,
    sfxVolume: settings.sfxVolume,
    dynamicMix: settings.dynamicMix
  };
}

export function cycleCinematicCameraMode(current: CinematicCameraMode): CinematicCameraMode {
  if (current === 'off') return 'subtle';
  if (current === 'subtle') return 'full';
  return 'off';
}
