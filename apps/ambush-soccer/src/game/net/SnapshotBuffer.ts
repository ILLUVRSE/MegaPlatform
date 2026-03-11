import type { MatchSnapshotState } from '../../shared/net/protocol';

export interface BufferedSnapshot {
  serverTick: number;
  state: MatchSnapshotState;
}

export class SnapshotBuffer {
  private list: BufferedSnapshot[] = [];
  private readonly max = 128;

  push(snapshot: BufferedSnapshot): void {
    this.list.push(snapshot);
    this.list.sort((a, b) => a.serverTick - b.serverTick);
    if (this.list.length > this.max) {
      this.list.shift();
    }
  }

  latest(): BufferedSnapshot | null {
    return this.list.length > 0 ? this.list[this.list.length - 1] : null;
  }

  nearestAtOrBefore(tick: number): BufferedSnapshot | null {
    for (let i = this.list.length - 1; i >= 0; i -= 1) {
      if (this.list[i].serverTick <= tick) {
        return this.list[i];
      }
    }
    return null;
  }
}
