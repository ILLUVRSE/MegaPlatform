export const INPUT_LOCK_KEYS = [
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End"
];

export const shouldPreventGameplayKey = (
  code: string,
  isFocused: boolean,
  isPlaying: boolean
): boolean => {
  if (!isFocused || !isPlaying) return false;
  return INPUT_LOCK_KEYS.includes(code);
};
