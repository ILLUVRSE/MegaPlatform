import { describe, expect, it } from 'vitest';
import { computeCombatChecksum, resolveVoteWinner, validateCombatResultEnvelope } from './starlight-chronicles';

describe('starlight coop vote + combat validators', () => {
  it('resolves deterministic tie-break from seat order and seed', () => {
    const votes = {
      host: 'a',
      p1: 'b',
      p2: 'a',
      p3: 'b'
    };
    const first = resolveVoteWinner(votes, ['a', 'b'], ['host', 'p1', 'p2', 'p3'], 777, 'node:0');
    const second = resolveVoteWinner(votes, ['a', 'b'], ['host', 'p1', 'p2', 'p3'], 777, 'node:0');
    expect(first).toEqual(second);
    expect(['a', 'b']).toContain(first.chosenChoiceId);
  });

  it('validates combat result envelopes and checksum', () => {
    const seed = 9123;
    const missionId = 'mission-scout-1';
    const checksum = computeCombatChecksum(seed, missionId, { kills: 14, bossPhaseReached: 2, score: 1280 });
    const valid = validateCombatResultEnvelope(seed, {
      v: 1,
      type: 'combat_result',
      playerId: 'p1',
      missionId,
      score: 1280,
      kills: 14,
      damageTaken: 180,
      survived: true,
      bossPhaseReached: 2,
      checksum
    });
    expect(valid.valid).toBe(true);

    const invalid = validateCombatResultEnvelope(seed, {
      v: 1,
      type: 'combat_result',
      playerId: 'p1',
      missionId,
      score: 999999,
      kills: 14,
      damageTaken: 180,
      survived: true,
      bossPhaseReached: 2,
      checksum
    });
    expect(invalid.valid).toBe(false);
  });
});
