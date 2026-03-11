import { MODULE_BY_ID } from '../data/starlightModules';
import type { AppliedWeaponConfig, DamageType, ModuleSlot, PerkDef, SaveBlob, ShipStats, WeaponProfile } from '../data/starlightTypes';
import { BASE_SHIP_STATS } from '../util/starlightConstants';

const DEFAULT_WEAPON: WeaponProfile = {
  pattern: 'pulse',
  projectileSpeed: 430,
  spreadDeg: 0,
  burstCount: 1,
  burstGapMs: 0,
  heatPerShot: 6
};

function addStats(target: ShipStats, delta: Partial<ShipStats>): ShipStats {
  return {
    ...target,
    maxHull: target.maxHull + (delta.maxHull ?? 0),
    maxShield: target.maxShield + (delta.maxShield ?? 0),
    shieldRegen: target.shieldRegen + (delta.shieldRegen ?? 0),
    shieldRegenDelay: Math.max(0.8, target.shieldRegenDelay + (delta.shieldRegenDelay ?? 0)),
    accel: target.accel + (delta.accel ?? 0),
    damping: delta.damping ?? target.damping,
    idleDampingBoost: target.idleDampingBoost + (delta.idleDampingBoost ?? 0),
    maxSpeed: target.maxSpeed + (delta.maxSpeed ?? 0),
    turnRate: target.turnRate + (delta.turnRate ?? 0),
    primaryDamage: target.primaryDamage + (delta.primaryDamage ?? 0),
    secondaryDamage: target.secondaryDamage + (delta.secondaryDamage ?? 0),
    fireRate: target.fireRate + (delta.fireRate ?? 0),
    projectileSpeed: target.projectileSpeed + (delta.projectileSpeed ?? 0),
    spreadDeg: target.spreadDeg + (delta.spreadDeg ?? 0),
    critChance: target.critChance + (delta.critChance ?? 0),
    blinkCooldown: Math.max(1, target.blinkCooldown + (delta.blinkCooldown ?? 0)),
    blinkDistance: target.blinkDistance + (delta.blinkDistance ?? 0),
    lootBonus: target.lootBonus + (delta.lootBonus ?? 0),
    lootMagnet: target.lootMagnet + (delta.lootMagnet ?? 0),
    heatCapacity: target.heatCapacity + (delta.heatCapacity ?? 0),
    heatDissipation: target.heatDissipation + (delta.heatDissipation ?? 0),
    overheatFirePenalty: target.overheatFirePenalty + (delta.overheatFirePenalty ?? 0),
    damageReduction: Math.min(0.45, target.damageReduction + (delta.damageReduction ?? 0)),
    powerBudget: target.powerBudget + (delta.powerBudget ?? 0)
  };
}

function resolveWeapon(slotId: string | null, stats: ShipStats, isPrimary: boolean): AppliedWeaponConfig {
  const module = slotId ? MODULE_BY_ID.get(slotId) : undefined;
  const weapon = { ...DEFAULT_WEAPON, ...(module?.weapon ?? {}) };
  return {
    moduleId: slotId,
    damageType: (module?.damageType as DamageType | undefined) ?? 'Kinetic',
    damage: (isPrimary ? stats.primaryDamage : stats.secondaryDamage) + (module?.damage ?? 0),
    fireRate: Math.max(1, (module?.fireRate ?? stats.fireRate) + (isPrimary ? 0 : -2.4)),
    projectileSpeed: weapon.projectileSpeed + (module?.stats?.projectileSpeed ?? 0),
    spreadDeg: weapon.spreadDeg + (module?.stats?.spreadDeg ?? 0) + (isPrimary ? stats.spreadDeg : 0),
    pattern: weapon.pattern,
    burstCount: Math.max(1, weapon.burstCount),
    burstGapMs: Math.max(0, weapon.burstGapMs),
    heatPerShot: Math.max(2, weapon.heatPerShot)
  };
}

export interface FittingSnapshot {
  stats: ShipStats;
  totalPower: number;
  totalHeat: number;
  slots: Record<ModuleSlot, string | null>;
  primaryWeapon: AppliedWeaponConfig;
  secondaryWeapon: AppliedWeaponConfig;
}

export function computeFitting(save: SaveBlob, selectedPerk: PerkDef | null): FittingSnapshot {
  const slots = save.equippedSlots;
  let stats: ShipStats = { ...BASE_SHIP_STATS };
  let totalPower = 0;
  let totalHeat = 0;

  (Object.keys(slots) as ModuleSlot[]).forEach((slot) => {
    const moduleId = slots[slot];
    if (!moduleId) return;
    const module = MODULE_BY_ID.get(moduleId);
    if (!module) return;
    totalPower += module.powerCost;
    totalHeat += module.heatPerSecond;
    if (module.stats) stats = addStats(stats, module.stats);
    if (slot === 'primary' && module.damage) stats.primaryDamage += module.damage;
    if (slot === 'secondary' && module.damage) stats.secondaryDamage += module.damage;
    if (slot === 'primary' && module.fireRate) stats.fireRate += module.fireRate;
  });

  if (selectedPerk) {
    stats = addStats(stats, selectedPerk.stats);
  }

  const primaryWeapon = resolveWeapon(slots.primary, stats, true);
  const secondaryWeapon = resolveWeapon(slots.secondary, stats, false);

  return { stats, totalPower, totalHeat, slots, primaryWeapon, secondaryWeapon };
}
