export function hapticTap(pattern: 'light' | 'medium' | 'heavy' = 'light'): void {
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (!nav.vibrate) return;
  if (pattern === 'light') nav.vibrate(8);
  else if (pattern === 'medium') nav.vibrate(14);
  else nav.vibrate(22);
}
