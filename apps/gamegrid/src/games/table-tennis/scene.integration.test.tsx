import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('table-tennis route boot integration', () => {
  it('boots through game container and runs update ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'table-tennis',
          title: 'Table Tennis',
          description: 'Mock',
          icon: '🏓',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/table-tennis',
          loadModule: async () => ({
            createGame: () => {
              for (let i = 0; i < 8; i += 1) tickSpy();
              return {
                pause: () => undefined,
                resume: () => undefined,
                mute: () => undefined,
                destroy: () => undefined
              };
            }
          })
        }
      ],
      REQUIRED_GAME_IDS: ['table-tennis'],
      getGameById: (id: string) =>
        id === 'table-tennis'
          ? {
              id: 'table-tennis',
              title: 'Table Tennis',
              description: 'Mock',
              icon: '🏓',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/table-tennis',
              loadModule: async () => ({
                createGame: () => {
                  for (let i = 0; i < 8; i += 1) tickSpy();
                  return {
                    pause: () => undefined,
                    resume: () => undefined,
                    mute: () => undefined,
                    destroy: () => undefined
                  };
                }
              })
            }
          : undefined
    }));

    const { SettingsProvider } = await import('../../systems/settingsContext');
    const { GameContainer } = await import('../../game/GameContainer');
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <GameContainer gameId="table-tennis" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(tickSpy).toHaveBeenCalledTimes(8);
  });
});
