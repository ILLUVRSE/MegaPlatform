import { describe, expect, it } from 'vitest';
import { starlight_chroniclesMpAdapter } from './starlight-chronicles';

describe('starlight mp adapter groundwork', () => {
  it('exposes coop planned capability and safe serialization hooks', () => {
    expect(starlight_chroniclesMpAdapter.capabilities?.coopPlanned).toBe(true);
    starlight_chroniclesMpAdapter.init({
      role: 'host',
      playerId: 'host',
      seed: 7,
      options: { hostPlayerId: 'host', playerIds: ['host', 'p1'] }
    });
    starlight_chroniclesMpAdapter.start();
    const raw = starlight_chroniclesMpAdapter.serializeSnapshotSafe?.(starlight_chroniclesMpAdapter.getSnapshot());
    expect(raw).toContain('runSnapshot');
    const parsed = starlight_chroniclesMpAdapter.deserializeSnapshotSafe?.(raw ?? '{}');
    expect(parsed?.seed).toBe(7);
  });

  it('round-trips fleet config fields in snapshot', () => {
    starlight_chroniclesMpAdapter.init({
      role: 'host',
      playerId: 'host',
      seed: 17,
      options: { hostPlayerId: 'host', playerIds: ['host', 'p1'] }
    });
    starlight_chroniclesMpAdapter.start();
    const snap = starlight_chroniclesMpAdapter.getSnapshot();
    expect(Array.isArray(snap.runSnapshot.shipConfig.activeWingmenIds)).toBe(true);
    expect('activeDroneId' in snap.runSnapshot.shipConfig).toBe(true);
    expect(Array.isArray(snap.runSnapshot.shipConfig.patrolContextIds)).toBe(true);
  });
});
