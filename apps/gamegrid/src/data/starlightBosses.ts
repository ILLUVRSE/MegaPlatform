import type { DamageType } from './starlightTypes';

export interface MidbossConfig {
  weakWindowSec: number;
  telegraphSec: number;
  volleyDamage: number;
  spreadStepDeg: number;
}

export interface PrismPhase {
  hpAbove: number;
  beamDurationSec: number;
  beamTelegraphSec: number;
  beamSweepSpeed: number;
  droneCount: number;
  droneSpawnSec: number;
  chargeCadenceSec: number;
  volleyCount: number;
  volleyDamage: number;
}

export interface BossConfig {
  id: string;
  resistance: Partial<Record<DamageType, number>>;
  signatureRewardId?: string;
  phases: PrismPhase[];
}

export const MIDBOSS_CONFIG: MidbossConfig = {
  weakWindowSec: 2.6,
  telegraphSec: 4.2,
  volleyDamage: 11,
  spreadStepDeg: 12
};

export const PRISM_WARDEN_CONFIG: BossConfig = {
  id: 'prism-warden',
  resistance: { EM: 0.7, Kinetic: 0.9, Thermal: 0.75, Plasma: 1.35 },
  signatureRewardId: 'sig-prism-breaker',
  phases: [
    { hpAbove: 0.66, beamDurationSec: 2.3, beamTelegraphSec: 5.3, beamSweepSpeed: 1.75, droneCount: 5, droneSpawnSec: 6.2, chargeCadenceSec: 4.6, volleyCount: 5, volleyDamage: 14 },
    { hpAbove: 0.33, beamDurationSec: 3.1, beamTelegraphSec: 5.0, beamSweepSpeed: 1.95, droneCount: 6, droneSpawnSec: 5.6, chargeCadenceSec: 4.0, volleyCount: 7, volleyDamage: 15 },
    { hpAbove: 0, beamDurationSec: 3.4, beamTelegraphSec: 3.8, beamSweepSpeed: 2.35, droneCount: 8, droneSpawnSec: 4.8, chargeCadenceSec: 3.4, volleyCount: 9, volleyDamage: 16 }
  ]
};
