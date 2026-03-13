import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../systems/settingsContext';
import { GamePage } from '../pages/GamePage';

type PlatformEvent =
  | { source: 'gamegrid'; type: 'ready'; gameId?: string }
  | { source: 'gamegrid'; type: 'game_start'; gameId: string; mode?: string }
  | { source: 'gamegrid'; type: 'game_end'; gameId: string; score?: number | string; winner?: string; outcome?: string }
  | { source: 'gamegrid'; type: 'telemetry'; gameId: string; event: string; [key: string]: unknown };

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

vi.mock('../games/pixelpuck/index', () => ({
  createGame: (target: HTMLDivElement, hooks: { gameId: string; reportEvent: (payload: Record<string, unknown>) => void }) => {
    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.textContent = 'Play smoke round';
    playButton.setAttribute('aria-label', 'Play smoke round');
    playButton.addEventListener('click', () => {
      hooks.reportEvent({ type: 'game_start', gameId: hooks.gameId, mode: 'smoke' });
      hooks.reportEvent({ type: 'telemetry', gameId: hooks.gameId, event: 'round_started', flow: 'pixelbrawl-smoke' });
      hooks.reportEvent({ type: 'telemetry', gameId: hooks.gameId, event: 'goal_scored', scorer: 'player' });
      hooks.reportEvent({ type: 'game_end', gameId: hooks.gameId, score: '1-0', winner: 'player', outcome: 'victory', mode: 'smoke' });
    });
    target.append(playButton);

    return {
      init: () => undefined,
      start: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      reset: () => undefined,
      mute: () => undefined,
      destroy: () => playButton.remove()
    };
  }
}));

describe('pixelbrawl embed smoke', () => {
  it('launches the pixelpuck shell path and emits telemetry platform events for a minimal round', async () => {
    const user = userEvent.setup();
    const platformEvents: PlatformEvent[] = [];
    const postSpy = vi.fn((payload: PlatformEvent) => {
      platformEvents.push(payload);
    });

    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage: postSpy }
    });

    render(
      createElement(
        SettingsProvider,
        null,
        createElement(
          MemoryRouter,
          { future: { v7_startTransition: true, v7_relativeSplatPath: true }, initialEntries: ['/play/pixelpuck'] },
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/play/:gameId', element: createElement(GamePage) })
          )
        )
      )
    );

    await user.click(await screen.findByRole('button', { name: 'Start' }));
    await user.click(await screen.findByRole('button', { name: 'Play smoke round' }));

    await waitFor(() => {
      expect(platformEvents.some((event) => event.type === 'game_end')).toBe(true);
    });

    expect(platformEvents[0]).toMatchObject({ source: 'gamegrid', type: 'ready', gameId: 'pixelpuck' });

    expect(platformEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'gamegrid', type: 'game_start', gameId: 'pixelpuck', mode: 'smoke' }),
        expect.objectContaining({ source: 'gamegrid', type: 'telemetry', gameId: 'pixelpuck', event: 'round_started' }),
        expect.objectContaining({ source: 'gamegrid', type: 'telemetry', gameId: 'pixelpuck', event: 'goal_scored' }),
        expect.objectContaining({
          source: 'gamegrid',
          type: 'game_end',
          gameId: 'pixelpuck',
          score: '1-0',
          winner: 'player',
          outcome: 'victory'
        })
      ])
    );

    const messageTypes = platformEvents
      .filter((event) => event.type !== 'ready' || event.gameId === 'pixelpuck')
      .map((event) => `${event.type}:${event.type === 'telemetry' ? event.event : ''}`);
    expect(messageTypes).toEqual([
      'ready:',
      'ready:',
      'game_start:',
      'telemetry:round_started',
      'telemetry:goal_scored',
      'game_end:'
    ]);
  });
});
