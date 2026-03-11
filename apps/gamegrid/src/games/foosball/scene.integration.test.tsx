import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('foosball route boot integration', () => {
  it('boots through game container, loads drills json, and runs update ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'foosball',
          title: 'Foosball',
          description: 'Mock',
          icon: '⚽',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/foosball',
          loadModule: async () => {
            const { loadFoosballDrills } = await import('./drills');
            const loaded = loadFoosballDrills();
            tickSpy(loaded.drills.length);
            for (let i = 0; i < 5; i += 1) tickSpy();
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
      REQUIRED_GAME_IDS: ['foosball'],
      getGameById: (id: string) =>
        id === 'foosball'
          ? {
              id: 'foosball',
              title: 'Foosball',
              description: 'Mock',
              icon: '⚽',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/foosball',
              loadModule: async () => {
                const { loadFoosballDrills } = await import('./drills');
                const loaded = loadFoosballDrills();
                tickSpy(loaded.drills.length);
                for (let i = 0; i < 5; i += 1) tickSpy();
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
          <GameContainer gameId="foosball" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(tickSpy).toHaveBeenCalled();
      expect(tickSpy).toHaveBeenCalledWith(10);
    });
  });
});
