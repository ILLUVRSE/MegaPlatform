import type { QuantizedInput } from '../../shared/net/protocol';

export class InputBuffer {
  private byTick = new Map<number, QuantizedInput>();
  private readonly maxEntries: number;

  constructor(maxEntries = 512) {
    this.maxEntries = maxEntries;
  }

  set(input: QuantizedInput): void {
    this.byTick.set(input.clientTick, input);
    if (this.byTick.size > this.maxEntries) {
      const oldest = [...this.byTick.keys()].sort((a, b) => a - b)[0];
      if (oldest !== undefined) {
        this.byTick.delete(oldest);
      }
    }
  }

  get(tick: number): QuantizedInput | undefined {
    return this.byTick.get(tick);
  }

  getRange(fromTick: number, toTickInclusive: number): QuantizedInput[] {
    const out: QuantizedInput[] = [];
    for (let t = fromTick; t <= toTickInclusive; t += 1) {
      const item = this.byTick.get(t);
      if (item) {
        out.push(item);
      }
    }
    return out;
  }

  clearUntil(tick: number): void {
    for (const key of this.byTick.keys()) {
      if (key <= tick) {
        this.byTick.delete(key);
      }
    }
  }
}
