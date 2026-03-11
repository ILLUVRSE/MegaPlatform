import type { MatchSnapshotState, QuantizedInput } from '../../shared/net/protocol';
import type { IMatchDriver } from './IMatchDriver';

export class OfflineMatchDriver implements IMatchDriver {
  update(_dt: number): void {}
  handleLocalInput(_input: QuantizedInput): void {}
  applySnapshot(_snapshot: { serverTick: number; state: MatchSnapshotState }): void {}
  getPingMs(): number {
    return 0;
  }
}
