import type {
  MpAdapter,
  MpSpectatorBandwidthMode,
  MpSpectatorSnapshotOptions,
  MpSpectatorSnapshotPayload
} from './mpAdapter';

export interface SpectatorAdapter<TSnapshot = unknown, TGhostPlayback = unknown> {
  createSnapshot(options?: MpSpectatorSnapshotOptions): MpSpectatorSnapshotPayload<TSnapshot, TGhostPlayback>;
  applySnapshot(payload: MpSpectatorSnapshotPayload<TSnapshot, TGhostPlayback>): void;
}

export function createSpectatorAdapter<TSnapshot = unknown, TGhostPlayback = unknown>(
  adapter: MpAdapter<unknown, TSnapshot, unknown, unknown>
): SpectatorAdapter<TSnapshot, TGhostPlayback> {
  return {
    createSnapshot(options?: MpSpectatorSnapshotOptions) {
      if (adapter.getSpectatorSnapshot) {
        return adapter.getSpectatorSnapshot(options) as MpSpectatorSnapshotPayload<TSnapshot, TGhostPlayback>;
      }

      return {
        snapshot: adapter.getSnapshot(),
        bandwidthMode: options?.bandwidthMode ?? 'full',
        ghostPlayback: options?.includeGhostPlayback ? null : undefined
      };
    },
    applySnapshot(payload: MpSpectatorSnapshotPayload<TSnapshot, TGhostPlayback>) {
      if (adapter.applySpectatorSnapshot) {
        adapter.applySpectatorSnapshot(payload);
        return;
      }
      adapter.applySnapshot(payload.snapshot);
    }
  };
}

export function usesMinimalSpectatorBandwidth(payload: { bandwidthMode?: MpSpectatorBandwidthMode } | null | undefined): boolean {
  return payload?.bandwidthMode === 'minimal';
}
