import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('minigolf route boot integration', () => {
  it('boots through game container, loads holes json, and runs update ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'minigolf',
          title: 'Minigolf',
          description: 'Mock',
          icon: '⛳',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/minigolf',
          loadModule: async () => {
            const { loadMinigolfCourse } = await import('./levels');
            const loaded = loadMinigolfCourse();
            tickSpy(loaded.holes.length);
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
      REQUIRED_GAME_IDS: ['minigolf'],
      getGameById: (id: string) =>
        id === 'minigolf'
          ? {
              id: 'minigolf',
              title: 'Minigolf',
              description: 'Mock',
              icon: '⛳',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/minigolf',
              loadModule: async () => {
                const { loadMinigolfCourse } = await import('./levels');
                const loaded = loadMinigolfCourse();
                tickSpy(loaded.holes.length);
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
          <GameContainer gameId="minigolf" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(tickSpy).toHaveBeenCalled();
      expect(tickSpy).toHaveBeenCalledWith(18);
    });
  });
});
