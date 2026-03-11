export interface NetStatsSnapshot {
  avgRttMs: number;
  packetLoss: number;
  sent: number;
  received: number;
}

export class NetStats {
  private readonly pingSamples: number[] = [];
  private sent = 0;
  private received = 0;

  onPacketSent() {
    this.sent += 1;
  }

  onPacketReceived() {
    this.received += 1;
  }

  onPingSample(rttMs: number) {
    this.pingSamples.push(rttMs);
    if (this.pingSamples.length > 40) {
      this.pingSamples.shift();
    }
  }

  snapshot(): NetStatsSnapshot {
    const avgRttMs = this.pingSamples.length
      ? this.pingSamples.reduce((sum, sample) => sum + sample, 0) / this.pingSamples.length
      : 0;

    const packetLoss = this.sent === 0 ? 0 : Math.max(0, Math.min(1, (this.sent - this.received) / this.sent));

    return {
      avgRttMs,
      packetLoss,
      sent: this.sent,
      received: this.received
    };
  }
}
