export class NetClock {
  private offsetMs = 0;

  now(): number {
    return performance.now() + this.offsetMs;
  }

  sync(serverNowMs: number, clientSentAtMs: number, clientReceivedAtMs: number) {
    const rtt = clientReceivedAtMs - clientSentAtMs;
    const oneWay = rtt * 0.5;
    const estimate = serverNowMs + oneWay;
    const measuredOffset = estimate - clientReceivedAtMs;
    this.offsetMs = this.offsetMs * 0.85 + measuredOffset * 0.15;
  }

  getOffsetMs(): number {
    return this.offsetMs;
  }
}

export function createFixedTicker(tickRateHz: number, cb: (dt: number) => void): () => void {
  const fixedDt = 1 / tickRateHz;
  let accumulator = 0;
  let last = performance.now();
  let raf = 0;

  const frame = (now: number) => {
    const delta = Math.min(100, now - last) / 1000;
    last = now;
    accumulator += delta;

    while (accumulator >= fixedDt) {
      cb(fixedDt);
      accumulator -= fixedDt;
    }

    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
