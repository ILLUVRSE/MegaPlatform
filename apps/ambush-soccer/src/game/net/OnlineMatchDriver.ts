import {
  checksumState,
  decodeInputBits,
  dequantizeAxis,
  encodeInputBits,
  quantizeInput,
  type MatchSnapshotState,
  type QuantizedInput,
  type ServerToClientMessage
} from '../../shared/net/protocol';
import type { PlayerInputState } from '../../shared/types';
import { InputBuffer } from './InputBuffer';
import type { IMatchDriver } from './IMatchDriver';
import { shouldReconcile } from './Reconciliation';
import { SnapshotBuffer } from './SnapshotBuffer';
import type { OnlineSession } from './OnlineSession';

export interface OnlineMatchDriverCallbacks {
  readLocalInput: () => PlayerInputState;
  applyPredictedLocalInput: (input: PlayerInputState, dt: number) => void;
  applyRemoteInputAsHost: (input: PlayerInputState, dt: number) => void;
  captureSnapshot: () => MatchSnapshotState;
  applyAuthoritativeSnapshot: (state: MatchSnapshotState, hard: boolean) => void;
  computePredictionError: (state: MatchSnapshotState) => number;
  onForfeitWin: () => void;
}

const TICK_RATE = 60;
const TICK_DT = 1 / TICK_RATE;

export class OnlineMatchDriver implements IMatchDriver {
  private readonly session: OnlineSession;
  private readonly callbacks: OnlineMatchDriverCallbacks;
  private readonly matchId: string;
  private readonly isHost: boolean;
  private readonly inputBuffer = new InputBuffer();
  private readonly snapshotBuffer = new SnapshotBuffer();
  private readonly remoteByTick = new Map<number, PlayerInputState>();
  private readonly remoteInputDelayTicks = 2;
  private readonly remoteRepeatMaxTicks = 6;

  private seq = 0;
  private localTick = 0;
  private serverTick = 0;
  private accumulator = 0;
  private snapshotAccumulator = 0;
  private startReceived = false;
  private stop = false;
  private missingRemoteTicks = 0;
  private packetLossEstimate = 0;
  private expectedRemoteTick = 0;
  private remoteFallback: PlayerInputState = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    passPressed: false,
    shootHeld: false,
    shootReleased: false,
    switchPressed: false,
    tacklePressed: false
  };

  constructor(session: OnlineSession, matchId: string, hostClientId: string, callbacks: OnlineMatchDriverCallbacks) {
    this.session = session;
    this.matchId = matchId;
    this.isHost = session.net.clientId === hostClientId;
    this.callbacks = callbacks;

    this.session.net.onMessage((msg) => this.onNetMessage(msg));
    this.session.ready(this.matchId);
  }

  update(dt: number): void {
    if (this.stop || !this.startReceived) {
      return;
    }

    this.accumulator += dt;
    while (this.accumulator >= TICK_DT) {
      this.accumulator -= TICK_DT;
      this.localTick += 1;

      const localInput = this.callbacks.readLocalInput();
      const packed = quantizeInput(
        {
          moveX: localInput.moveX,
          moveY: localInput.moveY,
          bits: encodeInputBits({
            sprint: localInput.sprint,
            pass: localInput.passPressed,
            shoot: localInput.shootHeld,
            tackle: localInput.tacklePressed,
            switchPlayer: localInput.switchPressed,
            shootRelease: localInput.shootReleased
          }),
          shootCharge: localInput.shootHeld ? 255 : 0
        },
        this.localTick,
        this.seq
      );
      this.seq += 1;
      this.inputBuffer.set(packed);
      this.session.net.send({ type: 'INPUT', matchId: this.matchId, ...packed });

      this.callbacks.applyPredictedLocalInput(localInput, TICK_DT);

      if (this.isHost) {
        const delayedTick = this.localTick - this.remoteInputDelayTicks;
        const remote = this.remoteByTick.get(delayedTick);
        if (remote) {
          this.missingRemoteTicks = 0;
        } else {
          this.missingRemoteTicks += 1;
        }
        const effectiveRemote = remote ?? (this.missingRemoteTicks <= this.remoteRepeatMaxTicks ? this.remoteFallback : this.neutralInput());
        this.remoteByTick.delete(delayedTick - 2);
        this.callbacks.applyRemoteInputAsHost(effectiveRemote, TICK_DT);
        this.serverTick += 1;

        this.snapshotAccumulator += TICK_DT;
        if (this.snapshotAccumulator >= 1 / 15) {
          this.snapshotAccumulator = 0;
          const state = this.callbacks.captureSnapshot();
          this.session.net.send({
            type: 'HOST_SNAPSHOT',
            matchId: this.matchId,
            serverTick: this.serverTick,
            state
          });
        }
      }
    }
  }

  handleLocalInput(_input: QuantizedInput): void {}

  applySnapshot(snapshot: { serverTick: number; state: MatchSnapshotState }): void {
    if (checksumState(snapshot.state) !== snapshot.state.checksum) {
      return;
    }
    this.serverTick = Math.max(this.serverTick, snapshot.serverTick);
    this.snapshotBuffer.push(snapshot);
    const error = this.callbacks.computePredictionError(snapshot.state);
    this.callbacks.applyAuthoritativeSnapshot(snapshot.state, shouldReconcile(error, 22));
    this.inputBuffer.clearUntil(snapshot.serverTick - 1);
  }

  getPingMs(): number {
    return this.session.net.getPingMs();
  }

  hasStarted(): boolean {
    return this.startReceived;
  }

  getLocalTick(): number {
    return this.localTick;
  }

  getServerTick(): number {
    return this.serverTick;
  }

  isHostAuthority(): boolean {
    return this.isHost;
  }

  getPacketLossEstimate(): number {
    return this.packetLossEstimate;
  }

  private onNetMessage(msg: ServerToClientMessage): void {
    if (this.stop) {
      return;
    }
    if (msg.type === 'START_MATCH' && msg.matchId === this.matchId) {
      this.startReceived = true;
      return;
    }
    if (msg.type === 'REMOTE_INPUT' && msg.matchId === this.matchId && this.isHost) {
      const decoded = this.decodeQuantized(msg.payload);
      this.remoteByTick.set(msg.payload.clientTick, decoded);
      this.remoteFallback = decoded;
      if (this.expectedRemoteTick > 0) {
        const gap = Math.max(0, msg.payload.clientTick - this.expectedRemoteTick);
        this.packetLossEstimate = this.packetLossEstimate * 0.85 + Math.min(100, gap * 12) * 0.15;
      }
      this.expectedRemoteTick = msg.payload.clientTick + 1;
      return;
    }
    if (msg.type === 'SNAPSHOT' && msg.matchId === this.matchId && !this.isHost) {
      this.applySnapshot({ serverTick: msg.serverTick, state: msg.state });
      return;
    }
    if (msg.type === 'FORFEIT_WIN' && msg.matchId === this.matchId) {
      this.callbacks.onForfeitWin();
      this.stop = true;
      return;
    }
    if (msg.type === 'PLAYER_DISCONNECTED') {
      return;
    }
  }

  private decodeQuantized(input: QuantizedInput): PlayerInputState {
    const bits = decodeInputBits(input.inputBits);
    return {
      moveX: dequantizeAxis(input.moveX),
      moveY: dequantizeAxis(input.moveY),
      sprint: bits.sprint,
      passPressed: bits.pass,
      shootHeld: bits.shoot,
      shootReleased: bits.shootRelease,
      switchPressed: bits.switchPlayer,
      tacklePressed: bits.tackle
    };
  }

  private neutralInput(): PlayerInputState {
    return {
      moveX: 0,
      moveY: 0,
      sprint: false,
      passPressed: false,
      shootHeld: false,
      shootReleased: false,
      switchPressed: false,
      tacklePressed: false
    };
  }
}
