export type SupportAbilityId = 'captain_rally' | 'science_scan_lock' | 'engineer_patch_field' | 'tactical_overcharge';

export interface SupportAbilityDef {
  id: SupportAbilityId;
  label: string;
  cooldownMs: number;
  durationMs: number;
  maxCharges: number;
  damageMultiplier: number;
  visualOnly: boolean;
}

export interface ActiveAbilityBuff {
  abilityId: SupportAbilityId;
  byPlayerId: string;
  startedAtMs: number;
  expiresAtMs: number;
}

export interface AbilityChargeState {
  chargesUsed: number;
  lastCastAtMs: number;
}

export interface SupportAbilityState {
  byPlayer: Record<string, Record<SupportAbilityId, AbilityChargeState>>;
  activeBuffs: ActiveAbilityBuff[];
}

export const SUPPORT_ABILITIES: Record<SupportAbilityId, SupportAbilityDef> = {
  captain_rally: {
    id: 'captain_rally',
    label: 'Rally',
    cooldownMs: 30000,
    durationMs: 5000,
    maxCharges: 2,
    damageMultiplier: 1.2,
    visualOnly: false
  },
  science_scan_lock: {
    id: 'science_scan_lock',
    label: 'Scan Lock',
    cooldownMs: 30000,
    durationMs: 5000,
    maxCharges: 2,
    damageMultiplier: 1,
    visualOnly: true
  },
  engineer_patch_field: {
    id: 'engineer_patch_field',
    label: 'Patch Field',
    cooldownMs: 30000,
    durationMs: 5000,
    maxCharges: 2,
    damageMultiplier: 1,
    visualOnly: false
  },
  tactical_overcharge: {
    id: 'tactical_overcharge',
    label: 'Overcharge',
    cooldownMs: 30000,
    durationMs: 4000,
    maxCharges: 2,
    damageMultiplier: 1.18,
    visualOnly: false
  }
};

function abilityIds(): SupportAbilityId[] {
  return Object.keys(SUPPORT_ABILITIES) as SupportAbilityId[];
}

function createChargeState(): Record<SupportAbilityId, AbilityChargeState> {
  const state = {} as Record<SupportAbilityId, AbilityChargeState>;
  const ids = abilityIds();
  for (let i = 0; i < ids.length; i += 1) {
    state[ids[i]] = { chargesUsed: 0, lastCastAtMs: -Infinity };
  }
  return state;
}

export function createSupportAbilityState(playerIds: string[]): SupportAbilityState {
  const byPlayer: Record<string, Record<SupportAbilityId, AbilityChargeState>> = {};
  for (let i = 0; i < playerIds.length; i += 1) {
    byPlayer[playerIds[i]] = createChargeState();
  }
  return {
    byPlayer,
    activeBuffs: []
  };
}

export function cleanupExpiredBuffs(state: SupportAbilityState, nowMs: number): SupportAbilityState {
  return {
    ...state,
    activeBuffs: state.activeBuffs.filter((buff) => buff.expiresAtMs > nowMs)
  };
}

export function castSupportAbility(
  state: SupportAbilityState,
  playerId: string,
  abilityId: SupportAbilityId,
  nowMs: number
): { ok: true; state: SupportAbilityState; buff: ActiveAbilityBuff } | { ok: false; reason: string } {
  const def = SUPPORT_ABILITIES[abilityId];
  const playerState = state.byPlayer[playerId];
  if (!def || !playerState) return { ok: false, reason: 'unknown_ability' };

  const charge = playerState[abilityId];
  if (charge.chargesUsed >= def.maxCharges) return { ok: false, reason: 'ability_no_charges' };
  if (nowMs - charge.lastCastAtMs < def.cooldownMs) return { ok: false, reason: 'ability_cooldown' };

  const updated = cleanupExpiredBuffs(state, nowMs);
  const nextByPlayer: SupportAbilityState['byPlayer'] = { ...updated.byPlayer };
  nextByPlayer[playerId] = {
    ...nextByPlayer[playerId],
    [abilityId]: {
      chargesUsed: charge.chargesUsed + 1,
      lastCastAtMs: nowMs
    }
  };

  const buff: ActiveAbilityBuff = {
    abilityId,
    byPlayerId: playerId,
    startedAtMs: nowMs,
    expiresAtMs: nowMs + def.durationMs
  };

  return {
    ok: true,
    state: {
      byPlayer: nextByPlayer,
      activeBuffs: [...updated.activeBuffs, buff]
    },
    buff
  };
}

export function activeDamageMultiplier(state: SupportAbilityState, nowMs: number): number {
  const active = state.activeBuffs.filter((buff) => buff.expiresAtMs > nowMs);
  let mult = 1;
  for (let i = 0; i < active.length; i += 1) {
    mult *= SUPPORT_ABILITIES[active[i].abilityId].damageMultiplier;
  }
  return Math.max(1, Math.min(mult, 1.8));
}

export function supportUsageScore(state: SupportAbilityState, playerId: string): number {
  const playerState = state.byPlayer[playerId];
  if (!playerState) return 0;
  return abilityIds().reduce((sum, abilityId) => sum + playerState[abilityId].chargesUsed, 0);
}

export function hasPatchFieldSupport(state: SupportAbilityState): boolean {
  const players = Object.keys(state.byPlayer);
  for (let i = 0; i < players.length; i += 1) {
    if (state.byPlayer[players[i]].engineer_patch_field.chargesUsed > 0) return true;
  }
  return false;
}
