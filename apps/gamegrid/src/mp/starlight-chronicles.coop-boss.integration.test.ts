import { describe, expect, it } from 'vitest';
import { StarlightChroniclesMultiplayerAdapter } from './adapters/starlight-chronicles';

describe('starlight co-op boss harness smoke', () => {
  it('boots host adapter and exposes combat boss fields in snapshot', () => {
    const host = new StarlightChroniclesMultiplayerAdapter();
    host.init({
      role: 'host',
      playerId: 'host',
      seed: 9401,
      options: {
        hostPlayerId: 'host',
        playerIds: ['host', 'p1']
      }
    });
    host.start();
    const snapshot = host.getSnapshot();
    expect(snapshot.combat.bossHp).toBe(0);
    expect(snapshot.combat.bossPhase).toBe(0);
  });
});
