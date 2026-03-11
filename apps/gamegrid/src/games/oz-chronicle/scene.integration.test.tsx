import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('oz chronicle route boot integration', () => {
  it('boots /play/oz-chronicle without crash', async () => {
    const bootSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'oz-chronicle',
          title: 'Chronicles of the Silver Road',
          description: 'Mock',
          icon: 'pool',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/oz-chronicle',
          loadModule: async () => {
            const { simulateOzChronicleBoot } = await import('./scene');
            const sim = simulateOzChronicleBoot(2026);
            const simAlt = simulateOzChronicleBoot(2027);
            if (
              sim.start === 'arrival-cyclone' &&
              sim.nodeCount >= 102 &&
              sim.hasPack6Boss &&
              sim.hasPack7Boss &&
              sim.hasPack8Boss &&
              sim.hasPack9Minigame &&
              simAlt.nodeCount >= 102
            ) {
              bootSpy();
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
      REQUIRED_GAME_IDS: ['oz-chronicle'],
      getGameById: (id: string) =>
        id === 'oz-chronicle'
          ? {
              id: 'oz-chronicle',
              title: 'Chronicles of the Silver Road',
              description: 'Mock',
              icon: 'pool',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/oz-chronicle',
              loadModule: async () => {
                const { simulateOzChronicleBoot } = await import('./scene');
                const sim = simulateOzChronicleBoot(2026);
                const simAlt = simulateOzChronicleBoot(2027);
                if (
                  sim.start === 'arrival-cyclone' &&
                  sim.nodeCount >= 102 &&
                  sim.hasPack6Boss &&
                  sim.hasPack7Boss &&
                  sim.hasPack8Boss &&
                  sim.hasPack9Minigame &&
                  simAlt.nodeCount >= 102
                ) {
                  bootSpy();
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
          <GameContainer gameId="oz-chronicle" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => expect(bootSpy).toHaveBeenCalledTimes(1), { timeout: 12000 });
  }, 15000);
});
