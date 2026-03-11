import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { loadGoalieChallenges } from './challenges';

describe('goalie-gauntlet route boot integration', () => {
  it('boots through game container, loads challenges, and runs ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'goalie-gauntlet',
          title: 'Goalie Gauntlet',
          description: 'Mock',
          icon: '🧤',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/goalie-gauntlet',
          loadModule: async () => ({
            createGame: () => {
              const catalog = loadGoalieChallenges();
              if (catalog.challenges.length < 10) {
                throw new Error('challenge catalog invalid');
              }
              for (let i = 0; i < 14; i += 1) tickSpy();
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
      REQUIRED_GAME_IDS: ['goalie-gauntlet'],
      getGameById: (id: string) =>
        id === 'goalie-gauntlet'
          ? {
              id: 'goalie-gauntlet',
              title: 'Goalie Gauntlet',
              description: 'Mock',
              icon: '🧤',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/goalie-gauntlet',
              loadModule: async () => ({
                createGame: () => {
                  const catalog = loadGoalieChallenges();
                  if (catalog.challenges.length < 10) {
                    throw new Error('challenge catalog invalid');
                  }
                  for (let i = 0; i < 14; i += 1) tickSpy();
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
          <GameContainer gameId="goalie-gauntlet" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(tickSpy).toHaveBeenCalledTimes(14);
  });
});
