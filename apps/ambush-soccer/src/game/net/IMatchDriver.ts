import type { MatchSnapshotState, QuantizedInput } from '../../shared/net/protocol';

export interface IMatchDriver {
  update(dt: number): void;
  handleLocalInput(input: QuantizedInput): void;
  applySnapshot(snapshot: { serverTick: number; state: MatchSnapshotState }): void;
  getPingMs(): number;
}
