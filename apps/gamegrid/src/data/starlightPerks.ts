import type { PerkDef } from './starlightTypes';

export const PERKS: PerkDef[] = [
  { id: 'perk-overdrive', name: 'Overdrive', description: '+20% fire rate, +20 heat generation', stats: { fireRate: 1.4, heatCapacity: -10 } },
  { id: 'perk-coolant', name: 'Coolant Veins', description: '+40% heat dissipation', stats: { heatDissipation: 10 } },
  { id: 'perk-bulwark', name: 'Bulwark Matrix', description: '+50 shield, +2 shield regen', stats: { maxShield: 50, shieldRegen: 2 } },
  { id: 'perk-torque', name: 'Torque Vanes', description: '+30 accel, +25 max speed', stats: { accel: 30, maxSpeed: 25 } },
  { id: 'perk-salvager', name: 'Salvager Instinct', description: '+30% loot payout', stats: { lootBonus: 0.3 } },
  { id: 'perk-stabilizer', name: 'Inertial Stabilizer', description: 'higher damping and control', stats: { damping: 0.45 } },
  { id: 'perk-critical', name: 'Target Analyzer', description: '+15% crit chance', stats: { critChance: 0.15 } },
  { id: 'perk-phasic', name: 'Phasic Drives', description: '-1.5s blink cooldown', stats: { blinkCooldown: -1.5 } },
  { id: 'perk-brawler', name: 'Close Quarters', description: '+25 primary damage', stats: { primaryDamage: 25 } }
];

export const PERK_BY_ID = new Map(PERKS.map((perk) => [perk.id, perk]));
