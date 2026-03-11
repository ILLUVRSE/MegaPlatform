import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('pool route boot integration', () => {
  it('boots through game container and runs pool update ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'pool',
          title: 'Pool',
          description: 'Mock',
          icon: '🎱',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/pool',
          loadModule: async () => {
            const { createPoolTableGeometry, createPhysicsScratch, stepPoolPhysics } = await import('./physics');
            const { createRack } = await import('./rack');

            const table = createPoolTableGeometry();
            const balls = createRack('eight_ball', table);
            balls[0].vx = 220;
            balls[0].vy = 35;
            const scratch = createPhysicsScratch();
            for (let i = 0; i < 10; i += 1) {
              stepPoolPhysics(balls, table, 1 / 120, true, scratch);
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
      REQUIRED_GAME_IDS: ['pool'],
      getGameById: (id: string) =>
        id === 'pool'
          ? {
              id: 'pool',
              title: 'Pool',
              description: 'Mock',
              icon: '🎱',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/pool',
              loadModule: async () => {
                const { createPoolTableGeometry, createPhysicsScratch, stepPoolPhysics } = await import('./physics');
                const { createRack } = await import('./rack');

                const table = createPoolTableGeometry();
                const balls = createRack('eight_ball', table);
                balls[0].vx = 220;
                balls[0].vy = 35;
                const scratch = createPhysicsScratch();
                for (let i = 0; i < 10; i += 1) {
                  stepPoolPhysics(balls, table, 1 / 120, true, scratch);
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
          <GameContainer gameId="pool" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(tickSpy.mock.calls.length).toBeGreaterThanOrEqual(10);
    });
  });
});
