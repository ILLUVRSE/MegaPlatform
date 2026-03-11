import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('checkers route boot integration', () => {
  it('boots through game container and runs basic evaluation ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'checkers',
          title: 'Checkers',
          description: 'Mock',
          icon: 'checker',
          inputType: 'tap',
          status: 'live',
          route: '/play/checkers',
          loadModule: async () => {
            for (let i = 0; i < 6; i += 1) {
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
      REQUIRED_GAME_IDS: ['checkers'],
      getGameById: (id: string) =>
        id === 'checkers'
          ? {
              id: 'checkers',
              title: 'Checkers',
              description: 'Mock',
              icon: 'checker',
              inputType: 'tap',
              status: 'live',
              route: '/play/checkers',
              loadModule: async () => {
                for (let i = 0; i < 6; i += 1) {
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
          <GameContainer gameId="checkers" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(tickSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
    });
  });
});
