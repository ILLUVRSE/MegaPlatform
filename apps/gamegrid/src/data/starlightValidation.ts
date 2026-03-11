import { ENEMIES } from './starlightEnemies';
import { MISSIONS } from './starlightMissions';
import { MODULES } from './starlightModules';
import { PERKS } from './starlightPerks';
import { WAVES } from './starlightWaves';

function warn(message: string): void {
  // eslint-disable-next-line no-console
  console.error(`[StarlightData] ${message}`);
}

export function validateStarlightData(): boolean {
  let ok = true;

  if (MODULES.length < 12) {
    warn('Expected at least 12 modules');
    ok = false;
  }
  if (PERKS.length < 9) {
    warn('Expected at least 9 perks');
    ok = false;
  }
  if (ENEMIES.length < 6) {
    warn('Expected at least 6 enemies');
    ok = false;
  }

  for (const mission of MISSIONS) {
    if (!WAVES.find((wave) => wave.id === mission.waveId)) {
      warn(`Mission ${mission.id} references missing wave ${mission.waveId}`);
      ok = false;
    }
  }

  if (!MISSIONS.find((mission) => mission.id === 's1-m2' && typeof mission.midbossAtSec === 'number')) {
    warn('Mission 2 must include midbossAtSec');
    ok = false;
  }
  if (!MISSIONS.find((mission) => mission.id === 's1-m3' && mission.finalBossId === 'prism-warden' && mission.signatureRewardId)) {
    warn('Mission 3 must include prism-warden and signatureRewardId');
    ok = false;
  }

  return ok;
}
