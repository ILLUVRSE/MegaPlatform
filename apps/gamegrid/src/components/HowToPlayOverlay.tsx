import { GAME_REGISTRY } from '../registry/games';
import { GAME_INSTRUCTIONS, GLOBAL_HOW_TO_PLAY } from '../content/howToPlay';

interface HowToPlayOverlayProps {
  open: boolean;
  onClose: () => void;
  gameId?: string | null;
}

export function HowToPlayOverlay({ open, onClose, gameId }: HowToPlayOverlayProps) {
  if (!open) return null;
  const game = gameId ? GAME_REGISTRY.find((entry) => entry.id === gameId) : null;
  const instructions = gameId ? GAME_INSTRUCTIONS[gameId] ?? GLOBAL_HOW_TO_PLAY : GLOBAL_HOW_TO_PLAY;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="How to Play">
      <section className="modal-panel">
        <h2>How to Play</h2>
        {game ? <p className="modal-subtitle">{game.title}</p> : null}
        <div className="instructions-stack" role="list" aria-label="Instructions">
          {instructions.map((line) => (
            <p key={line} role="listitem">
              {line}
            </p>
          ))}
        </div>
        <button onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
