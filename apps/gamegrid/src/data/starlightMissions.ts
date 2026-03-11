import type { MissionDef } from './starlightTypes';

export const MISSIONS: MissionDef[] = [
  {
    id: 's1-m1',
    name: 'Sector 1: Fringe Sweep',
    description: 'Interdict scout wings and clear the lane.',
    waveId: 'sector1-m1',
    difficulty: 1,
    hasFinalBoss: false
  },
  {
    id: 's1-m2',
    name: 'Sector 1: Relay Break',
    description: 'Disable relay escorts, then break the command midboss.',
    waveId: 'sector1-m2',
    difficulty: 2,
    hasFinalBoss: false,
    midbossAtSec: 58
  },
  {
    id: 's1-m3',
    name: 'Sector 1: Prism Gate',
    description: 'Punch through waves and destroy the Prism Warden.',
    waveId: 'sector1-m3',
    difficulty: 3,
    hasFinalBoss: true,
    midbossAtSec: 66,
    finalBossId: 'prism-warden',
    signatureRewardId: 'sig-prism-breaker'
  }
];

export const MISSION_BY_ID = new Map(MISSIONS.map((mission) => [mission.id, mission]));
