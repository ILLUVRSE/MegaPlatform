import { describe, expect, it } from 'vitest';
import {
  applyDamageIntentToBoss,
  computeDamageIntentChecksum,
  createSharedBossState,
  reconcileBossHpDisplay,
  scoreContribution,
  validateDamageIntentEnvelope
} from './coopBoss';

describe('coop boss helpers', () => {
  it('validates dps envelope and rejects spikes', () => {
    const valid = validateDamageIntentEnvelope(
      {
        v: 1,
        type: 'dmg_intent',
        playerId: 'p1',
        missionId: 'm1',
        t: 100,
        amount: 45,
        weaponType: 'pulse',
        checksum: 1
      },
      {
        elapsedMs: 1000,
        tacticalBonus: 1,
        weaponDamageTier: 0,
        damageMultiplier: 1,
        recentDamageWindow: 12
      }
    );
    expect(valid.valid).toBe(true);

    const invalid = validateDamageIntentEnvelope(
      {
        v: 1,
        type: 'dmg_intent',
        playerId: 'p1',
        missionId: 'm1',
        t: 120,
        amount: 250,
        weaponType: 'pulse',
        checksum: 1
      },
      {
        elapsedMs: 1000,
        tacticalBonus: 0,
        weaponDamageTier: 0,
        damageMultiplier: 1,
        recentDamageWindow: 0
      }
    );
    expect(invalid.valid).toBe(false);
  });

  it('reconcile smoothing clamps hp and phase never regresses after stronger damage', () => {
    const boss = createSharedBossState({ missionId: 'm2', seed: 12, scheduleSeed: 55, bossMaxHp: 1000, nowMs: 0 });
    const intentA = {
      v: 1,
      type: 'dmg_intent' as const,
      playerId: 'p1',
      missionId: 'm2',
      t: 10,
      amount: 100,
      weaponType: 'pulse' as const,
      checksum: computeDamageIntentChecksum(12, 'm2', { t: 10, amount: 100, weaponType: 'pulse', crit: false })
    };
    const intentB = {
      ...intentA,
      t: 20,
      amount: 500,
      checksum: computeDamageIntentChecksum(12, 'm2', { t: 20, amount: 500, weaponType: 'pulse', crit: false })
    };

    const afterA = applyDamageIntentToBoss(boss, intentA, 100, 1);
    const afterB = applyDamageIntentToBoss(afterA.state, intentB, 200, 1);

    expect(afterB.state.hp).toBeGreaterThanOrEqual(0);
    expect(afterB.state.phaseId).toBeGreaterThanOrEqual(afterA.state.phaseId);

    const smooth = reconcileBossHpDisplay(900, 600, 0.1, false);
    expect(smooth).toBeLessThan(900);
    expect(smooth).toBeGreaterThanOrEqual(600);
  });

  it('scores contribution with survival and support bonus', () => {
    const low = scoreContribution(200, false, 0);
    const high = scoreContribution(200, true, 2);
    expect(high).toBeGreaterThan(low);
  });
});
