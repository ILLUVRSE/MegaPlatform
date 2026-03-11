import { isAudioUnlocked, unlockAudioContext } from './audioManager';

export async function unlockAudio() {
  await unlockAudioContext();
}

export { isAudioUnlocked };

export function installAudioUnlock() {
  if (typeof window === 'undefined') return () => undefined;
  let disposed = false;
  const handleUnlock = () => {
    if (disposed || isAudioUnlocked()) return;
    void unlockAudioContext();
  };

  const options: AddEventListenerOptions = { once: true, passive: true };
  window.addEventListener('pointerdown', handleUnlock, options);
  window.addEventListener('touchstart', handleUnlock, options);
  window.addEventListener('keydown', handleUnlock, options);

  return () => {
    disposed = true;
    window.removeEventListener('pointerdown', handleUnlock);
    window.removeEventListener('touchstart', handleUnlock);
    window.removeEventListener('keydown', handleUnlock);
  };
}
