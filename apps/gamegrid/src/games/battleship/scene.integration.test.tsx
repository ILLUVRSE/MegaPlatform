import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ImpactPulse } from './feedback';

describe('battleship route boot integration', () => {
  it('boots through game container and runs feedback ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'battleship',
          title: 'Battleship',
          description: 'Mock',
          icon: 'ship',
          inputType: 'tap',
          status: 'live',
          route: '/play/battleship',
          loadModule: async () => {
            const { nextHitStreak, pushImpact, tickImpacts } = await import('./feedback');
            const impacts: ImpactPulse[] = [];
            let streak = 0;
            for (let i = 0; i < 6; i += 1) {
              streak = nextHitStreak(streak, i % 2 === 0);
              pushImpact(impacts, { side: 'enemy', row: i, col: i, hit: i % 2 === 0, lifeMs: 240 });
              tickImpacts(impacts, 16);
              tickSpy();
            }
            return {
              createGame: () => ({
                pause: () => undefined,
                resume: () => undefined,
                mute: () => undefined,
                destroy: () => undefined
              })
            };
          }
        }
      ],
      REQUIRED_GAME_IDS: ['battleship'],
      getGameById: (id: string) =>
        id === 'battleship'
          ? {
              id: 'battleship',
              title: 'Battleship',
              description: 'Mock',
              icon: 'ship',
              inputType: 'tap',
              status: 'live',
              route: '/play/battleship',
              loadModule: async () => {
                const { nextHitStreak, pushImpact, tickImpacts } = await import('./feedback');
                const impacts: ImpactPulse[] = [];
                let streak = 0;
                for (let i = 0; i < 6; i += 1) {
                  streak = nextHitStreak(streak, i % 2 === 0);
                  pushImpact(impacts, { side: 'enemy', row: i, col: i, hit: i % 2 === 0, lifeMs: 240 });
                  tickImpacts(impacts, 16);
                  tickSpy();
                }
                return {
                  createGame: () => ({
                    pause: () => undefined,
                    resume: () => undefined,
                    mute: () => undefined,
                    destroy: () => undefined
                  })
                };
              }
            }
          : undefined
    }));

    const { SettingsProvider } = await import('../../systems/settingsContext');
    const { GameContainer } = await import('../../game/GameContainer');
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <GameContainer gameId="battleship" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(tickSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
    });
  });
});
