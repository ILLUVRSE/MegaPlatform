import type { PortalSettings } from '../types';
import { Icon } from './Icon';

interface PortalOverlayProps {
  title: string;
  paused: boolean;
  ended: boolean;
  settings: PortalSettings;
  hudScore?: string | number | null;
  hudTimer?: string | null;
  onPauseToggle: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
  onEndRound: () => void;
}

export function PortalOverlay({
  title,
  paused,
  ended,
  settings,
  hudScore,
  hudTimer,
  onPauseToggle,
  onHowToPlay,
  onSettings,
  onEndRound
}: PortalOverlayProps) {
  return (
    <>
      <header className="overlay-topbar" role="region" aria-label="Game HUD">
        <div className="overlay-title">
          <strong>{title}</strong>
          <div className="overlay-stats" aria-live="polite">
            <span>Score: {hudScore ?? '--'}</span>
            <span>Timer: {hudTimer ?? '--:--'}</span>
          </div>
        </div>
        <div className="overlay-topbar-right">
          <button className="gg-button gg-button--ghost" onClick={onPauseToggle}>
            <Icon name="pause" className="inline-icon" /> {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="gg-button gg-button--ghost" onClick={onHowToPlay}>
            <Icon name="info" className="inline-icon" /> How to Play
          </button>
          <button className="gg-button gg-button--ghost" onClick={onSettings}>
            <Icon name="settings" className="inline-icon" /> Settings
          </button>
          <button className="gg-button gg-button--quiet" onClick={onEndRound}>
            Finish Round
          </button>
        </div>
      </header>
      {settings.debugHud ? (
        <div className="debug-hud" data-testid="debug-hud">
          <strong>Debug HUD</strong>
          <span>Paused: {String(paused)}</span>
          <span>Ended: {String(ended)}</span>
        </div>
      ) : null}
    </>
  );
}
