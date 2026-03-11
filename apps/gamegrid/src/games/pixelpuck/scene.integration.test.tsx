import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../../systems/settingsContext';
import { GamePage } from '../../pages/GamePage';

const tickSpy = vi.fn();

vi.mock('../../game/engine', () => ({
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

vi.mock('./index', () => ({
  createGame: () => {
    for (let i = 0; i < 5; i += 1) tickSpy();
    return {
      init: () => undefined,
      start: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      reset: () => undefined,
      mute: () => undefined,
      destroy: () => undefined
    };
  }
}));

describe('pixelpuck route boot integration', () => {
  it('boots through game container and runs headless ticks without exceptions', async () => {
    const user = userEvent.setup();

    render(
      <SettingsProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/play/pixelpuck']}>
          <Routes>
            <Route path="/play/:gameId" element={<GamePage />} />
          </Routes>
        </MemoryRouter>
      </SettingsProvider>
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(tickSpy).toHaveBeenCalledTimes(5);
  });
});
