import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('card-table route boot integration', () => {
  it('boots game container and switches into two modes without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'card-table',
          title: 'Card Table',
          description: 'Mock',
          icon: '🂡',
          inputType: 'mouse',
          status: 'live',
          route: '/play/card-table',
          loadModule: async () => ({
            createGame: () => {
              tickSpy('mode-select');
              tickSpy('blackjack');
              tickSpy('higher-lower');
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
      REQUIRED_GAME_IDS: ['card-table'],
      resolveGameId: (id: string) => (id === 'texas-holdem' ? 'card-table' : id),
      getGameById: (id: string) =>
        id === 'card-table' || id === 'texas-holdem'
          ? {
              id: 'card-table',
              title: 'Card Table',
              description: 'Mock',
              icon: '🂡',
              inputType: 'mouse',
              status: 'live',
              route: '/play/card-table',
              loadModule: async () => ({
                createGame: () => {
                  tickSpy('mode-select');
                  tickSpy('blackjack');
                  tickSpy('higher-lower');
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
          <GameContainer gameId="card-table" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(tickSpy).toHaveBeenCalledWith('mode-select');
    expect(tickSpy).toHaveBeenCalledWith('blackjack');
    expect(tickSpy).toHaveBeenCalledWith('higher-lower');
  });
});
