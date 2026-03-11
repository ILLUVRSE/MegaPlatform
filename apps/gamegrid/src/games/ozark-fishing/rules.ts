import luresRaw from '../../content/ozark-lures.json';
import { depthBiasForSpot, resolveDepthZone } from './environment';
import { computeFishInterestScore } from './fish';
import type {
  BiteContext,
  CastResult,
  CastSessionEvent,
  CastSessionState,
  EnvironmentDefinition,
  HookResult,
  LineDefinition,
  LureDefinition,
  ReelDefinition,
  ReelState,
  ReelStepInput,
  RodDefinition,
  SpotDefinition
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isDepth(value: unknown): value is 'shallow' | 'mid' | 'deep' {
  return value === 'shallow' || value === 'mid' || value === 'deep';
}

function isLureDefinition(value: unknown): value is LureDefinition {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.sinkRate === 'number' &&
    value.sinkRate > 0 &&
    typeof value.biteMultiplier === 'number' &&
    value.biteMultiplier > 0 &&
    typeof value.detectability === 'number' &&
    value.detectability > 0 &&
    typeof value.depthBehavior === 'string' &&
    value.depthBehavior.length > 0 &&
    isRecord(value.speciesAffinity) &&
    Object.values(value.speciesAffinity).every((v) => typeof v === 'number') &&
    isDepth(value.preferredDepth)
  );
}

export function loadLureCatalog(): LureDefinition[] {
  const parsed = luresRaw as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('ozark-lures.json must export an array.');
  }

  const lures = parsed.filter(isLureDefinition);
  if (lures.length < 20) {
    throw new Error(`Ozark Fishing requires at least 20 valid lures. Found ${lures.length}.`);
  }

  const ids = new Set<string>();
  for (let i = 0; i < lures.length; i += 1) {
    if (ids.has(lures[i].id)) throw new Error(`Duplicate lure id in ozark-lures.json: ${lures[i].id}`);
    ids.add(lures[i].id);
  }

  return lures;
}

export function computeCastFromSwipe(dx: number, dy: number, castAssistEnabled: boolean): CastResult {
  const upImpulse = Math.max(0, -dy);
  const rawPower = clamp(upImpulse / 420, 0, 1);
  const assistBoost = castAssistEnabled ? 0.08 : 0;
  const power = clamp(rawPower + assistBoost, 0, 1);
  const distanceNorm = clamp(0.08 + power * 0.88, 0.08, 1);
  const aimOffset = clamp(dx / 360, -0.32, 0.32);

  return {
    power,
    distanceNorm,
    aimOffset
  };
}

export function resolveLureDepth(distanceNorm: number, elapsedSec: number, sinkRate: number, env: EnvironmentDefinition, spot: SpotDefinition): 'shallow' | 'mid' | 'deep' {
  const sinkProgress = clamp(elapsedSec * sinkRate, 0, 1);
  const travelPenalty = (1 - clamp(distanceNorm, 0, 1)) * 0.12;
  const baseDepth = resolveDepthZone(clamp(sinkProgress - travelPenalty, 0, 1), env);
  const tweak = depthBiasForSpot(spot, baseDepth);
  if (tweak > 1.2 && baseDepth === 'mid') return 'deep';
  if (tweak > 1.25 && baseDepth === 'shallow') return 'mid';
  if (tweak < 0.82 && baseDepth === 'deep') return 'mid';
  if (tweak < 0.82 && baseDepth === 'mid') return 'shallow';
  return baseDepth;
}

export function computeBiteChancePerSecond(context: BiteContext): number {
  const env = context.environment;
  const baseInterest = computeFishInterestScore({ ...context, lureDistanceNorm: 0 });

  let weatherDepthBoost = 1;
  if (context.weather === 'light_rain' && (context.fish.id === 'largemouth-bass' || context.fish.id === 'smallmouth-bass')) {
    weatherDepthBoost *= 1.18;
  }
  if (context.weather === 'overcast' && context.depth === 'mid') {
    weatherDepthBoost *= 1.16;
  }
  if (context.weather === 'sunny' && context.depth === 'shallow') {
    weatherDepthBoost *= 0.82;
  }

  const spotWeather = context.spot.weatherBoosts?.[context.weather] ?? 1;
  const spotTime = context.spot.timeBoosts?.[context.timeOfDay] ?? 1;

  return clamp(
    env.baseBiteChancePerSecond *
      env.weatherMultipliers[context.weather] *
      env.timeMultipliers[context.timeOfDay] *
      context.lure.biteMultiplier *
      baseInterest *
      weatherDepthBoost *
      spotWeather *
      spotTime,
    0.002,
    0.5
  );
}

export function evaluateHookTiming(offsetFromWindowCenterMs: number, windowMs: number, hookForgiveness = 1): HookResult {
  const halfWindow = Math.max(30, (windowMs * clamp(hookForgiveness, 0.8, 1.4)) / 2);
  const absOffset = Math.abs(offsetFromWindowCenterMs);

  if (absOffset > halfWindow) {
    return {
      success: false,
      quality: 'poor',
      offsetMs: offsetFromWindowCenterMs
    };
  }

  if (absOffset <= halfWindow * 0.24) {
    return {
      success: true,
      quality: 'perfect',
      offsetMs: offsetFromWindowCenterMs
    };
  }

  if (absOffset <= halfWindow * 0.7) {
    return {
      success: true,
      quality: 'good',
      offsetMs: offsetFromWindowCenterMs
    };
  }

  return {
    success: true,
    quality: 'poor',
    offsetMs: offsetFromWindowCenterMs
  };
}

export function createReelState(initialStamina: number): ReelState {
  return {
    tension: 0.36,
    lineTightness: 0.5,
    fishStamina: Math.max(1, initialStamina),
    slackMs: 0,
    notReelingMs: 0,
    outcome: 'active'
  };
}

export function stepReelState(state: ReelState, input: ReelStepInput): ReelState {
  if (state.outcome !== 'active') return state;

  const dt = clamp(input.dtSec, 0, 0.1);
  const reelPower = clamp(input.reelPower, 0, 1);
  const fishPull = clamp(input.fishPull, 0, 2.4);
  const rodFlex = clamp(input.rodFlexMultiplier, 0.65, 1.3);
  const drag = clamp(input.dragSetting, 0.1, 1.2);
  const snapThreshold = clamp(input.snapThresholdMultiplier ?? 1, 0.75, 1.5);
  const slackRecovery = clamp(input.slackRecoveryMultiplier ?? 1, 0.75, 1.6);

  const nonlinearRun = Math.pow(fishPull, 1.5) * 0.36;
  const dragDamp = 1 - drag * 0.42;
  const flexDamp = 1 - (1 - rodFlex) * 0.45;
  const rise = nonlinearRun * dragDamp * flexDamp;
  const release = Math.pow(reelPower, 1.18) * (0.34 + drag * 0.25);
  const baseRelax = Math.max(0, 0.16 - fishPull * 0.08);

  let tension = state.tension + (rise - release - baseRelax) * dt;
  tension = clamp(tension, 0, 1.4);

  let fishStamina = state.fishStamina;
  fishStamina -= reelPower * dt * (16 + drag * 7);
  fishStamina += Math.max(0, fishPull - reelPower * 0.8) * dt * 3.5;
  fishStamina = Math.max(0, fishStamina);

  const notReelingMs = reelPower < 0.08 ? state.notReelingMs + dt * 1000 : Math.max(0, state.notReelingMs - dt * 900);
  let slackMs = tension < 0.2 ? state.slackMs + dt * 1000 : Math.max(0, state.slackMs - dt * 750 * slackRecovery);

  if (notReelingMs > 900) {
    slackMs += dt * 650;
  }

  const lineTightness = clamp(0.2 + tension * 0.95 - slackMs / 4200, 0, 1);

  let outcome: ReelState['outcome'] = 'active';
  if (tension >= 1 * snapThreshold) {
    outcome = 'snapped';
  } else if (slackMs >= 1700) {
    outcome = 'escaped';
  } else if (fishStamina <= 0 && tension > 0.24 && tension < 0.9 * snapThreshold && reelPower > 0.05) {
    outcome = 'landed';
  }

  return {
    tension,
    lineTightness,
    fishStamina,
    slackMs,
    notReelingMs,
    outcome
  };
}

export function computeLoadoutModifiers(rod: RodDefinition, reel: ReelDefinition, line: LineDefinition) {
  return {
    rodFlexMultiplier: clamp(1 - (rod.flexDamping - 1) * 0.2, 0.62, 1.12),
    hookForgiveness: clamp(rod.hookForgiveness, 0.85, 1.4),
    dragSetting: clamp(0.48 * reel.dragStability, 0.2, 1.2),
    reelPowerScale: clamp(0.82 + (reel.reelSpeed - 1) * 0.7, 0.6, 1.4),
    slackRecoveryMultiplier: clamp(reel.slackRecovery, 0.75, 1.5),
    snapThresholdMultiplier: clamp(line.snapThreshold * line.abrasionResistance * 0.94, 0.78, 1.5),
    lineVisibilityPenalty: clamp(line.visibility - 1, -0.25, 0.4)
  };
}

export function seedToRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createCastSession(seed: number, initialFishStamina: number): CastSessionState {
  return {
    seed,
    rngState: seed >>> 0,
    fishPull: 0.6,
    fishStaminaMax: initialFishStamina,
    reelState: createReelState(initialFishStamina),
    eventLog: []
  };
}

function nextSessionRandom(session: CastSessionState): number {
  session.rngState = (session.rngState * 1664525 + 1013904223) >>> 0;
  return session.rngState / 0x100000000;
}

export function recordSessionEvent(session: CastSessionState, event: CastSessionEvent): void {
  session.eventLog.push(event);
}

export function applyReelInputEvent(
  session: CastSessionState,
  tMs: number,
  reelPower: number,
  rodFlexMultiplier: number,
  dragSetting: number,
  snapThresholdMultiplier = 1,
  slackRecoveryMultiplier = 1
): ReelState {
  const fishNoise = (nextSessionRandom(session) - 0.5) * 0.26;
  session.fishPull = clamp(session.fishPull + fishNoise, 0.3, 1.8);
  session.reelState = stepReelState(session.reelState, {
    dtSec: 1 / 30,
    reelPower,
    fishPull: session.fishPull,
    rodFlexMultiplier,
    dragSetting,
    snapThresholdMultiplier,
    slackRecoveryMultiplier
  });

  recordSessionEvent(session, {
    tMs,
    type: 'reel',
    payload: {
      reelPower,
      rodFlexMultiplier,
      dragSetting,
      fishPull: session.fishPull,
      snapThresholdMultiplier,
      slackRecoveryMultiplier
    }
  });

  return session.reelState;
}

export function replayCastSession(seed: number, initialFishStamina: number, events: CastSessionEvent[]): ReelState {
  const session = createCastSession(seed, initialFishStamina);
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (event.type !== 'reel') continue;
    applyReelInputEvent(
      session,
      event.tMs,
      Number(event.payload.reelPower ?? 0),
      Number(event.payload.rodFlexMultiplier ?? 1),
      Number(event.payload.dragSetting ?? 0.5),
      Number(event.payload.snapThresholdMultiplier ?? 1),
      Number(event.payload.slackRecoveryMultiplier ?? 1)
    );
  }
  return session.reelState;
}

export interface ReelPathPoint {
  tMs: number;
  tension: number;
  fishStamina: number;
}

export function replayCastSessionWithPath(seed: number, initialFishStamina: number, events: CastSessionEvent[]): { final: ReelState; path: ReelPathPoint[] } {
  const session = createCastSession(seed, initialFishStamina);
  const path: ReelPathPoint[] = [];
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (event.type !== 'reel') continue;
    const state = applyReelInputEvent(
      session,
      event.tMs,
      Number(event.payload.reelPower ?? 0),
      Number(event.payload.rodFlexMultiplier ?? 1),
      Number(event.payload.dragSetting ?? 0.5),
      Number(event.payload.snapThresholdMultiplier ?? 1),
      Number(event.payload.slackRecoveryMultiplier ?? 1)
    );
    path.push({
      tMs: event.tMs,
      tension: state.tension,
      fishStamina: state.fishStamina
    });
  }
  return {
    final: session.reelState,
    path
  };
}
