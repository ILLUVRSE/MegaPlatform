import type { SafeAreaInsets } from '../types';

export type ParentCommand =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'mute' }
  | { type: 'unmute' }
  | { type: 'setSafeArea'; payload: SafeAreaInsets };

export type ChildEvent =
  | ({ type: 'ready'; gameId?: string } & Record<string, unknown>)
  | ({ type: 'game_start'; gameId: string } & Record<string, unknown>)
  | ({ type: 'game_end'; gameId: string; score?: number | string } & Record<string, unknown>)
  | ({ type: 'error'; message: string; gameId?: string } & Record<string, unknown>)
  | ({ type: 'hud_update'; gameId: string; score?: number | string; timer?: string } & Record<string, unknown>)
  | ({ type: 'quality_update'; gameId: string; effects: string; dpr: number } & Record<string, unknown>)
  | ({ type: 'latency_sample'; gameId: string; rttMs: number; packetLoss: number } & Record<string, unknown>)
  | ({ type: 'telemetry'; gameId: string; event: string } & Record<string, unknown>);

export interface BridgeHandlers {
  onPause: () => void;
  onResume: () => void;
  onMute: () => void;
  onUnmute: () => void;
  onSetSafeArea: (insets: SafeAreaInsets) => void;
}

const BRIDGE_SOURCE = 'gamegrid';

function isParentCommand(input: unknown): input is ParentCommand {
  if (!input || typeof input !== 'object') return false;
  const data = input as { type?: string; payload?: SafeAreaInsets };
  const type = data.type;
  if (type === 'setSafeArea') {
    const payload = data.payload;
    if (!payload) return false;
    return (
      typeof payload.top === 'number' &&
      typeof payload.right === 'number' &&
      typeof payload.bottom === 'number' &&
      typeof payload.left === 'number'
    );
  }
  return type === 'pause' || type === 'resume' || type === 'mute' || type === 'unmute' || type === 'setSafeArea';
}

export function createEmbedBridge(handlers: BridgeHandlers) {
  const listener = (event: MessageEvent) => {
    const data = event.data as unknown;
    if (!isParentCommand(data)) return;
    switch (data.type) {
      case 'pause':
        handlers.onPause();
        break;
      case 'resume':
        handlers.onResume();
        break;
      case 'mute':
        handlers.onMute();
        break;
      case 'unmute':
        handlers.onUnmute();
        break;
      case 'setSafeArea':
        handlers.onSetSafeArea(data.payload);
        break;
    }
  };

  window.addEventListener('message', listener);

  const post = (payload: ChildEvent) => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: BRIDGE_SOURCE, ...payload }, '*');
      }
    } catch {
      // Never throw in embed messaging path.
    }
  };

  return {
    post,
    dispose: () => window.removeEventListener('message', listener)
  };
}
