export class TickLoop {
  private timer: NodeJS.Timeout | null = null;

  start(onTick: () => void, hz = 10): void {
    if (this.timer) {
      return;
    }
    const intervalMs = Math.max(1, Math.floor(1000 / hz));
    this.timer = setInterval(onTick, intervalMs);
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }
}
