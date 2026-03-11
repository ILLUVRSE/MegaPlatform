import type { GameRuntimeHooks } from '../game/modules';
import { MISSION_BY_ID } from '../data/starlightMissions';
import { MODULE_BY_ID } from '../data/starlightModules';
import { PERK_BY_ID, PERKS } from '../data/starlightPerks';
import { validateStarlightData } from '../data/starlightValidation';
import type { ActiveRunState, PerkDef, SaveBlob, SortieResult } from '../data/starlightTypes';
import { computeFitting } from '../systems/starlightModuleSystem';
import { loadSave, persistSave } from '../systems/starlightSave';
import { SeededRng } from '../util/starlightRng';

interface PendingResultState {
  result: SortieResult;
  applied: boolean;
}

interface StarlightRuntimeState {
  hooks: GameRuntimeHooks | null;
  save: SaveBlob;
  selectedMissionId: string;
  perkChoices: PerkDef[];
  pendingResult: PendingResultState | null;
  godMode: boolean;
}

const state: StarlightRuntimeState = {
  hooks: null,
  save: loadSave(),
  selectedMissionId: 's1-m1',
  perkChoices: [],
  pendingResult: null,
  godMode: false
};

export function initRuntime(hooks: GameRuntimeHooks): void {
  state.hooks = hooks;
  state.save = loadSave();
}

export function getHooks(): GameRuntimeHooks | null {
  return state.hooks;
}

export function getSave(): SaveBlob {
  return state.save;
}

export function updateSave(next: SaveBlob): void {
  state.save = next;
  persistSave(next);
}

export function getSelectedMissionId(): string {
  return state.selectedMissionId;
}

export function setSelectedMissionId(missionId: string): void {
  if (!MISSION_BY_ID.has(missionId)) return;
  state.selectedMissionId = missionId;
}

export function buildLaunchValidation(save = state.save): { ok: boolean; reason: string | null } {
  const fit = computeFitting(save, null);
  if (!save.equippedSlots.primary) return { ok: false, reason: 'Primary weapon required' };
  if (fit.totalPower > fit.stats.powerBudget) return { ok: false, reason: 'Power budget exceeded' };
  return { ok: true, reason: null };
}

export function chooseRunPerks(): PerkDef[] {
  const rng = new SeededRng(Date.now() + state.save.credits);
  const pool = [...PERKS];
  const picks: PerkDef[] = [];
  while (pool.length > 0 && picks.length < 3) {
    const idx = rng.int(0, pool.length - 1);
    picks.push(pool[idx]!);
    pool.splice(idx, 1);
  }
  state.perkChoices = picks;
  return picks;
}

export function getPerkChoices(): PerkDef[] {
  return state.perkChoices;
}

export function startActiveRun(missionId: string): void {
  const run: ActiveRunState = {
    missionId,
    selectedPerkId: null,
    seed: Date.now(),
    earnedCredits: 0,
    earnedLoot: [],
    defeated: false
  };
  updateSave({ ...state.save, activeRun: run });
}

export function setActiveRunPerk(perkId: string): void {
  if (!PERK_BY_ID.has(perkId)) return;
  if (!state.save.activeRun) return;
  updateSave({
    ...state.save,
    activeRun: {
      ...state.save.activeRun,
      selectedPerkId: perkId
    }
  });
}

export function getSelectedPerk(): PerkDef | null {
  const perkId = state.save.activeRun?.selectedPerkId;
  if (!perkId) return null;
  return PERK_BY_ID.get(perkId) ?? null;
}

export function isRunReady(debugBypass = false): boolean {
  if (debugBypass) return true;
  const run = state.save.activeRun;
  return Boolean(run && run.missionId && run.selectedPerkId);
}

export function clearActiveRun(): void {
  if (!state.save.activeRun) return;
  updateSave({ ...state.save, activeRun: null });
}

export function setPendingResult(result: SortieResult): void {
  state.pendingResult = { result, applied: false };
}

export function getPendingResult(): SortieResult | null {
  return state.pendingResult?.result ?? null;
}

export function commitPendingResult(salvageModuleIds: string[]): void {
  const pending = state.pendingResult;
  if (!pending || pending.applied) return;

  const save = getSave();
  let credits = save.credits + pending.result.credits;
  let materials = save.materials + pending.result.salvage;
  const inventory = [...save.inventory];
  const unlockSignature = [...save.unlocks.signatureTech];
  const bossKills = [...save.bossKills];

  for (const moduleId of pending.result.modules) {
    if (salvageModuleIds.includes(moduleId)) {
      const rarity = MODULE_BY_ID.get(moduleId)?.rarity ?? 'common';
      credits += rarity === 'epic' ? 48 : rarity === 'rare' ? 20 : 9;
      continue;
    }
    inventory.push(moduleId);
  }

  if (pending.result.signatureTech && !unlockSignature.includes(pending.result.signatureTech)) {
    unlockSignature.push(pending.result.signatureTech);
  }

  if (pending.result.won && pending.result.missionId === 's1-m3' && !bossKills.includes('prism-warden')) {
    bossKills.push('prism-warden');
  }

  updateSave({
    ...save,
    credits,
    materials,
    inventory,
    unlocks: { signatureTech: unlockSignature },
    bossKills,
    activeRun: null
  });

  pending.applied = true;
}

export function clearPendingResult(): void {
  state.pendingResult = null;
}

export function toggleGodMode(): boolean {
  state.godMode = !state.godMode;
  return state.godMode;
}

export function isGodMode(): boolean {
  return state.godMode;
}

export function runtimeSelfCheck(): void {
  if (!MISSION_BY_ID.has('s1-m1')) {
    // eslint-disable-next-line no-console
    console.warn('[Starlight] Mission data missing expected id s1-m1');
  }
  if (PERKS.length < 9) {
    // eslint-disable-next-line no-console
    console.warn('[Starlight] Perks below expected minimum (9)');
  }
  validateStarlightData();
}
