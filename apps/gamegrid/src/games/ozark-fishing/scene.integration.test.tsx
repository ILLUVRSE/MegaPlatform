import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('ozark fishing route boot integration', () => {
  it('boots through game container and runs core casting logic without exceptions', async () => {
    const tickSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'ozark-fishing',
          title: 'Ozark Fishing',
          description: 'Mock',
          icon: 'fish',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/ozark-fishing',
          loadModule: async () => {
            const { computeCastFromSwipe, computeBiteChancePerSecond } = await import('./rules');
            const { loadEnvironmentDefinition } = await import('./environment');
            const { loadFishCatalog, createHookedFish } = await import('./fish');
            const { loadLureCatalog } = await import('./rules');
            const { loadSpotCatalog } = await import('./content');

            const cast = computeCastFromSwipe(18, -160, true);
            const env = loadEnvironmentDefinition();
            const fish = loadFishCatalog()[0];
            const lure = loadLureCatalog()[0];
            const spot = loadSpotCatalog()[0];
            const hooked = createHookedFish(fish, 'good', 0.42);
            const chance = computeBiteChancePerSecond({
              fish,
              lure,
              spot,
              environment: env,
              weather: 'sunny',
              timeOfDay: 'day',
              depth: 'shallow',
              zone: 'shoreline',
              lineVisibilityPenalty: 0
            });
            if (chance > 0 && cast.distanceNorm > 0 && hooked.staminaMax > 0) tickSpy();

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
      REQUIRED_GAME_IDS: ['ozark-fishing'],
      getGameById: (id: string) =>
        id === 'ozark-fishing'
          ? {
              id: 'ozark-fishing',
              title: 'Ozark Fishing',
              description: 'Mock',
              icon: 'fish',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/ozark-fishing',
              loadModule: async () => {
                const { computeCastFromSwipe, computeBiteChancePerSecond } = await import('./rules');
                const { loadEnvironmentDefinition } = await import('./environment');
                const { loadFishCatalog, createHookedFish } = await import('./fish');
                const { loadLureCatalog } = await import('./rules');
                const { loadSpotCatalog } = await import('./content');

                const cast = computeCastFromSwipe(18, -160, true);
                const env = loadEnvironmentDefinition();
                const fish = loadFishCatalog()[0];
                const lure = loadLureCatalog()[0];
                const spot = loadSpotCatalog()[0];
                const hooked = createHookedFish(fish, 'good', 0.42);
                const chance = computeBiteChancePerSecond({
                  fish,
                  lure,
                  spot,
                  environment: env,
                  weather: 'sunny',
                  timeOfDay: 'day',
                  depth: 'shallow',
                  zone: 'shoreline',
                  lineVisibilityPenalty: 0
                });
                if (chance > 0 && cast.distanceNorm > 0 && hooked.staminaMax > 0) tickSpy();

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
          <GameContainer gameId="ozark-fishing" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => expect(tickSpy).toHaveBeenCalledTimes(1));
  });
});
