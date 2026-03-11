type CleanupFn = () => void;

type EventTargetLike = {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void;
};

export class CleanupBucket {
  private readonly cleanups: CleanupFn[] = [];

  add(fn: CleanupFn) {
    this.cleanups.push(fn);
    return fn;
  }

  listen(target: EventTargetLike, type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  setTimeout(handler: () => void, ms: number) {
    const id = window.setTimeout(handler, ms);
    this.add(() => window.clearTimeout(id));
    return id;
  }

  setInterval(handler: () => void, ms: number) {
    const id = window.setInterval(handler, ms);
    this.add(() => window.clearInterval(id));
    return id;
  }

  requestAnimationFrame(handler: FrameRequestCallback) {
    const id = window.requestAnimationFrame(handler);
    this.add(() => window.cancelAnimationFrame(id));
    return id;
  }

  dispose() {
    while (this.cleanups.length) {
      const fn = this.cleanups.pop();
      if (fn) fn();
    }
  }
}
