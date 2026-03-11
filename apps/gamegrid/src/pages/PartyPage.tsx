import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { GAME_REGISTRY } from '../registry/games';
import { persistence } from '../systems/persistence';
import { resolveEquippedLabel } from '../systems/shop';
import { trackTelemetry } from '../systems/telemetry';
import type { RoomState } from '../mp/room';
import { PartyClient, type PartyServerEvent, type PartySession } from '../mp/partyClient';
import { getMpAdapterDescriptor } from '../mp/adapters';
import {
  clearMultiplayerLaunchSession,
  loadPartySession,
  saveMultiplayerLaunchSession,
  savePartySession,
  type MultiplayerLaunchContext
} from '../mp/session';
import { deterministicSeedOrder } from '../games/ozark-fishing/tournament/bracket';
import { estimateTournamentDurationMin, estimateTournamentRounds } from '../games/ozark-fishing/tournament/tournament';
import { loadTournamentHistory } from '../games/ozark-fishing/tournament/history';

const DEFAULT_SIGNALING_URL = (import.meta.env.VITE_SIGNALING_URL as string | undefined) ?? 'ws://localhost:8787';
const DEFAULT_OZARK_OPTIONS = {
  partyMode: 'derby',
  durationSec: 300,
  weather: 'random',
  time: 'random',
  assistAllowed: true,
  spot: 'random',
  gearFairness: 'standardized',
  rarityMultipliers: false,
  useWeeklyEvent: true,
  tournamentMode: false,
  tournamentFormat: 'bracket',
  tournamentMatchType: 'derby',
  tournamentDurationSec: 180,
  tournamentName: 'Ozark Night Tournament'
} as const;

const DEFAULT_ROOM_CONFIG = {
  name: 'Open Bar',
  privacy: 'private',
  theme: 'classic-green-felt',
  houseRules: 'Best of 3. No rage quits.',
  playlist: ['pixelpuck'],
  bettingPool: 0,
  voiceEnabled: false
} as const;

function defaultPlayerName() {
  return `Player-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function initials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return '??';
  const parts = cleaned.split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function PartyPage() {
  const navigate = useNavigate();
  const stats = persistence.loadStats();
  const equippedLabel = resolveEquippedLabel(stats);
  const [playerName, setPlayerName] = useState(defaultPlayerName());
  const [joinCode, setJoinCode] = useState('');
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<PartySession | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'entry' | 'lobby'>('entry');
  const [tournamentHistoryVersion, setTournamentHistoryVersion] = useState(0);
  const partyRef = useRef<PartyClient | null>(null);
  const roomRef = useRef<RoomState | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    clearMultiplayerLaunchSession();
    trackTelemetry({ type: 'page_view', page: 'party' });
    const onServerEvent = (event: PartyServerEvent) => {
      if (event.type === 'error') {
        setError(event.message);
        return;
      }

      if (event.type === 'room_joined') {
        const nextSession: PartySession = {
          roomCode: event.roomCode,
          playerId: event.playerId,
          hostId: event.hostId,
          role: event.role,
          token: event.token,
          seed: event.seed
        };
        setSession(nextSession);
        savePartySession({ ...nextSession, signalingUrl: DEFAULT_SIGNALING_URL });
        setStatus('lobby');
        setError(null);
        return;
      }

      if (event.type === 'room_state') {
        setRoom(event.room);
        setStatus('lobby');
        setError(null);
        return;
      }

      if (event.type === 'game_started') {
        const currentSession = partyRef.current?.getSession();
        const currentRoom = roomRef.current;
        if (!currentSession || !currentRoom) return;

        const playerIndex = Math.max(0, currentRoom.players.findIndex((player) => player.id === currentSession.playerId));
        const context: MultiplayerLaunchContext = {
          enabled: true,
          gameId: event.gameId,
          roomCode: currentSession.roomCode,
          playerId: currentSession.playerId,
          hostId: currentSession.hostId,
          playerIds: currentRoom.players.map((player) => player.id),
          role: currentSession.role,
          seed: event.seed,
          reconnectToken: currentSession.token,
          signalingUrl: DEFAULT_SIGNALING_URL,
          playerIndex,
          options: event.gameOptions ?? currentRoom.gameOptions ?? {}
        };

        saveMultiplayerLaunchSession(context);
        navigate(`/play/${event.gameId}`);
      }
    };

    const client = new PartyClient({
      signalingUrl: DEFAULT_SIGNALING_URL,
      onConnectionChange: setConnected,
      onEvent: (event) => onServerEvent(event)
    });

    const persisted = loadPartySession();
    if (persisted) {
      const restoredSession: PartySession = {
        roomCode: persisted.roomCode,
        playerId: persisted.playerId,
        hostId: persisted.hostId,
        role: persisted.role,
        token: persisted.token,
        seed: persisted.seed
      };
      client.hydrateSession(restoredSession);
      setSession(restoredSession);
      setStatus('lobby');
    }

    client.connect();
    partyRef.current = client;

    return () => {
      client.disconnect();
      partyRef.current = null;
    };
  }, [navigate]);

  const isHost = session?.role === 'host';

  const canStart = useMemo(() => {
    if (!room || !session) return false;
    if (session.role !== 'host') return false;
    const connectedPlayers = room.players.filter((player) => player.connected);
    if (connectedPlayers.length < 2) return false;
    return connectedPlayers.every((player) => player.ready);
  }, [room, session]);

  const selectedGame = room?.selectedGameId ?? 'pixelpuck';
  const selectedGameMp = getMpAdapterDescriptor(selectedGame);
  const roomConfig = room?.roomConfig ?? DEFAULT_ROOM_CONFIG;
  const playlist = Array.isArray(roomConfig.playlist) ? roomConfig.playlist : DEFAULT_ROOM_CONFIG.playlist;
  const ozarkOptions = ((room?.gameOptions as Record<string, unknown> | undefined) ?? DEFAULT_OZARK_OPTIONS) as Record<string, unknown>;
  const ozarkTournamentMode = ozarkOptions.tournamentMode === true;
  const ozarkTournamentFormat = String(ozarkOptions.tournamentFormat ?? 'bracket') === 'league' ? 'league' : 'bracket';
  const ozarkTournamentDurationSec = Number(ozarkOptions.tournamentDurationSec ?? 180);
  const ozarkTournamentRoster = useMemo(() => {
    if (!room) return [];
    return room.players.filter((player) => player.connected).map((player) => player.id).slice(0, 16);
  }, [room]);
  const ozarkTournamentSeeds = useMemo(() => {
    if (!room) return [];
    return deterministicSeedOrder(ozarkTournamentRoster, room.seed).map((entry) => entry.playerId);
  }, [room, ozarkTournamentRoster]);
  const ozarkTournamentRounds = estimateTournamentRounds(ozarkTournamentFormat, ozarkTournamentRoster.length);
  const ozarkTournamentEtaMin = estimateTournamentDurationMin(ozarkTournamentFormat, ozarkTournamentRoster.length, ozarkTournamentDurationSec);
  const ozarkTournamentHistory = useMemo(() => loadTournamentHistory(), [tournamentHistoryVersion]);

  const myPlayer = useMemo(() => {
    if (!room || !session) return null;
    return room.players.find((player) => player.id === session.playerId) ?? null;
  }, [room, session]);

  const roomCode = room?.roomCode ?? session?.roomCode ?? '';

  const copyRoomCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const shareRoomCode = async () => {
    if (!roomCode) return;
    const shareText = `Join my GameGrid room: ${roomCode}`;
    if (navigator.share) {
      await navigator.share({ title: 'GameGrid Party Room', text: shareText });
      return;
    }
    await copyRoomCode();
  };

  return (
    <main className="party-page">
      <header className="hero premium-hero">
        <h1>
          <Icon name="party" className="inline-icon" /> Party Room
        </h1>
        <p>Create or join a room, ready up, then launch synchronized multiplayer sessions.</p>
      </header>

      <section className="party-panel info-panel">
        <p>Signaling: {DEFAULT_SIGNALING_URL}</p>
        <p>Status: {connected ? 'Connected' : 'Reconnecting'} </p>
        <p>Room Theme: {equippedLabel}</p>
        <p>Coins: {stats.currency.tickets}</p>
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      {status === 'entry' ? (
        <section className="party-entry premium-cards">
          <article className="party-panel">
            <h2>Create Room</h2>
            <label>
              Display Name
              <input value={playerName} maxLength={24} onChange={(event) => setPlayerName(event.target.value)} />
            </label>
            <button
              onClick={() => {
                trackTelemetry({ type: 'party_room', action: 'create' });
                partyRef.current?.createRoom(playerName.trim() || defaultPlayerName());
              }}
            >
              Create Room
            </button>
          </article>
          <article className="party-panel">
            <h2>Join Room</h2>
            <label>
              Room Code
              <input
                value={joinCode}
                maxLength={6}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABCD12"
              />
            </label>
            <button
              onClick={() => {
                trackTelemetry({ type: 'party_room', action: 'join' });
                partyRef.current?.joinRoom(joinCode.trim(), playerName.trim() || defaultPlayerName());
              }}
            >
              Join Room
            </button>
          </article>
        </section>
      ) : null}

      {status === 'lobby' && room ? (
        <section className="party-lobby">
          <div className="party-room-header">
            <h2>Room {room.roomCode}</h2>
            <p>Seed: {room.seed}</p>
            <div className="room-code-tools">
              <button onClick={copyRoomCode}>
                <Icon name="copy" className="inline-icon" /> {copied ? 'Copied' : 'Copy Code'}
              </button>
              <button className="ghost" onClick={() => void shareRoomCode()}>
                <Icon name="share" className="inline-icon" /> Share
              </button>
            </div>
          </div>

          <div className="party-controls sticky-actions">
            <button onClick={() => partyRef.current?.setReady(!(myPlayer?.ready ?? false))}>{myPlayer?.ready ? 'Unready' : 'Ready Up'}</button>
            <Link className="ghost-link" to="/">
              <Icon name="back" className="inline-icon" /> Back Home
            </Link>
          </div>

          <div className="party-grid">
            <section className="party-panel">
              <h3>Players</h3>
              <ul className="player-list">
                {room.players.map((player) => (
                  <li key={player.id} className="player-row">
                    <span className="avatar">{initials(player.name)}</span>
                    <span>
                      <strong>{player.name}</strong> {player.id === room.hostId ? <span className="chip host"><Icon name="crown" className="inline-icon" /> Host</span> : null}{' '}
                      {!player.connected ? <span className="chip">Reconnecting</span> : null}
                    </span>
                    <span className={`ready-tag ${player.ready ? 'yes' : 'no'}`}>{player.ready ? 'Ready' : 'Not Ready'}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="party-panel">
              <h3>Room Identity</h3>
              <label>
                Room Name
                <input
                  disabled={!isHost}
                  maxLength={24}
                  value={roomConfig.name}
                  onChange={(event) => partyRef.current?.setRoomConfig({ name: event.target.value })}
                />
              </label>
              <label>
                Privacy
                <select
                  disabled={!isHost}
                  value={roomConfig.privacy}
                  onChange={(event) => partyRef.current?.setRoomConfig({ privacy: event.target.value })}
                >
                  <option value="public">Public Lounge</option>
                  <option value="private">Private Club</option>
                  <option value="clan">Clan Base</option>
                </select>
              </label>
              <label>
                Theme
                <select
                  disabled={!isHost}
                  value={roomConfig.theme}
                  onChange={(event) => partyRef.current?.setRoomConfig({ theme: event.target.value })}
                >
                  <option value="classic-green-felt">Classic Green Felt</option>
                  <option value="neon-arcade">Neon Arcade</option>
                  <option value="midnight">Midnight</option>
                  <option value="sunset">Sunset</option>
                  <option value="carbon">Carbon</option>
                </select>
              </label>
              <label>
                House Rules
                <textarea
                  disabled={!isHost}
                  rows={3}
                  value={roomConfig.houseRules}
                  onChange={(event) => partyRef.current?.setRoomConfig({ houseRules: event.target.value })}
                />
              </label>
              <label>
                Voice Chat
                <select
                  disabled={!isHost}
                  value={String(roomConfig.voiceEnabled)}
                  onChange={(event) => partyRef.current?.setRoomConfig({ voiceEnabled: event.target.value === 'true' })}
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>
              <label>
                Betting Pool (coins)
                <input
                  disabled={!isHost}
                  type="number"
                  min={0}
                  max={5000}
                  value={Number(roomConfig.bettingPool)}
                  onChange={(event) => partyRef.current?.setRoomConfig({ bettingPool: Number(event.target.value) || 0 })}
                />
              </label>
              <label>
                Playlist Queue (comma separated)
                <input
                  disabled={!isHost}
                  value={playlist.join(', ')}
                  onChange={(event) =>
                    partyRef.current?.setRoomConfig({
                      playlist: event.target.value
                        .split(',')
                        .map((value) => value.trim())
                        .filter(Boolean)
                    })
                  }
                />
              </label>
            </section>

            <section className="party-panel">
              <h3>Host Control Panel</h3>
              <label>
                Select game
                <select
                  disabled={!isHost}
                  value={selectedGame}
                  onChange={(event) => partyRef.current?.selectGame(event.target.value)}
                >
                  {GAME_REGISTRY.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.title}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Mode:{' '}
                {selectedGameMp
                  ? selectedGame === 'starlight-chronicles'
                    ? 'Co-op Run (Prototype) | host authoritative vote + combat aggregation'
                    : `${selectedGameMp.mode} host authoritative (${selectedGameMp.implemented ? 'implemented' : 'in progress'})`
                  : 'unavailable'}
              </p>
              {selectedGame === 'ozark-fishing' ? (
                <div className="party-ozark-settings">
                  <label>
                    Mode
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.partyMode ?? DEFAULT_OZARK_OPTIONS.partyMode)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          partyMode: event.target.value
                        })
                      }
                    >
                      <option value="derby">Derby</option>
                      <option value="big_catch">Big Catch</option>
                    </select>
                  </label>
                  <label>
                    Duration
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.durationSec ?? DEFAULT_OZARK_OPTIONS.durationSec)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          durationSec: Number(event.target.value)
                        })
                      }
                    >
                      <option value="180">3 min</option>
                      <option value="300">5 min</option>
                      <option value="480">8 min</option>
                    </select>
                  </label>
                  <label>
                    Weather
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.weather ?? DEFAULT_OZARK_OPTIONS.weather)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          weather: event.target.value
                        })
                      }
                    >
                      <option value="random">Random</option>
                      <option value="sunny">Sunny</option>
                      <option value="overcast">Overcast</option>
                      <option value="light_rain">Rain</option>
                    </select>
                  </label>
                  <label>
                    Time
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.time ?? DEFAULT_OZARK_OPTIONS.time)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          time: event.target.value
                        })
                      }
                    >
                      <option value="random">Random</option>
                      <option value="day">Day</option>
                      <option value="night">Night</option>
                    </select>
                  </label>
                  <label>
                    Spot
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.spot ?? DEFAULT_OZARK_OPTIONS.spot)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          spot: event.target.value
                        })
                      }
                    >
                      <option value="random">Random</option>
                      <option value="cove">Cove</option>
                      <option value="dock">Dock</option>
                      <option value="open-water">Open Water</option>
                      <option value="river-mouth">River Mouth</option>
                    </select>
                  </label>
                  <label>
                    Assist
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.assistAllowed ?? DEFAULT_OZARK_OPTIONS.assistAllowed)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          assistAllowed: event.target.value === 'true'
                        })
                      }
                    >
                      <option value="true">On</option>
                      <option value="false">Off</option>
                    </select>
                  </label>
                  <label>
                    Gear Fairness
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.gearFairness ?? DEFAULT_OZARK_OPTIONS.gearFairness)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          gearFairness: event.target.value
                        })
                      }
                    >
                      <option value="standardized">Standardized (Fair)</option>
                      <option value="personal">Personal Gear</option>
                    </select>
                  </label>
                  <label>
                    Weekly Event
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.useWeeklyEvent ?? DEFAULT_OZARK_OPTIONS.useWeeklyEvent)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          useWeeklyEvent: event.target.value === 'true'
                        })
                      }
                    >
                      <option value="true">Use Current Weekly Event</option>
                      <option value="false">Event Off</option>
                    </select>
                  </label>
                  <label>
                    Rarity Multipliers
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.rarityMultipliers ?? DEFAULT_OZARK_OPTIONS.rarityMultipliers)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          rarityMultipliers: event.target.value === 'true'
                        })
                      }
                    >
                      <option value="false">Off (Fair Default)</option>
                      <option value="true">On</option>
                    </select>
                  </label>
                  <label>
                    Tournament Mode
                    <select
                      disabled={!isHost}
                      value={String(ozarkOptions.tournamentMode ?? DEFAULT_OZARK_OPTIONS.tournamentMode)}
                      onChange={(event) =>
                        partyRef.current?.setGameOptions({
                          tournamentMode: event.target.value === 'true'
                        })
                      }
                    >
                      <option value="false">Off</option>
                      <option value="true">On</option>
                    </select>
                  </label>
                  {ozarkTournamentMode ? (
                    <>
                      <label>
                        Tournament Format
                        <select
                          disabled={!isHost}
                          value={String(ozarkOptions.tournamentFormat ?? DEFAULT_OZARK_OPTIONS.tournamentFormat)}
                          onChange={(event) =>
                            partyRef.current?.setGameOptions({
                              tournamentFormat: event.target.value
                            })
                          }
                        >
                          <option value="bracket">Bracket</option>
                          <option value="league">League Night</option>
                        </select>
                      </label>
                      <label>
                        Tournament Match Type
                        <select
                          disabled={!isHost}
                          value={String(ozarkOptions.tournamentMatchType ?? DEFAULT_OZARK_OPTIONS.tournamentMatchType)}
                          onChange={(event) =>
                            partyRef.current?.setGameOptions({
                              tournamentMatchType: event.target.value
                            })
                          }
                        >
                          <option value="derby">Derby</option>
                          <option value="big_catch">Big Catch</option>
                        </select>
                      </label>
                      <label>
                        Tournament Match Duration
                        <select
                          disabled={!isHost}
                          value={String(ozarkOptions.tournamentDurationSec ?? DEFAULT_OZARK_OPTIONS.tournamentDurationSec)}
                          onChange={(event) =>
                            partyRef.current?.setGameOptions({
                              tournamentDurationSec: Number(event.target.value)
                            })
                          }
                        >
                          <option value="120">2 min</option>
                          <option value="180">3 min</option>
                          <option value="300">5 min</option>
                        </select>
                      </label>
                      <label>
                        Tournament Name
                        <input
                          disabled={!isHost}
                          maxLength={64}
                          value={String(ozarkOptions.tournamentName ?? DEFAULT_OZARK_OPTIONS.tournamentName)}
                          onChange={(event) =>
                            partyRef.current?.setGameOptions({
                              tournamentName: event.target.value
                            })
                          }
                        />
                      </label>
                      <p>
                        Tournament roster: {ozarkTournamentRoster.length} players | rounds: {ozarkTournamentRounds} | est. {ozarkTournamentEtaMin} min
                      </p>
                      <p>Seed order: {ozarkTournamentSeeds.join(', ') || 'Waiting for players'}</p>
                    </>
                  ) : null}
                  {isHost ? (
                    <div className="party-ozark-history">
                    <h4>Tournament History</h4>
                    <button
                      className="ghost"
                      disabled={!isHost}
                      onClick={() => setTournamentHistoryVersion((value) => value + 1)}
                    >
                      Refresh History
                    </button>
                    <ul>
                      {ozarkTournamentHistory.slice(0, 10).map((entry) => (
                        <li key={entry.id}>
                          {entry.dateIso.slice(0, 10)} | {entry.format} | {entry.matchType} | top: {entry.standings.slice(0, 3).join(', ') || 'n/a'}
                        </li>
                      ))}
                    </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isHost ? (
                <button disabled={!canStart} onClick={() => partyRef.current?.startGame()}>
                  Start Game
                </button>
              ) : (
                <p>Host launches when everyone is ready.</p>
              )}
            </section>
          </div>
        </section>
      ) : null}

      <nav className="bottom-nav" aria-label="Primary">
        <Link to="/">Home</Link>
        <Link to="/party">Party</Link>
        <Link to="/ranked">Ranked</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/profile">Profile</Link>
      </nav>
    </main>
  );
}
