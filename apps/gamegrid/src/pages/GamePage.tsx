import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GameContainer } from '../game/GameContainer';
import { resolveGameId } from '../registry/games';
import { persistence } from '../systems/persistence';
import { loadMultiplayerLaunchSession } from '../mp/session';
import { trackTelemetry } from '../systems/telemetry';

export function GamePage() {
  const { gameId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resolvedGameId = resolveGameId(gameId);
  const multiplayer = loadMultiplayerLaunchSession();
  const launchContext = multiplayer && multiplayer.gameId === resolvedGameId ? multiplayer : undefined;
  const ranked = searchParams.get('ranked') === '1';

  useEffect(() => {
    if (resolvedGameId !== gameId) {
      navigate(`/play/${resolvedGameId}`, { replace: true });
    }
  }, [gameId, navigate, resolvedGameId]);

  useEffect(() => {
    trackTelemetry({ type: 'page_view', page: `game:${resolvedGameId}` });
  }, [resolvedGameId]);

  return (
    <GameContainer
      gameId={resolvedGameId}
      multiplayer={launchContext}
      ranked={ranked}
      onInvalidGame={() => {
        const fallback = resolveGameId(persistence.loadStats().lastPlayed ?? '');
        if (fallback) {
          navigate(`/play/${fallback}`, { replace: true });
          return;
        }
        navigate('/', { replace: true });
      }}
    />
  );
}
