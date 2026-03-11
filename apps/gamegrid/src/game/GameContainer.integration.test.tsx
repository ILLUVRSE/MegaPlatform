import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../systems/settingsContext';
import { GAME_REGISTRY } from '../registry/games';
import { GamePage } from '../pages/GamePage';

vi.mock('./engine', () => ({
  createPortalGame: () => ({
    init: () => undefined,
    start: () => undefined,
    pause: () => undefined,
    resume: () => undefined,
    reset: () => undefined,
    mute: () => undefined,
    destroy: () => undefined
  })
}));

describe('game route boot integration', () => {
  it.each(GAME_REGISTRY.map((game) => game.id))('boots route for %s without crashing', async (gameId) => {
    render(
      <SettingsProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[`/play/${gameId}`]}>
          <Routes>
            <Route path="/play/:gameId" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      </SettingsProvider>
    );

    expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
  });
});
