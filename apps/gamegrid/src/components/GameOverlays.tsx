import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface OverlayProps {
  open: boolean;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: 'default' | 'danger';
}

function OverlayCard({ open, title, subtitle, children, actions, tone = 'default' }: OverlayProps) {
  if (!open) return null;
  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className={`overlay-card${tone === 'danger' ? ' overlay-card--danger' : ''}`}>
        <header className="overlay-card-header">
          <h2>{title}</h2>
          {subtitle ? <p className="overlay-card-subtitle">{subtitle}</p> : null}
        </header>
        {children ? <div className="overlay-card-body">{children}</div> : null}
        {actions ? <footer className="overlay-card-actions">{actions}</footer> : null}
      </section>
    </div>
  );
}

export function LoadingOverlay({ open, message }: { open: boolean; message?: string }) {
  return (
    <OverlayCard open={open} title="Loading" subtitle={message ?? 'Preparing game assets...'}>
      <div className="overlay-loading-bar" aria-hidden="true">
        <span />
      </div>
    </OverlayCard>
  );
}

export function ErrorOverlay({
  open,
  message,
  onRetry,
  onExit
}: {
  open: boolean;
  message: string;
  onRetry?: () => void;
  onExit?: () => void;
}) {
  return (
    <OverlayCard
      open={open}
      title="Game failed to start"
      subtitle="Something went wrong while loading the game."
      tone="danger"
      actions={
        <>
          {onRetry ? (
            <button className="gg-button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
          {onExit ? (
            <button className="gg-button gg-button--ghost" onClick={onExit}>
              Exit
            </button>
          ) : null}
        </>
      }
    >
      <p className="overlay-card-muted">{message}</p>
    </OverlayCard>
  );
}

export function PauseOverlay({
  open,
  onResume,
  onRestart,
  onExit
}: {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <OverlayCard
      open={open}
      title="Paused"
      subtitle="Take a breather and jump back in when ready."
      actions={
        <>
          <button className="gg-button" onClick={onResume}>
            <Icon name="play" className="inline-icon" /> Resume
          </button>
          <button className="gg-button gg-button--ghost" onClick={onRestart}>
            Restart
          </button>
          <button className="gg-button gg-button--danger" onClick={onExit}>
            Exit
          </button>
        </>
      }
    />
  );
}

export function ResultsOverlay({
  open,
  score,
  best,
  outcome,
  ticketsEarned,
  questCompletions,
  rankDelta,
  battlePassTiers,
  onRetry,
  onExit
}: {
  open: boolean;
  score?: number | string | null;
  best?: number | string | null;
  outcome?: string | null;
  ticketsEarned?: number;
  questCompletions?: string[];
  rankDelta?: number | null;
  battlePassTiers?: number;
  onRetry: () => void;
  onExit: () => void;
}) {
  const hasRewards = Boolean(ticketsEarned) || (questCompletions && questCompletions.length > 0) || Boolean(rankDelta) || Boolean(battlePassTiers);
  return (
    <OverlayCard
      open={open}
      title="Round Complete"
      subtitle={outcome ?? 'Nice run!'}
      actions={
        <>
          <button className="gg-button" onClick={onRetry}>
            Retry
          </button>
          <button className="gg-button gg-button--ghost" onClick={onExit}>
            <Icon name="back" className="inline-icon" /> Exit
          </button>
        </>
      }
    >
      <div className="results-grid">
        <div className="results-stat">
          <span>Score</span>
          <strong>{score ?? '--'}</strong>
        </div>
        <div className="results-stat">
          <span>Best</span>
          <strong>{best ?? '--'}</strong>
        </div>
        {hasRewards ? (
          <div className="results-stat">
            <span>Coins Earned</span>
            <strong>{ticketsEarned ? `+${ticketsEarned}` : '--'}</strong>
          </div>
        ) : null}
        {rankDelta !== undefined && rankDelta !== null ? (
          <div className="results-stat">
            <span>Rank Delta</span>
            <strong>{rankDelta >= 0 ? `+${rankDelta}` : String(rankDelta)}</strong>
          </div>
        ) : null}
        {battlePassTiers ? (
          <div className="results-stat">
            <span>Battle Pass</span>
            <strong>+{battlePassTiers} tier</strong>
          </div>
        ) : null}
      </div>
      {questCompletions && questCompletions.length > 0 ? (
        <div className="results-quests">
          <span>Quest Complete</span>
          <strong>{questCompletions.join(', ')}</strong>
        </div>
      ) : null}
    </OverlayCard>
  );
}
