import { describe, expect, it, vi } from 'vitest';
import { createEmbedBridge } from './postMessageBridge';

describe('postMessage bridge', () => {
  it('dispatches parent commands to handlers and posts child events', () => {
    const handlers = {
      onPause: vi.fn(),
      onResume: vi.fn(),
      onMute: vi.fn(),
      onUnmute: vi.fn(),
      onSetSafeArea: vi.fn()
    };

    const postSpy = vi.fn();
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: { postMessage: postSpy }
    });

    const bridge = createEmbedBridge(handlers);

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'pause' } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'resume' } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'mute' } }));
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'unmute' } }));
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'setSafeArea', payload: { top: 1, right: 2, bottom: 3, left: 4 } }
      })
    );

    expect(handlers.onPause).toHaveBeenCalledOnce();
    expect(handlers.onResume).toHaveBeenCalledOnce();
    expect(handlers.onMute).toHaveBeenCalledOnce();
    expect(handlers.onUnmute).toHaveBeenCalledOnce();
    expect(handlers.onSetSafeArea).toHaveBeenCalledWith({ top: 1, right: 2, bottom: 3, left: 4 });

    bridge.post({ type: 'ready', gameId: 'abc' });
    expect(postSpy).toHaveBeenCalledWith({ source: 'gamegrid', type: 'ready', gameId: 'abc' }, '*');

    bridge.dispose();
  });

  it('does not throw when parent is absent', () => {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: window
    });
    const bridge = createEmbedBridge({
      onPause: () => undefined,
      onResume: () => undefined,
      onMute: () => undefined,
      onUnmute: () => undefined,
      onSetSafeArea: () => undefined
    });

    expect(() => bridge.post({ type: 'error', message: 'x' })).not.toThrow();
    bridge.dispose();
  });
});
