import { useEffect, useMemo, useRef, useState } from 'react';
import { getGameById } from '../registry/games';
import { computeContainSize } from '../systems/scaleManager';
import { createEmbedBridge } from '../systems/postMessageBridge';
import { applySafeAreaInsets } from '../systems/safeArea';
import { unlockAudio } from '../systems/audioUnlock';
import { persistence } from '../systems/persistence';
import { applyGameEndToStats } from '../systems/progression';
import { applyDailyQuestProgress } from '../systems/dailyQuests';
import { applyMatchRewards } from '../systems/economy';
import { applyBattlePassXp } from '../systems/battlePass';
import { applyRankedMatch } from '../systems/ranks';
import { setCategoryMuted } from '../systems/audioManager';
import { trackAssetLoad } from '../systems/perfMonitor';
import { trackEvent } from '../systems/analytics';
import { installInputGuards } from '../systems/inputGuards';
import { useSettings } from '../systems/settingsContext';
import { PortalOverlay } from '../components/PortalOverlay';
import { HowToPlayOverlay } from '../components/HowToPlayOverlay';
import { SettingsModal } from '../components/SettingsModal';
import { ErrorOverlay, LoadingOverlay, PauseOverlay, ResultsOverlay } from '../components/GameOverlays';
import { createPortalGame, type GameEngine } from './engine';
import type { LoadedGameModule } from './modules';
import { useNavigate } from 'react-router-dom';
import type { MultiplayerLaunchContext } from '../mp/session';

interface GameContainerProps {
  gameId: string;
  multiplayer?: MultiplayerLaunchContext;
  ranked?: boolean;
  onInvalidGame: () => void;
}

export function GameContainer({ gameId, multiplayer, ranked = false, onInvalidGame }: GameContainerProps) {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const game = useMemo(() => getGameById(gameId), [gameId]);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootCycle, setBootCycle] = useState(0);
  const [bootState, setBootState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [audioGateOpen, setAudioGateOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [runtimeToast, setRuntimeToast] = useState<string | null>(null);
  const [hudScore, setHudScore] = useState<string | number | null>(null);
  const [hudTimer, setHudTimer] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<string | number | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const [bestScore, setBestScore] = useState<string | number | null>(null);
  const [lastTicketsEarned, setLastTicketsEarned] = useState(0);
  const [lastQuestCompletions, setLastQuestCompletions] = useState<string[]>([]);
  const [lastRankDelta, setLastRankDelta] = useState<number | null>(null);
  const [lastBattlePassTiers, setLastBattlePassTiers] = useState(0);
  const toastTimerRef = useRef<number | null>(null);
  const bridgeRef = useRef<ReturnType<typeof createEmbedBridge> | null>(null);
  const hasActiveRoundRef = useRef(false);
  const lastGameEndRef = useRef<{ signature: string; timeMs: number } | null>(null);

  useEffect(() => {
    if (!game) {
      onInvalidGame();
      return;
    }
    const stats = persistence.loadStats();
    persistence.saveStats({ ...stats, lastPlayed: gameId });
    setBestScore(stats.perGame[gameId]?.bestScore ?? null);
    setLastScore(null);
    setLastOutcome(null);
    setEnded(false);
  }, [game, gameId, onInvalidGame]);

  useEffect(() => {
    if (!game || !mountRef.current || !audioGateOpen) return;
    let disposed = false;
    let currentEngine: GameEngine | null = null;
    setLoading(true);
    setBootState('loading');
    setBootError(null);
    setRuntimeToast(null);

    const load = () => trackAssetLoad(`bundle:${gameId}`, () => game.loadModule());
    load()
      .then((module: LoadedGameModule) => {
        if (disposed || !mountRef.current) return;
        try {
          if (module.createGame) {
            currentEngine = module.createGame(mountRef.current, {
              gameId,
              backToLobby: () => navigate(multiplayer ? '/party' : '/'),
              reportEvent: (payload) => {
                bridgeRef.current?.post(payload);
                const payloadMode =
                  typeof (payload as { mode?: unknown }).mode === 'string'
                    ? (payload as { mode?: string }).mode ?? null
                    : null;
                const payloadOutcome =
                  typeof (payload as { outcome?: unknown }).outcome === 'string'
                    ? (payload as { outcome?: string }).outcome ?? null
                    : null;
                const payloadWinner =
                  typeof (payload as { winner?: unknown }).winner === 'string'
                    ? (payload as { winner?: string }).winner ?? null
                    : null;
                if (payload.type === 'game_start') {
                  trackEvent({ type: 'game_start', gameId, mode: payloadMode });
                }
                if (payload.type === 'game_end') {
                  trackEvent({
                    type: 'game_end',
                    gameId,
                    score: payload.score ?? null,
                    outcome: payloadOutcome,
                    mode: payloadMode
                  });
                }
                if (payload.type === 'error') {
                  trackEvent({ type: 'error', gameId, message: payload.message });
                }
                if (payload.type === 'hud_update') {
                  if (payload.gameId === gameId) {
                    setHudScore(payload.score ?? null);
                    setHudTimer(payload.timer ?? null);
                  }
                  return;
                }
                if (toastTimerRef.current !== null) {
                  window.clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = null;
                }
                if (payload.type === 'game_start') {
                  hasActiveRoundRef.current = true;
                  if (gameId !== 'pixelpuck') setRuntimeToast('Match live.');
                  setLastTicketsEarned(0);
                  setLastQuestCompletions([]);
                  setLastRankDelta(null);
                  setLastBattlePassTiers(0);
                }
                if (payload.type === 'game_end') {
                  const isPractice = payloadMode === 'practice';
                  const signature = [
                    gameId,
                    String(payloadMode ?? ''),
                    String(payload.score ?? ''),
                    String(payloadOutcome ?? ''),
                    String(payloadWinner ?? '')
                  ].join('|');
                  const nowMs = performance.now();
                  const recentMatchEnd = lastGameEndRef.current;
                  const duplicate =
                    recentMatchEnd?.signature === signature && nowMs - recentMatchEnd.timeMs < 3000;
                  if (!isPractice && (hasActiveRoundRef.current || !duplicate)) {
                    const currentStats = persistence.loadStats();
                    const update = applyGameEndToStats(currentStats, gameId, payload);
                    const questUpdate = applyDailyQuestProgress(update.next, {
                      gameId,
                      score: payload.score ?? null,
                      outcome: payloadOutcome,
                      winner: payloadWinner,
                      multiplayer: Boolean(multiplayer)
                    });
                    const rewardUpdate = applyMatchRewards(questUpdate.next, payload);
                    const battlePassUpdate = applyBattlePassXp(rewardUpdate.next, update.xpGained);
                    let rankedUpdate = { next: battlePassUpdate.next, delta: 0 };
                    const winner = payloadWinner;
                    const outcome = typeof payloadOutcome === 'string' ? payloadOutcome.toLowerCase() : '';
                    const isWin =
                      winner === 'player' ||
                      winner === 'home' ||
                      winner === 'p1' ||
                      winner === 'team-a' ||
                      outcome.includes('win') ||
                      outcome.includes('victory');
                    if (ranked && (winner || payloadOutcome)) {
                      rankedUpdate = applyRankedMatch(battlePassUpdate.next, gameId, isWin);
                    }
                    persistence.saveStats(rankedUpdate.next);
                    setBestScore(rankedUpdate.next.perGame[gameId]?.bestScore ?? null);
                    setLastTicketsEarned(rewardUpdate.ticketsEarned + questUpdate.ticketsEarned);
                    setLastQuestCompletions(questUpdate.completed.map((quest) => quest.name));
                    setLastBattlePassTiers(battlePassUpdate.tiersGained);
                    setLastRankDelta(ranked ? rankedUpdate.delta : null);
                  }
                  lastGameEndRef.current = { signature, timeMs: nowMs };
                  hasActiveRoundRef.current = false;
                  setEnded(true);
                  setLastScore(payload.score ?? null);
                  setLastOutcome(payloadOutcome);
                  const scoreValue =
                    typeof payload.score === 'number' || typeof payload.score === 'string'
                      ? ` Score ${String(payload.score)}.`
                      : '';
                  if (gameId !== 'pixelpuck') setRuntimeToast(`Round complete.${scoreValue}`);
                }
                if (payload.type === 'error') {
                  if (gameId !== 'pixelpuck') setRuntimeToast(`Runtime error: ${payload.message}`);
                }
                toastTimerRef.current = window.setTimeout(() => {
                  setRuntimeToast(null);
                  toastTimerRef.current = null;
                }, 2200);
                if (payload.type === 'game_end' && payloadMode !== 'practice') {
                  void window.gamegridAds?.requestInterstitial({ reason: 'match_end', gameId });
                }
              },
              multiplayer
            });
          } else {
            const sceneLabel = module.createSceneLabel ? module.createSceneLabel() : gameId;
            currentEngine = createPortalGame(mountRef.current, sceneLabel);
            bridgeRef.current?.post({ type: 'game_start', gameId });
          }
          currentEngine.init?.();
          currentEngine.start?.();
          currentEngine.mute(settings.mute);
          setEngine(currentEngine);
          setLoading(false);
          setBootState('ready');
          setRetryCount(0);
        } catch (error) {
          currentEngine?.destroy();
          currentEngine = null;
          setEngine(null);
          throw error;
        }
      })
      .catch((error: Error) => {
        if (disposed) return;
        currentEngine?.destroy();
        currentEngine = null;
        setEngine(null);
        setLoading(false);
        const message = error?.message ?? 'Unknown error';
        if (import.meta.env.DEV) {
          // Surface boot failures during local development.
          console.error('Game boot failed:', error);
        }
        const isChunkLoadError =
          /Loading chunk|ChunkLoadError|dynamically imported module|module script failed/i.test(message);
        if (isChunkLoadError && retryCount < 1) {
          setRetryCount((prev) => prev + 1);
          setBootCycle((prev) => prev + 1);
          return;
        }
        const detail = import.meta.env.DEV && error?.stack ? `${message}\n${error.stack}` : message;
        setBootError(detail);
        setBootState('failed');
        bridgeRef.current?.post({ type: 'error', message, gameId });
      });

    return () => {
      disposed = true;
      currentEngine?.destroy();
      setEngine(null);
    };
  }, [game, settings.mute, audioGateOpen, gameId, navigate, multiplayer, bootCycle, retryCount]);

  useEffect(() => {
    document.body.classList.add('game-mode');
    return () => document.body.classList.remove('game-mode');
  }, []);

  useEffect(() => {
    const target = mountRef.current;
    if (!target) return;
    return installInputGuards(target);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (bootState === 'ready') return;
    setShowHowToPlay(false);
    setShowSettings(false);
  }, [bootState]);

  useEffect(() => {
    const resize = () => {
      const root = mountRef.current;
      if (!root) return;
      const size = computeContainSize(window.innerWidth, window.innerHeight);
      root.style.width = `${size.width}px`;
      root.style.height = `${size.height}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const onPause = () => {
      engine?.pause();
      setPaused(true);
    };
    const onResume = () => {
      engine?.resume();
      setPaused(false);
    };

    bridgeRef.current = createEmbedBridge({
      onPause,
      onResume,
      onMute: () => updateSettings({ mute: true }),
      onUnmute: () => updateSettings({ mute: false }),
      onSetSafeArea: applySafeAreaInsets
    });

    bridgeRef.current.post({ type: 'ready', gameId });

    return () => {
      bridgeRef.current?.dispose();
      bridgeRef.current = null;
    };
  }, [engine, gameId, updateSettings]);

  useEffect(() => {
    if (!engine) return;
    engine.mute(settings.mute);
  }, [engine, settings.mute]);

  useEffect(() => {
    setCategoryMuted('music', settings.musicMuted);
    setCategoryMuted('sfx', settings.sfxMuted);
  }, [settings.musicMuted, settings.sfxMuted]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        engine?.pause();
        setPaused(true);
      }
    };
    const onBlur = () => {
      engine?.pause();
      setPaused(true);
    };
    const onFocus = () => {
      if (!paused || userPaused) return;
      engine?.resume();
      setPaused(false);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [engine, paused, userPaused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gameId !== 'pixelpuck') {
        setPaused((prev) => {
          const next = !prev;
          if (next) engine?.pause();
          else engine?.resume();
          setUserPaused(next);
          if (next) trackEvent({ type: 'game_pause', gameId });
          else trackEvent({ type: 'game_resume', gameId });
          return next;
        });
      }
      if (event.key.toLowerCase() === 'm') {
        updateSettings({ mute: !settings.mute });
      }
      if (event.key.toLowerCase() === 'r' && ended) {
        setEnded(false);
        setPaused(false);
        setUserPaused(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [engine, ended, settings.mute, updateSettings]);

  if (!game) return null;
  const useInGameHud = gameId === 'pixelpuck' || gameId === 'throw-darts';

  const togglePause = () => {
    if (gameId === 'pixelpuck') return;
    setPaused((prev) => {
      const next = !prev;
      if (next) engine?.pause();
      else engine?.resume();
      setUserPaused(next);
      if (next) trackEvent({ type: 'game_pause', gameId });
      else trackEvent({ type: 'game_resume', gameId });
      return next;
    });
  };

  const unlock = async () => {
    await unlockAudio();
    setAudioGateOpen(true);
  };

  const retryBoot = () => {
    setBootError(null);
    setLoading(false);
    setEngine(null);
    setBootState('loading');
    setRetryCount(0);
    setBootCycle((prev) => prev + 1);
  };

  return (
    <main className="game-shell">
      {bootState === 'ready' && !useInGameHud ? (
        <PortalOverlay
          title={game.title}
          paused={paused}
          ended={ended}
          settings={settings}
          hudScore={hudScore}
          hudTimer={hudTimer}
          onPauseToggle={togglePause}
          onHowToPlay={() => setShowHowToPlay(true)}
          onSettings={() => setShowSettings(true)}
          onEndRound={() => {
            setEnded(true);
            bridgeRef.current?.post({ type: 'game_end', gameId, score: 0 });
          }}
        />
      ) : null}
      {!audioGateOpen ? (
        <div className="audio-gate" role="dialog" aria-label="Start game">
          <p>Tap to start</p>
          <button className="gg-button" onClick={unlock}>
            Start
          </button>
        </div>
      ) : null}
      <ErrorOverlay
        open={Boolean(bootError)}
        message={settings.debugHud ? bootError ?? 'Unknown error.' : 'Please try again.'}
        onRetry={retryBoot}
        onExit={() => {
          trackEvent({ type: 'game_exit', gameId });
          navigate(multiplayer ? '/party' : '/');
        }}
      />
      <div className="stage-wrap">
        <div ref={mountRef} className="portal-stage" />
      </div>
      <LoadingOverlay open={loading} message="Loading game bundle..." />
      {runtimeToast ? <div className="gameplay-toast">{runtimeToast}</div> : null}
      {bootState === 'ready' && !useInGameHud ? (
        <HowToPlayOverlay open={showHowToPlay} gameId={gameId} onClose={() => setShowHowToPlay(false)} />
      ) : null}
      {bootState === 'ready' && !useInGameHud ? <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} /> : null}
      {bootState === 'ready' && !useInGameHud ? (
        <PauseOverlay
          open={paused}
          onResume={togglePause}
          onRestart={() => {
            engine?.reset();
            setEnded(false);
            setPaused(false);
            setUserPaused(false);
            trackEvent({ type: 'game_retry', gameId });
          }}
          onExit={() => {
            trackEvent({ type: 'game_exit', gameId });
            navigate(multiplayer ? '/party' : '/');
          }}
        />
      ) : null}
      {bootState === 'ready' && !useInGameHud ? (
        <ResultsOverlay
          open={ended}
          score={lastScore ?? hudScore}
          best={bestScore}
          outcome={lastOutcome}
          ticketsEarned={lastTicketsEarned}
          questCompletions={lastQuestCompletions}
          rankDelta={lastRankDelta}
          battlePassTiers={lastBattlePassTiers}
          onRetry={() => {
            engine?.reset();
            setEnded(false);
            setPaused(false);
            setUserPaused(false);
            trackEvent({ type: 'game_retry', gameId });
          }}
          onExit={() => {
            trackEvent({ type: 'game_exit', gameId });
            navigate(multiplayer ? '/party' : '/');
          }}
        />
      ) : null}
    </main>
  );
}
