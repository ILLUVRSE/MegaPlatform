import { createProtocolMessage, type MpProtocolMessage, type MpRole } from './protocol';
import { deserializeMessage, serializeMessage } from './serializer';
import { NetStats, type NetStatsSnapshot } from './netStats';

interface SignalBase {
  type: string;
}

interface SignalEnvelope extends SignalBase {
  type: 'signal';
  from: string;
  data: unknown;
}

interface PeerJoinedEnvelope extends SignalBase {
  type: 'peer_joined';
  peerId: string;
}

interface RoomJoinedEnvelope extends SignalBase {
  type: 'room_joined';
  roomCode: string;
  playerId: string;
  token: string;
  hostId: string;
}

interface ErrorEnvelope extends SignalBase {
  type: 'error';
  message: string;
}

interface ServerPongEnvelope extends SignalBase {
  type: 'pong';
  echo: string;
}

type SignalMessage = SignalEnvelope | PeerJoinedEnvelope | RoomJoinedEnvelope | ErrorEnvelope | ServerPongEnvelope;

export interface WebRtcTransportOptions {
  role: MpRole;
  playerId: string;
  hostPlayerId?: string;
  roomCode: string;
  signalingUrl: string;
  reconnectToken: string;
}

export interface TransportPacket {
  fromPlayerId: string;
  message: MpProtocolMessage;
}

export interface TransportPeerState {
  peerId: string;
  connected: boolean;
}

export type TransportMessageHandler = (packet: TransportPacket) => void;
export type TransportStateHandler = (state: TransportPeerState[]) => void;
export type TransportHostChangeHandler = (hostId: string, reason: 'room_joined') => void;

function parseSignal(data: string): SignalMessage | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const message = parsed as { type?: unknown };
    if (typeof message.type !== 'string') return null;
    return parsed as SignalMessage;
  } catch {
    return null;
  }
}

function sendWs(socket: WebSocket, payload: object) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

export class WebRtcDataTransport {
  private readonly options: WebRtcTransportOptions;
  private readonly netStats = new NetStats();
  private readonly peerConnections = new Map<string, RTCPeerConnection>();
  private readonly dataChannels = new Map<string, RTCDataChannel>();
  private onMessageHandler: TransportMessageHandler | null = null;
  private onStateHandler: TransportStateHandler | null = null;
  private onHostChangeHandler: TransportHostChangeHandler | null = null;
  private socket: WebSocket | null = null;
  private reconnectTimer = 0;
  private disconnected = false;
  private authorizedHostId: string;

  constructor(options: WebRtcTransportOptions) {
    this.options = options;
    this.authorizedHostId = options.role === 'host' ? options.playerId : options.hostPlayerId ?? 'host';
  }

  onMessage(handler: TransportMessageHandler) {
    this.onMessageHandler = handler;
  }

  onState(handler: TransportStateHandler) {
    this.onStateHandler = handler;
  }

  onHostChange(handler: TransportHostChangeHandler) {
    this.onHostChangeHandler = handler;
  }

  getAuthorizedHostId(): string {
    return this.authorizedHostId;
  }

  connect() {
    this.disconnected = false;
    this.openSocket();
  }

  disconnect() {
    this.disconnected = true;
    window.clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;

    for (const channel of this.dataChannels.values()) {
      channel.close();
    }
    this.dataChannels.clear();

    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();
    this.emitState();
  }

  sendToHost(message: MpProtocolMessage) {
    if (this.options.role === 'host') {
      this.onMessageHandler?.({ fromPlayerId: this.options.playerId, message });
      return;
    }

    const channel = this.dataChannels.get(this.authorizedHostId);
    if (!channel || channel.readyState !== 'open') return;

    channel.send(serializeMessage(message));
    this.netStats.onPacketSent();
  }

  broadcastFromHost(message: MpProtocolMessage) {
    if (this.options.role !== 'host') return;

    const payload = serializeMessage(message);
    for (const [peerId, channel] of this.dataChannels.entries()) {
      if (peerId === this.options.playerId) continue;
      if (channel.readyState !== 'open') continue;
      channel.send(payload);
      this.netStats.onPacketSent();
    }

    this.onMessageHandler?.({ fromPlayerId: this.options.playerId, message });
  }

  getStats(): NetStatsSnapshot {
    return this.netStats.snapshot();
  }

  ping() {
    const pingId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = performance.now();
    this.broadcastFromHost(createProtocolMessage('ping', { pingId }));
    this.netStats.onPacketSent();

    if (this.options.role === 'client') {
      const socket = this.socket;
      if (!socket) return;
      sendWs(socket, { type: 'ping', roomCode: this.options.roomCode, echo: `${pingId}:${now}` });
    }
  }

  private openSocket() {
    const socket = new WebSocket(this.options.signalingUrl);
    this.socket = socket;

    socket.addEventListener('open', () => {
      sendWs(socket, {
        type: 'resume_room',
        roomCode: this.options.roomCode,
        playerId: this.options.playerId,
        token: this.options.reconnectToken
      });
    });

    socket.addEventListener('message', async (event) => {
      const signal = parseSignal(String(event.data));
      if (!signal) return;
      await this.handleSignal(signal);
    });

    socket.addEventListener('close', () => {
      this.socket = null;
      if (this.disconnected) return;
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = window.setTimeout(() => this.openSocket(), 1000);
    });
  }

  private async handleSignal(signal: SignalMessage) {
    switch (signal.type) {
      case 'room_joined':
        this.authorizedHostId = signal.hostId;
        this.onHostChangeHandler?.(signal.hostId, 'room_joined');
        if (this.options.role === 'host') {
          this.ensureHostPeer(this.options.playerId);
        }
        return;
      case 'peer_joined':
        if (this.options.role !== 'host') return;
        await this.createOfferForPeer(signal.peerId);
        return;
      case 'signal':
        await this.applyRemoteSignal(signal.from, signal.data);
        return;
      case 'pong': {
        const [, rawStart] = signal.echo.split(':');
        const start = Number(rawStart);
        if (Number.isFinite(start)) {
          this.netStats.onPingSample(performance.now() - start);
          this.netStats.onPacketReceived();
        }
        return;
      }
      case 'error':
        console.warn(`Multiplayer signaling error: ${signal.message}`);
        return;
      default:
        return;
    }
  }

  private ensureHostPeer(peerId: string) {
    if (!this.peerConnections.has(peerId)) {
      this.peerConnections.set(peerId, this.createPeerConnection(peerId));
    }
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate || !this.socket) return;
      sendWs(this.socket, {
        type: 'signal',
        roomCode: this.options.roomCode,
        to: peerId,
        data: { candidate: event.candidate }
      });
    };

    if (this.options.role === 'client') {
      pc.ondatachannel = (event) => {
        const channel = event.channel;
        this.installDataChannel(this.authorizedHostId, channel);
      };
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
      this.emitState();
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private async createOfferForPeer(peerId: string) {
    const pc = this.peerConnections.get(peerId) ?? this.createPeerConnection(peerId);
    if (!this.dataChannels.has(peerId)) {
      const channel = pc.createDataChannel('gamegrid-mp', { ordered: true });
      this.installDataChannel(peerId, channel);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (!this.socket) return;
    sendWs(this.socket, {
      type: 'signal',
      roomCode: this.options.roomCode,
      to: peerId,
      data: { sdp: pc.localDescription }
    });
  }

  private async applyRemoteSignal(fromPeerId: string, data: unknown) {
    const payload = data as { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
    const peerKey = this.options.role === 'host' ? fromPeerId : this.authorizedHostId;
    const pc = this.peerConnections.get(peerKey) ?? this.createPeerConnection(peerKey);

    if (payload.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      if (payload.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (this.socket) {
          sendWs(this.socket, {
            type: 'signal',
            roomCode: this.options.roomCode,
            to: fromPeerId,
            data: { sdp: pc.localDescription }
          });
        }
      }
    }

    if (payload.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }

  private installDataChannel(peerId: string, channel: RTCDataChannel) {
    this.dataChannels.set(peerId, channel);

    channel.onopen = () => this.emitState();
    channel.onclose = () => this.emitState();

    channel.onmessage = (event) => {
      let parsed: MpProtocolMessage;
      try {
        parsed = deserializeMessage(String(event.data));
      } catch {
        return;
      }
      this.netStats.onPacketReceived();
      const fromPlayerId = this.options.role === 'host' ? peerId : 'host';
      this.onMessageHandler?.({ fromPlayerId, message: parsed });
    };
  }

  private emitState() {
    if (!this.onStateHandler) return;

    const states: TransportPeerState[] = [];
    for (const [peerId, pc] of this.peerConnections.entries()) {
      states.push({
        peerId,
        connected: pc.connectionState === 'connected'
      });
    }

    this.onStateHandler(states);
  }
}

export class MockLoopbackTransport {
  private peer: MockLoopbackTransport | null = null;
  private onMessageHandler: TransportMessageHandler | null = null;
  private onStateHandler: TransportStateHandler | null = null;
  private onHostChangeHandler: TransportHostChangeHandler | null = null;
  private authorizedHostId: string;

  constructor(private readonly playerId: string, initialHostId?: string) {
    this.authorizedHostId = initialHostId ?? playerId;
  }

  connectPeer(peer: MockLoopbackTransport) {
    this.peer = peer;
  }

  onMessage(handler: TransportMessageHandler) {
    this.onMessageHandler = handler;
  }

  onState(handler: TransportStateHandler) {
    this.onStateHandler = handler;
  }

  onHostChange(handler: TransportHostChangeHandler) {
    this.onHostChangeHandler = handler;
  }

  getAuthorizedHostId() {
    return this.authorizedHostId;
  }

  simulatePeerState(states: TransportPeerState[]) {
    this.onStateHandler?.(states);
  }

  simulateRoomJoined(hostId: string) {
    this.authorizedHostId = hostId;
    this.onHostChangeHandler?.(hostId, 'room_joined');
  }

  sendToHost(message: MpProtocolMessage) {
    this.peer?.onMessageHandler?.({ fromPlayerId: this.playerId, message });
  }

  broadcastFromHost(message: MpProtocolMessage) {
    this.peer?.onMessageHandler?.({ fromPlayerId: this.playerId, message });
    this.onMessageHandler?.({ fromPlayerId: this.playerId, message });
  }
}
