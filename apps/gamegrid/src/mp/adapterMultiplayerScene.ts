import Phaser from 'phaser';
import type { GameRuntimeHooks } from '../game/modules';
import { getMpAdapterDescriptor } from './adapters';
import { createProtocolMessage } from './protocol';
import { WebRtcDataTransport, type TransportPeerState } from './transport';
import { triggerBlobDownload } from '../games/ozark-fishing/shareCard';
import { renderTournamentPosterPng } from '../games/ozark-fishing/tournament/poster';

interface SceneDeps {
  hooks: GameRuntimeHooks;
}

type StepCapable = {
  step?: (dtS?: number) => unknown[];
  getRealtimeNetConfig?: () => { stepHz?: number; snapshotHz?: number; inputHz?: number };
};

const TURN_STEP = 1 / 20;
const DEFAULT_HOST_HEARTBEAT_TIMEOUT_MS = 8000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

type HostAuthorityDecision =
  | { accepted: true }
  | { accepted: false; reason: string; hostWaiting: boolean };

export class HostAuthorityController {
  private authorizedHostId: string;
  private hostConnected = false;
  private waitingForHost = false;
  private hostStale = false;
  private lastHostHeartbeatAtMs = 0;

  constructor(
    private readonly role: 'host' | 'client',
    initialHostId: string,
    private readonly heartbeatTimeoutMs = DEFAULT_HOST_HEARTBEAT_TIMEOUT_MS
  ) {
    this.authorizedHostId = initialHostId;
  }

  getHostPlayerId() {
    return this.authorizedHostId;
  }

  isWaitingForHost() {
    return this.role === 'client' && this.waitingForHost;
  }

  noteSignalingHost(hostId: string, nowMs: number) {
    const changed = hostId.length > 0 && hostId !== this.authorizedHostId;
    if (hostId.length > 0) {
      this.authorizedHostId = hostId;
    }
    this.hostStale = false;
    this.waitingForHost = this.role === 'client' && !this.hostConnected;
    if (!this.waitingForHost) {
      this.lastHostHeartbeatAtMs = nowMs;
    }
    return changed;
  }

  notePeerState(states: TransportPeerState[], nowMs: number) {
    if (this.role !== 'client') return null;
    const hostPeer = states.find((peer) => peer.peerId === this.authorizedHostId);
    const ghostPeer = states.find((peer) => peer.connected && peer.peerId !== this.authorizedHostId);
    this.hostConnected = hostPeer?.connected === true;
    if (ghostPeer && !this.hostConnected) {
      this.waitingForHost = true;
      return `ghost-peer:${ghostPeer.peerId}`;
    }
    if (!this.hostConnected) {
      this.waitingForHost = true;
      return `host-disconnected:${this.authorizedHostId}`;
    }
    if (!this.hostStale) {
      this.waitingForHost = false;
      this.lastHostHeartbeatAtMs = nowMs;
    }
    return null;
  }

  noteHostHeartbeat(fromPlayerId: string, nowMs: number): HostAuthorityDecision {
    if (this.role !== 'client') return { accepted: true };
    if (fromPlayerId !== this.authorizedHostId) {
      this.waitingForHost = true;
      return { accepted: false, reason: `unexpected-host:${fromPlayerId}`, hostWaiting: true };
    }
    if (this.waitingForHost || this.hostStale) {
      return { accepted: false, reason: `waiting-for-host:${fromPlayerId}`, hostWaiting: true };
    }
    this.lastHostHeartbeatAtMs = nowMs;
    return { accepted: true };
  }

  update(nowMs: number): string | null {
    if (this.role !== 'client' || this.waitingForHost) return null;
    if (this.lastHostHeartbeatAtMs <= 0) return null;
    if (nowMs - this.lastHostHeartbeatAtMs <= this.heartbeatTimeoutMs) return null;
    this.hostStale = true;
    this.waitingForHost = true;
    return `heartbeat-timeout:${this.authorizedHostId}`;
  }
}

type HostAuthoritativeAdapter = {
  reconcileHostAuthority?: (context: { peerId?: string; reason: string; snapshotTick?: number }) => unknown;
  updateHostPlayerId?: (hostPlayerId: string) => void;
};

export class AdapterMultiplayerScene extends Phaser.Scene {
  private readonly hooks: GameRuntimeHooks;

  private transport: WebRtcDataTransport | null = null;
  private descriptor = getMpAdapterDescriptor('pixelpuck');
  private role: 'host' | 'client' = 'client';

  private fixedAccumulator = 0;
  private snapshotAccumulator = 0;
  private pingAccumulator = 0;
  private inputAccumulator = 0;
  private seq = 0;
  private localInput: Record<string, unknown> = {};
  private hostAuthority: HostAuthorityController | null = null;
  private hostHeartbeatTimeoutMs = DEFAULT_HOST_HEARTBEAT_TIMEOUT_MS;

  private statusText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private extraText!: Phaser.GameObjects.Text;
  private startedReported = false;
  private endedReported = false;

  constructor({ hooks }: SceneDeps) {
    super(`${hooks.gameId}-multiplayer`);
    this.hooks = hooks;
  }

  create() {
    const mp = this.hooks.multiplayer;
    if (!mp) {
      this.add.text(24, 24, 'Missing multiplayer context', { color: '#ffb9b9', fontSize: '24px' });
      return;
    }

    const descriptor = getMpAdapterDescriptor(this.hooks.gameId);
    if (!descriptor) {
      this.add.text(24, 24, `No multiplayer adapter for ${this.hooks.gameId}`, { color: '#ffb9b9', fontSize: '24px' });
      return;
    }

    this.descriptor = descriptor;
    this.role = mp.role === 'host' && mp.playerId === mp.hostId ? 'host' : 'client';
    this.hostHeartbeatTimeoutMs = clamp(Number(mp.options?.hostHeartbeatTimeoutMs ?? DEFAULT_HOST_HEARTBEAT_TIMEOUT_MS), 1000, 60000);
    this.hostAuthority = new HostAuthorityController(this.role, mp.hostId, this.hostHeartbeatTimeoutMs);
    if (mp.role === 'host' && this.role !== 'host') {
      this.auditHostAuth('HOST_AUTH_RECONCILE', { reason: 'ghost-host-init', peerId: mp.playerId, expectedHostId: mp.hostId });
    }

    descriptor.adapter.init({
      role: this.role,
      playerId: mp.playerId,
      seed: mp.seed,
      options: {
        hostPlayerId: mp.hostId,
        playerIndex: mp.playerIndex,
        playerIds: mp.playerIds,
        mode: this.readModeFromQuery(),
        ...(mp.options ?? {})
      }
    });
    descriptor.adapter.start();

    this.createHud(mp.roomCode);

    this.transport = new WebRtcDataTransport({
      role: this.role,
      playerId: mp.playerId,
      hostPlayerId: mp.hostId,
      roomCode: mp.roomCode,
      signalingUrl: mp.signalingUrl,
      reconnectToken: mp.reconnectToken
    });

    this.transport.onMessage((packet) => {
      if (!this.descriptor) return;
      const nowMs = performance.now();

      if (packet.message.type === 'input' && this.role === 'host') {
        this.descriptor.adapter.onRemoteMessage({ fromPlayerId: packet.fromPlayerId, input: packet.message.input });
        return;
      }

      if (packet.message.type === 'snapshot' && this.role === 'client') {
        if (!this.acceptAuthoritativePacket(packet.fromPlayerId, nowMs, 'snapshot', packet.message.tick)) return;
        this.descriptor.adapter.applySnapshot(packet.message.state);
        return;
      }

      if (packet.message.type === 'event') {
        if (this.role === 'client' && !this.acceptAuthoritativePacket(packet.fromPlayerId, nowMs, 'event')) return;
        this.descriptor.adapter.applyEvent(packet.message.event as never);
        return;
      }

      if (packet.message.type === 'ping' && this.role === 'client') {
        if (!this.acceptAuthoritativePacket(packet.fromPlayerId, nowMs, 'ping')) return;
        this.transport?.sendToHost(createProtocolMessage('pong', { pingId: packet.message.pingId }));
      }
    });

    this.transport.onState((state) => {
      if (!this.hostAuthority) return;
      const reason = this.hostAuthority.notePeerState(state, performance.now());
      if (!reason) return;
      this.auditHostAuth('HOST_AUTH_RECONCILE', { reason, peerState: state.map((peer) => `${peer.peerId}:${peer.connected ? 'up' : 'down'}`).join(',') });
      this.reconcileHostAuth(reason);
    });

    this.transport.onHostChange((hostId) => {
      if (!this.hostAuthority) return;
      const changed = this.hostAuthority.noteSignalingHost(hostId, performance.now());
      const adapter = this.descriptor?.adapter as HostAuthoritativeAdapter | undefined;
      adapter?.updateHostPlayerId?.(hostId);
      if (!changed) return;
      this.auditHostAuth('HOST_AUTH_RECONCILE', { reason: 'host-id-mismatch', peerId: hostId });
      this.reconcileHostAuth('host-id-mismatch');
    });

    this.transport.connect();

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.localInput = this.buildInputFromPointer(pointer, false);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.localInput = this.buildInputFromPointer(pointer, true);
      this.descriptor?.adapter.onInput(this.localInput);
      if (this.role === 'client') {
        this.transport?.sendToHost(
          createProtocolMessage('input', {
            playerId: mp.playerId,
            input: this.localInput,
            seq: this.seq++
          })
        );
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.localInput = this.buildInputFromPointer(pointer, false);
      this.descriptor?.adapter.onInput(this.localInput);
      if (this.role === 'client') {
        this.transport?.sendToHost(
          createProtocolMessage('input', {
            playerId: mp.playerId,
            input: this.localInput,
            seq: this.seq++
          })
        );
      }
    });

    this.input.keyboard?.on('keydown-P', () => {
      if (this.hooks.gameId !== 'ozark-fishing') return;
      const descriptor = this.descriptor;
      if (!descriptor) return;
      const snapshot = descriptor.adapter.getSnapshot() as Record<string, unknown>;
      const tournament = snapshot.tournament as Record<string, unknown> | undefined;
      if (!tournament) return;
      const standings = Array.isArray(tournament.standings) ? (tournament.standings as string[]) : [];
      void renderTournamentPosterPng({
        tournamentName: String((snapshot.sessionConfig as Record<string, unknown> | undefined)?.tournamentName ?? 'Ozark Night Tournament'),
        dateLabel: new Date().toISOString().slice(0, 10),
        format: String(tournament.format ?? 'bracket') === 'league' ? 'league' : 'bracket',
        matchType: String((snapshot.sessionConfig as Record<string, unknown> | undefined)?.tournamentMatchType ?? snapshot.mode) === 'big_catch' ? 'big_catch' : 'derby',
        durationSec: Number((snapshot.sessionConfig as Record<string, unknown> | undefined)?.tournamentDurationSec ?? snapshot.durationMs ?? 180000) / 1000,
        roomCodeText: this.hooks.multiplayer?.roomCode ?? '',
        standings: standings.slice(0, 8).map((playerId, idx) => {
          const players = Array.isArray(snapshot.players) ? (snapshot.players as Array<Record<string, unknown>>) : [];
          const row = players.find((p) => String(p.playerId) === playerId);
          return {
            playerId,
            bestFishWeight: Number(row?.bestFish ?? 0),
            rarityBadge: idx === 0 ? 'Champion' : idx === 1 ? 'Runner-up' : idx === 2 ? 'Finalist' : 'Top 8'
          };
        })
      }).then((poster) => {
        triggerBlobDownload(poster.blob, `ozark-tournament-poster-${Date.now()}.png`);
      });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.transport?.disconnect();
      this.transport = null;
      descriptor.adapter.stop();
    });

    if (this.hooks.gameId === 'ozark-fishing' && !this.startedReported) {
      const snap = descriptor.adapter.getSnapshot() as Record<string, unknown>;
      this.hooks.reportEvent({
        type: 'game_start',
        gameId: this.hooks.gameId,
        mode: String(snap.mode ?? 'derby'),
        duration: Number(snap.durationMs ?? 300000),
        weather: String(snap.weather ?? 'sunny'),
        time: String(snap.timeOfDay ?? 'day')
      });
      this.startedReported = true;
    }
  }

  update(_time: number, deltaMs: number) {
    if (!this.descriptor || !this.transport) return;
    const heartbeatReason = this.hostAuthority?.update(performance.now());
    if (heartbeatReason) {
      this.auditHostAuth('HOST_AUTH_RECONCILE', { reason: heartbeatReason });
      this.reconcileHostAuth(heartbeatReason);
    }

    const dtS = Math.max(0, Math.min(0.05, deltaMs / 1000));
    const stepper = this.descriptor.adapter as StepCapable;
    const netConfig = stepper.getRealtimeNetConfig?.();
    const stepSize = this.descriptor.mode === 'real-time' ? 1 / Math.max(1, netConfig?.stepHz ?? 120) : TURN_STEP;
    const snapshotEvery = this.descriptor.mode === 'real-time' ? 1 / Math.max(1, netConfig?.snapshotHz ?? 18) : 1 / 6;
    const inputEvery = this.descriptor.mode === 'real-time' ? 1 / Math.max(1, netConfig?.inputHz ?? 30) : 1 / 30;

    if (this.role === 'host') {
      this.fixedAccumulator += dtS;
      while (this.fixedAccumulator >= stepSize) {
        this.fixedAccumulator -= stepSize;
        const events = stepper.step?.(stepSize) ?? [];
        for (const event of events) {
          this.transport.broadcastFromHost(createProtocolMessage('event', { event }));
        }
      }

      this.snapshotAccumulator += dtS;
      if (this.snapshotAccumulator >= snapshotEvery) {
        this.snapshotAccumulator = 0;
        this.transport.broadcastFromHost(
          createProtocolMessage('snapshot', {
            tick: Math.floor(performance.now()),
            state: this.descriptor.adapter.getSnapshot()
          })
        );
      }

      this.pingAccumulator += dtS;
      if (this.pingAccumulator >= 2) {
        this.pingAccumulator = 0;
        this.transport.ping();
      }
    } else {
      this.inputAccumulator += dtS;
      if (this.descriptor.mode === 'real-time' && this.inputAccumulator >= inputEvery) {
        this.inputAccumulator = 0;
        this.descriptor.adapter.onInput(this.localInput);
        this.transport.sendToHost(
          createProtocolMessage('input', {
            playerId: this.hooks.multiplayer?.playerId ?? 'client',
            input: this.localInput,
            seq: this.seq++
          })
        );
      }
    }

    const snapshot = this.descriptor.adapter.getSnapshot() as Record<string, unknown>;
    const score = snapshot.score as Record<string, unknown> | undefined;
    const match = snapshot.match as Record<string, unknown> | undefined;
    const phase = (snapshot.phase as string | undefined) ?? (match?.phase as string | undefined) ?? 'live';

    const hostStatus = this.hostAuthority?.isWaitingForHost() ? ' | waiting-for-host' : '';
    this.phaseText.setText(`Phase: ${phase} | ${this.descriptor.mode} | ${this.role}${hostStatus}`);
    if (this.hooks.gameId === 'ozark-fishing') {
      const leaderboard = Array.isArray(snapshot.leaderboard) ? (snapshot.leaderboard as Array<Record<string, unknown>>) : [];
      const catchFeed = Array.isArray(snapshot.catchFeed) ? (snapshot.catchFeed as Array<Record<string, unknown>>) : [];
      const players = Array.isArray(snapshot.players) ? (snapshot.players as Array<Record<string, unknown>>) : [];
      const tournament = (snapshot.tournament as Record<string, unknown> | undefined) ?? null;
      const me = players.find((entry) => entry.playerId === this.hooks.multiplayer?.playerId) ?? null;
      const topRows = leaderboard
        .slice(0, 5)
        .map((entry, idx) => `${idx + 1}. ${String(entry.playerId)}  W:${Number(entry.totalWeight ?? 0).toFixed(2)}  B:${Number(entry.bestFish ?? 0).toFixed(2)}`)
        .join('\n');
      const feedRows = catchFeed
        .slice(0, 4)
        .map((entry) => `${String(entry.playerId)} ${String(entry.fishId)} ${String(entry.rarity)} ${Number(entry.weight ?? 0).toFixed(2)}`)
        .join('\n');
      const myStatus = me
        ? `You: ${String(me.phase)}  T:${Number(me.tension ?? 0).toFixed(2)}  L:${Number(me.lineTightness ?? 0).toFixed(2)}  Hook:${String(me.onHookFishId ?? '-')}`
        : 'You: spectator';
      const tournamentStatus = tournament
        ? `Tournament ${String(tournament.format ?? 'bracket')} | phase ${String(tournament.phase ?? '-')} | active ${String(tournament.activeMatchId ?? '-')}`
        : 'Tournament off';
      const tournamentAssignment = tournament && typeof tournament.assignment === 'object'
        ? (() => {
            const a = tournament.assignment as Record<string, unknown>;
            const playersLine = Array.isArray(a.players) ? (a.players as string[]).join(' vs ') : '-';
            const nextLine = Array.isArray(tournament.standings) && (tournament.standings as string[]).length > 0
              ? `Podium: ${(tournament.standings as string[]).slice(0, 3).join(', ')}`
              : 'Podium: pending';
            return `Match ${String(a.matchId ?? '-')} | ${playersLine}\n${nextLine}`;
          })()
        : 'Match assignment pending';
      this.scoreText.setText(`Leaderboard\n${topRows || 'No catches yet'}`);
      this.extraText.setText(`Catch Feed\n${feedRows || '---'}\n\n${myStatus}\n${tournamentStatus}\n${tournamentAssignment}\nPress P to export tournament poster`);

      if (!this.endedReported && String(snapshot.phase ?? '') === 'ended') {
        this.endedReported = true;
        this.hooks.reportEvent({
          type: 'game_end',
          gameId: this.hooks.gameId,
          mode: String(snapshot.mode ?? 'derby'),
          leaderboard,
          yourStats: me ?? {}
        });
      }
    } else {
      this.scoreText.setText(`Score: ${score ? JSON.stringify(score) : 'n/a'}`);
      this.extraText.setText('');
    }
    this.statusText.setText(`Room ${this.hooks.multiplayer?.roomCode ?? '----'} | ${this.hooks.gameId}`);
  }

  private createHud(roomCode: string) {
    this.add.rectangle(640, 360, 1280, 720, 0x08131c, 1);
    this.add.rectangle(640, 360, 980, 520, 0x0e2330, 1).setStrokeStyle(2, 0x2ac4ff, 0.8);

    this.statusText = this.add.text(40, 28, `Room ${roomCode}`, {
      fontSize: '24px',
      color: '#d4f0ff'
    });

    this.phaseText = this.add.text(40, 64, 'Phase: live', {
      fontSize: '20px',
      color: '#8de1ff'
    });

    this.scoreText = this.add.text(40, 96, 'Score: 0-0', {
      fontSize: '20px',
      color: '#9fffc8'
    });

    this.extraText = this.add.text(40, 138, '', {
      fontSize: '18px',
      color: '#bfd5e3',
      align: 'left'
    });

    this.add.text(40, 520, 'Pointer input drives multiplayer adapter input.', {
      fontSize: '18px',
      color: '#bfd5e3'
    });
  }

  private acceptAuthoritativePacket(fromPlayerId: string, nowMs: number, kind: string, snapshotTick?: number): boolean {
    const decision = this.hostAuthority?.noteHostHeartbeat(fromPlayerId, nowMs) ?? { accepted: true as const };
    if (decision.accepted) return true;
    this.auditHostAuth('HOST_AUTH_RECONCILE', { reason: `${kind}:${decision.reason}`, peerId: fromPlayerId, snapshotTick: snapshotTick ?? null });
    this.reconcileHostAuth(`${kind}:${decision.reason}`, fromPlayerId, snapshotTick);
    return false;
  }

  private reconcileHostAuth(reason: string, peerId?: string, snapshotTick?: number) {
    const adapter = this.descriptor?.adapter as HostAuthoritativeAdapter | undefined;
    adapter?.reconcileHostAuthority?.({ peerId, reason, snapshotTick });
  }

  private auditHostAuth(message: string, details: Record<string, unknown>) {
    console.warn(`[mp][${message}]`, details);
  }

  private readModeFromQuery(): string {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    return mode && mode.trim().length > 0 ? mode : 'default';
  }

  private buildInputFromPointer(pointer: Phaser.Input.Pointer, pressed: boolean): Record<string, unknown> {
    const nx = (pointer.x / 1280) * 2 - 1;
    const ny = (pointer.y / 720) * 2 - 1;
    const base = {
      playerIndex: this.hooks.multiplayer?.playerIndex ?? 0,
      x: nx,
      y: ny,
      pressed
    };

    switch (this.hooks.gameId) {
      case 'foosball':
        return {
          ...base,
          rodOffset: ny * 170,
          rodGesture: nx,
          selectedRod: Math.max(0, Math.min(3, Math.floor(((nx + 1) * 0.5) * 4)))
        };
      case 'goalie-gauntlet':
        return {
          ...base,
          laneX: nx * 250,
          trigger: pressed ? 1 : 0,
          difficulty: ny > 0.3 ? 'legend' : ny > -0.3 ? 'pro' : 'rookie'
        };
      case 'penalty-kick-showdown':
        return {
          ...base,
          aimX: nx * 240,
          timing: clamp(1 - (pointer.y / 720), 0, 1),
          keeperX: nx * 240
        };
      case 'throw-darts':
        return {
          ...base,
          wedge: Math.max(1, Math.min(20, Math.round((nx + 1) * 10))),
          multiplier: ny > 0.45 ? 3 : ny > -0.1 ? 2 : 1
        };
      case 'minigolf':
        return {
          ...base,
          power: clamp(1 - pointer.y / 720, 0, 1),
          angle: nx,
          endX: nx * 260,
          endY: ny * 150,
          declaredStrokes: Math.max(1, Math.min(6, Math.round((1 - ny) * 2)))
        };
      case 'freethrow-frenzy':
        return {
          ...base,
          accuracy: clamp(1 - Math.abs(nx), 0, 1),
          release: clamp(1 - pointer.y / 720, 0, 1)
        };
      case 'homerun-derby':
        return {
          ...base,
          swingTiming: clamp((nx + 1) * 0.5, 0, 1),
          swingPower: clamp(1 - pointer.y / 720, 0, 1)
        };
      case 'pool':
        return {
          ...base,
          cueAngle: nx * Math.PI,
          cuePower: clamp(1 - pointer.y / 720, 0, 1),
          calledPocket: Math.max(0, Math.min(5, Math.floor((nx + 1) * 3)))
        };
      case 'alley-bowling-blitz':
        return {
          ...base,
          power: clamp(1 - pointer.y / 720, 0, 1),
          hook: clamp(nx, -1, 1)
        };
      case 'card-table':
        return {
          ...base,
          action: pressed ? 'bet' : 'hold',
          amount: Math.round(20 + clamp(1 - pointer.y / 720, 0, 1) * 100),
          guess: nx > 0 ? 'higher' : 'lower'
        };
      case 'ozark-fishing': {
        const castPower = clamp(1 - pointer.y / 720, 0, 1);
        if (pressed && pointer.y < 420) {
          return {
            type: 'cast',
            timestamp: performance.now(),
            cast: {
              aim: clamp(nx, -1, 1),
              power: castPower,
              lureId: 'spinnerbait'
            }
          };
        }
        return {
          type: 'reelInput',
          timestamp: performance.now(),
          reel: {
            action: pressed ? 'strength' : 'stop',
            strength: pressed ? clamp(castPower, 0.1, 1) : 0
          }
        };
      }
      default:
        return base;
    }
  }
}
