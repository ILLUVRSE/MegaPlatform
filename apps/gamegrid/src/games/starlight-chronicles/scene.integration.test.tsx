import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

describe('starlight chronicles route boot integration', () => {
  it('boots and performs star map node selection simulation headlessly', async () => {
    const starMapSpy = vi.fn();
    const crewSpy = vi.fn();

    vi.resetModules();
    vi.doMock('../../registry/games', () => ({
      GAME_REGISTRY: [
        {
          id: 'starlight-chronicles',
          title: 'Starlight Chronicles',
          description: 'Mock',
          icon: 'star',
          inputType: 'hybrid',
          status: 'live',
          route: '/play/starlight-chronicles',
          loadModule: async () => {
            const { simulateStarMapSelectionHeadless, simulateCrewBootAndNodeHeadless } = await import('./scene');
            const sim = simulateStarMapSelectionHeadless(9876);
            if (sim.firstNodeType) starMapSpy();
            const crewSim = simulateCrewBootAndNodeHeadless(9876);
            if (crewSim.ok) crewSpy();
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
      REQUIRED_GAME_IDS: ['starlight-chronicles'],
      getGameById: (id: string) =>
        id === 'starlight-chronicles'
          ? {
              id: 'starlight-chronicles',
              title: 'Starlight Chronicles',
              description: 'Mock',
              icon: 'star',
              inputType: 'hybrid',
              status: 'live',
              route: '/play/starlight-chronicles',
              loadModule: async () => {
                const { simulateStarMapSelectionHeadless, simulateCrewBootAndNodeHeadless } = await import('./scene');
                const sim = simulateStarMapSelectionHeadless(9876);
                if (sim.firstNodeType) starMapSpy();
                const crewSim = simulateCrewBootAndNodeHeadless(9876);
                if (crewSim.ok) crewSpy();
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
          <GameContainer gameId="starlight-chronicles" onInvalidGame={() => undefined} />
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await waitFor(() => {
      expect(starMapSpy).toHaveBeenCalledTimes(1);
      expect(crewSpy).toHaveBeenCalledTimes(1);
    }, { timeout: 12000 });
  });
});
