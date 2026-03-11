export type AnalyticsEvent =
  | { type: 'game_start'; gameId: string; mode?: string | null }
  | { type: 'game_end'; gameId: string; score?: number | string | null; outcome?: string | null; mode?: string | null }
  | { type: 'game_retry'; gameId: string }
  | { type: 'game_pause'; gameId: string }
  | { type: 'game_resume'; gameId: string }
  | { type: 'game_exit'; gameId: string }
  | { type: 'error'; gameId: string; message: string };

type Listener = (event: AnalyticsEvent) => void;

const listeners = new Set<Listener>();

export function onAnalyticsEvent(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function trackEvent(event: AnalyticsEvent) {
  listeners.forEach((listener) => listener(event));
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[analytics]', event);
  }
}
