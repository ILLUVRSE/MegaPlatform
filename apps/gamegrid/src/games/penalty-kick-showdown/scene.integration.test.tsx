import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('penalty-kick-showdown route boot integration', () => {
  it('boots through game container and runs update ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'penalty-kick-showdown',
          title: 'Penalty Kick Showdown',
          description: 'Mock',
          icon: '🥅',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/penalty-kick-showdown',
          loadModule: async () => ({
            createGame: () => {
              for (let i = 0; i < 12; i += 1) tickSpy();
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
      REQUIRED_GAME_IDS: ['penalty-kick-showdown'],
      getGameById: (id: string) =>
        id === 'penalty-kick-showdown'
          ? {
              id: 'penalty-kick-showdown',
              title: 'Penalty Kick Showdown',
              description: 'Mock',
              icon: '🥅',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/penalty-kick-showdown',
              loadModule: async () => ({
                createGame: () => {
                  for (let i = 0; i < 12; i += 1) tickSpy();
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
          <GameContainer gameId="penalty-kick-showdown" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(tickSpy).toHaveBeenCalledTimes(12);
  });
});
