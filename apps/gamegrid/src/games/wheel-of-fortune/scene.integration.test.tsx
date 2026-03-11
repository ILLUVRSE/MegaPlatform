import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('wheel of fortune route boot integration', () => {
  it('boots through game container and runs scoring utilities without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'wheel-of-fortune',
          title: 'Wheel of Fortune',
          description: 'Mock',
          icon: 'wheel',
          inputType: 'tap',
          status: 'live',
          route: '/play/wheel-of-fortune',
          loadModule: async () => {
            const { comboMultiplier, nextCombo } = await import('./scoring');
            let combo = 0;
            for (let i = 0; i < 8; i += 1) {
              combo = nextCombo(combo, i % 2 === 0);
              comboMultiplier(combo);
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
      REQUIRED_GAME_IDS: ['wheel-of-fortune'],
      getGameById: (id: string) =>
        id === 'wheel-of-fortune'
          ? {
              id: 'wheel-of-fortune',
              title: 'Wheel of Fortune',
              description: 'Mock',
              icon: 'wheel',
              inputType: 'tap',
              status: 'live',
              route: '/play/wheel-of-fortune',
              loadModule: async () => {
                const { comboMultiplier, nextCombo } = await import('./scoring');
                let combo = 0;
                for (let i = 0; i < 8; i += 1) {
                  combo = nextCombo(combo, i % 2 === 0);
                  comboMultiplier(combo);
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
          <GameContainer gameId="wheel-of-fortune" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(tickSpy.mock.calls.length).toBeGreaterThanOrEqual(8);
    });
  });
});
