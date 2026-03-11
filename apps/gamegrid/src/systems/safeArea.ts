import type { SafeAreaInsets } from '../types';

export const applySafeAreaInsets = (insets: SafeAreaInsets) => {
  const root = document.documentElement;
  root.style.setProperty('--safe-area-top', `${Math.max(0, insets.top)}px`);
  root.style.setProperty('--safe-area-right', `${Math.max(0, insets.right)}px`);
  root.style.setProperty('--safe-area-bottom', `${Math.max(0, insets.bottom)}px`);
  root.style.setProperty('--safe-area-left', `${Math.max(0, insets.left)}px`);
};
