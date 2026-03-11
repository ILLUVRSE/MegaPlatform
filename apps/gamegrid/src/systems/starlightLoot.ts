import { MODULES } from '../data/starlightModules';
import type { MissionDef, SaveBlob, SortieResult } from '../data/starlightTypes';
import { SeededRng } from '../util/starlightRng';

export function resolveLoot(save: SaveBlob, mission: MissionDef, won: boolean, score: number, lootBonus: number): SortieResult {
  const rng = new SeededRng(score + mission.difficulty * 99 + save.credits);
  const baseCurrency = won ? 45 + mission.difficulty * 20 : 15;
  const credits = Math.round(baseCurrency * (1 + lootBonus));
  const salvage = won ? mission.difficulty * 3 : 1;

  const modules: string[] = [];
  if (won && rng.next() < 0.8) {
    const candidate = MODULES.filter((module) => !module.signatureTech);
    if (candidate.length > 0) {
      modules.push(rng.pick(candidate).id);
    }
  }

  let signatureTech: string | undefined;
  if (won && mission.hasFinalBoss && mission.signatureRewardId && !save.unlocks.signatureTech.includes(mission.signatureRewardId)) {
    signatureTech = mission.signatureRewardId;
    modules.push(signatureTech);
  }

  return {
    missionId: mission.id,
    won,
    score,
    credits,
    salvage,
    modules,
    signatureTech
  };
}
