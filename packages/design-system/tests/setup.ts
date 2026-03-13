import "@testing-library/jest-dom/vitest";

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => ({
    fillRect: () => undefined,
    getImageData: () => ({ data: new Uint8ClampedArray() }),
    measureText: () => ({ width: 0 })
  })
});

const originalGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element, pseudoElt?: string | null) =>
  originalGetComputedStyle(element, pseudoElt ? null : undefined)) as typeof window.getComputedStyle;
