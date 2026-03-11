import { describe, expect, it } from 'vitest';
import { CardTableMultiplayerAdapter } from './adapters/card-table';
import { createStartedRoom, sendEventFromHost, sendInputToHost, sendSnapshotFromHost, wireLoopback } from './integrationHarness';
import { MockLoopbackTransport } from './transport';
import { CARD_TABLE_MULTIPLAYER_MODES } from './coverage';

describe('card-table multiplayer integration', () => {
  it('syncs hand outcomes and bankroll across all card modes', () => {
    for (const mode of CARD_TABLE_MULTIPLAYER_MODES) {
      const started = createStartedRoom(`CARD${mode.length}`, 3100 + mode.length);
      const hostAdapter = new CardTableMultiplayerAdapter();
      const clientAdapter = new CardTableMultiplayerAdapter();

      hostAdapter.init({ role: 'host', playerId: 'host', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 0, playerIds: ['host', 'client'], mode } });
      clientAdapter.init({ role: 'client', playerId: 'client', seed: started.seed, options: { hostPlayerId: 'host', playerIndex: 1, playerIds: ['host', 'client'], mode } });
      hostAdapter.start();
      clientAdapter.start();

      const hostTransport = new MockLoopbackTransport('host');
      const clientTransport = new MockLoopbackTransport('client');
      wireLoopback(
        hostTransport,
        clientTransport,
        (packet) => {
          if (packet.message.type === 'input') hostAdapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input });
        },
        (packet) => {
          if (packet.message.type === 'snapshot') clientAdapter.applySnapshot(packet.message.state as ReturnType<typeof hostAdapter.getSnapshot>);
          if (packet.message.type === 'event') clientAdapter.applyEvent(packet.message.event as Parameters<typeof clientAdapter.applyEvent>[0]);
        }
      );

      const actions = ['bet', 'call', 'raise', 'stand', 'draw', 'hold'] as const;
      for (let hand = 0; hand < 20; hand += 1) {
        hostAdapter.onInput({ action: actions[hand % actions.length], amount: 30 + (hand % 3) * 10, playerIndex: 0 });
        for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
        sendSnapshotFromHost(hostTransport, hand * 2, hostAdapter.getSnapshot());

        sendInputToHost(clientTransport, hand, {
          action: actions[(hand + 1) % actions.length],
          amount: 25 + (hand % 4) * 10,
          guess: hand % 2 === 0 ? 'higher' : 'lower',
          playerIndex: 1
        });
        for (const event of hostAdapter.step()) sendEventFromHost(hostTransport, event);
        sendSnapshotFromHost(hostTransport, hand * 2 + 1, hostAdapter.getSnapshot());

        if (hostAdapter.getResult()) break;
      }

      expect(clientAdapter.getSnapshot().mode).toBe(mode);
      expect(clientAdapter.getSnapshot().bankroll).toEqual(hostAdapter.getSnapshot().bankroll);
    }
  });
});
