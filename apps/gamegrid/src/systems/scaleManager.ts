const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

export function computeContainSize(viewportWidth: number, viewportHeight: number) {
  const scale = Math.min(viewportWidth / BASE_WIDTH, viewportHeight / BASE_HEIGHT);
  const width = Math.floor(BASE_WIDTH * scale);
  const height = Math.floor(BASE_HEIGHT * scale);
  return { width, height, scale, baseWidth: BASE_WIDTH, baseHeight: BASE_HEIGHT };
}
