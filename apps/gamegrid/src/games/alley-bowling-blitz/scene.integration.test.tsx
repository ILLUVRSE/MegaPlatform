import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('alley bowling blitz route boot integration', () => {
  it('boots through game container, loads challenges json, and runs update ticks without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'alley-bowling-blitz',
          title: 'Alley Bowling Blitz',
          description: 'Mock',
          icon: '🎳',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/alley-bowling-blitz',
          loadModule: async () => {
            const { createLaneModel, createBallFromRelease, stepBall } = await import('./physics');
            const { loadBowlingChallenges } = await import('./challenges');

            const lane = createLaneModel(1280, 720);
            const catalog = loadBowlingChallenges();
            tickSpy(catalog.challenges.length);

            const ball = createBallFromRelease({ startX: 640, startY: 680, angle: 0.02, speed: 620, spin: 0.5 }, lane);
            for (let i = 0; i < 8; i += 1) {
              stepBall(ball, lane, 1 / 120);
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
      REQUIRED_GAME_IDS: ['alley-bowling-blitz'],
      getGameById: (id: string) =>
        id === 'alley-bowling-blitz'
          ? {
              id: 'alley-bowling-blitz',
              title: 'Alley Bowling Blitz',
              description: 'Mock',
              icon: '🎳',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/alley-bowling-blitz',
              loadModule: async () => {
                const { createLaneModel, createBallFromRelease, stepBall } = await import('./physics');
                const { loadBowlingChallenges } = await import('./challenges');

                const lane = createLaneModel(1280, 720);
                const catalog = loadBowlingChallenges();
                tickSpy(catalog.challenges.length);

                const ball = createBallFromRelease({ startX: 640, startY: 680, angle: -0.02, speed: 640, spin: -0.5 }, lane);
                for (let i = 0; i < 8; i += 1) {
                  stepBall(ball, lane, 1 / 120);
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
          <GameContainer gameId="alley-bowling-blitz" onInvalidGame={() => undefined} />
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
