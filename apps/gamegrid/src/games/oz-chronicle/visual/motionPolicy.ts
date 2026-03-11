export function transitionsEnabled(globalReducedMotion: boolean, localReducedMotion: boolean): boolean {
  return !(globalReducedMotion || localReducedMotion);
}
