export function installInputGuards(target?: HTMLElement | null) {
  if (typeof window === 'undefined') return () => undefined;
  const guardTarget = target ?? document.body;

  const blockIfWithin = (event: Event) => {
    const node = event.target as Node | null;
    if (!node) return;
    if (!guardTarget.contains(node)) return;
    event.preventDefault();
  };

  const touchOptions: AddEventListenerOptions = { passive: false };
  window.addEventListener('touchmove', blockIfWithin, touchOptions);
  window.addEventListener('gesturestart', blockIfWithin, touchOptions);
  window.addEventListener('gesturechange', blockIfWithin, touchOptions);
  window.addEventListener('gestureend', blockIfWithin, touchOptions);

  return () => {
    window.removeEventListener('touchmove', blockIfWithin);
    window.removeEventListener('gesturestart', blockIfWithin);
    window.removeEventListener('gesturechange', blockIfWithin);
    window.removeEventListener('gestureend', blockIfWithin);
  };
}
