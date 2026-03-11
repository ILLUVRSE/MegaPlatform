import type { ClientToServerMessage, ServerToClientMessage } from '../../shared/net/protocol';
import { parseServerMessage, serializeMessage } from '../../shared/net/serialize';

export interface NetSimConfig {
  latencyMs: number;
  jitterMs: number;
  dropRate: number;
}

export class NetClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Array<(msg: ServerToClientMessage) => void> = [];
  private statusHandlers: Array<(connected: boolean) => void> = [];
  private pingMs = 0;
  private sim: NetSimConfig = { latencyMs: 0, jitterMs: 0, dropRate: 0 };
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  clientId: string | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(clientVersion: string): void {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) {
      return;
    }
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.emitStatus(true);
      this.send({ type: 'HELLO', clientVersion, resumeClientId: this.clientId ?? undefined });
      this.startPingLoop();
    };

    this.ws.onmessage = (evt) => {
      const msg = parseServerMessage(String(evt.data));
      if (!msg) {
        return;
      }
      if (msg.type === 'WELCOME') {
        this.clientId = msg.clientId;
      }
      if (msg.type === 'PONG') {
        this.pingMs = performance.now() - msg.t;
      }
      this.handlers.forEach((h) => h(msg));
    };

    this.ws.onclose = () => {
      this.emitStatus(false);
      this.scheduleReconnect(clientVersion);
    };
  }

  onMessage(handler: (msg: ServerToClientMessage) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  onConnectionStatus(handler: (connected: boolean) => void): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  setSimulation(config: Partial<NetSimConfig>): void {
    this.sim = {
      latencyMs: config.latencyMs ?? this.sim.latencyMs,
      jitterMs: config.jitterMs ?? this.sim.jitterMs,
      dropRate: config.dropRate ?? this.sim.dropRate
    };
  }

  getPingMs(): number {
    return this.pingMs;
  }

  send(msg: ClientToServerMessage): void {
    const payload = serializeMessage(msg);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (Math.random() < this.sim.dropRate) {
      return;
    }

    const jitter = (Math.random() * 2 - 1) * this.sim.jitterMs;
    const delay = Math.max(0, this.sim.latencyMs + jitter);
    window.setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(payload);
      }
    }, delay);
  }

  private scheduleReconnect(version: string): void {
    if (this.reconnectTimer !== null) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(version);
    }, 1200);
  }

  private emitStatus(connected: boolean): void {
    this.statusHandlers.forEach((h) => h(connected));
  }

  private startPingLoop(): void {
    if (this.pingTimer !== null) {
      return;
    }
    this.pingTimer = window.setInterval(() => {
      this.send({ type: 'PING', t: performance.now() });
    }, 1000);
  }
}
