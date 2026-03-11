import { describe, expect, it } from 'vitest';
import { GoalieGauntletMultiplayerAdapter } from './goalie-gauntlet';
import { buildShotSchedule, loadShotPatterns } from '../../games/goalie-gauntlet/patterns';

describe('goalie-gauntlet adapter timing resolution', () => {
  it('host resolves perfect/good/late/miss using authoritative shot timing', () => {
    const adapter = new GoalieGauntletMultiplayerAdapter();
    adapter.init({
      role: 'host',
      playerId: 'host',
      seed: 4242,
      options: {
        playerIds: ['host', 'clientA', 'clientB', 'clientC'],
        mode: 'challenge',
        difficulty: 'easy',
        patternId: 'perfect-streak'
      }
    });

    adapter.start();

    const firstShot = buildShotSchedule(loadShotPatterns(), {
      seed: 4242,
      mode: 'challenge',
      difficulty: 'easy',
      patternId: 'perfect-streak',
      shotCount: 70
    }).shots[0];

    let grades: Record<string, string> | null = null;
    let sentHost = false;
    let sentGood = false;
    let sentLate = false;
    let sentMiss = false;

    for (let i = 0; i < 300; i += 1) {
      const nowMs = adapter.getSnapshot().timeMs;

      if (!sentGood && nowMs >= firstShot.arriveAtMs - 200) {
        adapter.onRemoteMessage({ fromPlayerId: 'clientA', input: { targetZone: firstShot.zone, t: nowMs } });
        sentGood = true;
      }

      if (!sentHost && nowMs >= firstShot.arriveAtMs - 90) {
        adapter.onInput({ targetZone: firstShot.zone, t: nowMs });
        sentHost = true;
      }

      if (!sentLate && nowMs >= firstShot.arriveAtMs - 20) {
        adapter.onRemoteMessage({ fromPlayerId: 'clientB', input: { targetZone: firstShot.zone, t: nowMs + 120 } });
        sentLate = true;
      }

      if (!sentMiss && nowMs >= firstShot.arriveAtMs - 100) {
        adapter.onRemoteMessage({ fromPlayerId: 'clientC', input: { targetZone: 'high-right', t: nowMs } });
        sentMiss = true;
      }

      const events = adapter.step(1 / 120);
      const saveResult = events.find((event) => event.type === 'save_result');
      if (saveResult && saveResult.type === 'save_result') {
        grades = saveResult.grades;
        break;
      }
    }

    expect(grades).not.toBeNull();
    expect(grades?.host).toBe('PERFECT');
    expect(grades?.clientA).toBe('GOOD');
    expect(grades?.clientB).toBe('LATE');
    expect(grades?.clientC).toBe('MISS');
  });

  it('rejects desperation dive spam before cooldown and keeps ranked schedule deterministic', () => {
    const ranked = new GoalieGauntletMultiplayerAdapter();
    ranked.init({
      role: 'host',
      playerId: 'host',
      seed: 12,
      options: {
        mode: 'ranked',
        dayKey: '2026-02-15',
        playerIds: ['host']
      }
    });
    expect(ranked.getSnapshot().patternId).toBe('ranked:2026-02-15');

    const host = new GoalieGauntletMultiplayerAdapter();
    host.init({
      role: 'host',
      playerId: 'host',
      seed: 4242,
      options: {
        mode: 'challenge',
        difficulty: 'easy',
        patternId: 'perfect-streak',
        playerIds: ['host']
      }
    });
    host.start();
    const firstShot = buildShotSchedule(loadShotPatterns(), {
      seed: 4242,
      mode: 'challenge',
      difficulty: 'easy',
      patternId: 'perfect-streak',
      shotCount: 70
    }).shots[0];

    let resolved: Record<string, string> | null = null;
    let sent = false;

    for (let i = 0; i < 360; i += 1) {
      const nowMs = host.getSnapshot().timeMs;
      if (!sent && nowMs >= firstShot.arriveAtMs - 90) {
        host.onInput({ targetZone: 'mid-left', actionType: 'desperation_dive', coveredZones: ['mid-left', 'mid-right'], t: nowMs });
        host.onInput({ targetZone: 'high-right', actionType: 'desperation_dive', coveredZones: ['high-right', 'high-left'], t: nowMs + 5 });
        sent = true;
      }
      const events = host.step(1 / 120);
      const saveResult = events.find((event) => event.type === 'save_result');
      if (saveResult && saveResult.type === 'save_result') {
        resolved = saveResult.grades;
        break;
      }
    }

    expect(resolved).not.toBeNull();
    expect(resolved?.host).not.toBe('MISS');
  });

  it('falls back from career to ranked when launched in party adapter path', () => {
    const adapter = new GoalieGauntletMultiplayerAdapter();
    adapter.init({
      role: 'host',
      playerId: 'host',
      seed: 3001,
      options: {
        mode: 'career',
        dayKey: '2026-02-15',
        playerIds: ['host', 'client']
      }
    });

    const snapshot = adapter.getSnapshot();
    expect(snapshot.mode).toBe('ranked');
    expect(snapshot.patternId).toBe('ranked:2026-02-15');
  });
});
