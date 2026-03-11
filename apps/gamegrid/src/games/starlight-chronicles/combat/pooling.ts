export interface PoolItem {
  active: boolean;
}

export interface ObjectPool<T extends PoolItem> {
  acquire: () => T;
  release: (item: T) => void;
  activeItems: () => T[];
}

export function createPool<T extends PoolItem>(factory: () => T, prewarm = 0): ObjectPool<T> {
  const all: T[] = [];
  for (let i = 0; i < prewarm; i += 1) {
    const item = factory();
    item.active = false;
    all.push(item);
  }

  function acquire(): T {
    const available = all.find((entry) => !entry.active);
    if (available) {
      available.active = true;
      return available;
    }
    const next = factory();
    next.active = true;
    all.push(next);
    return next;
  }

  function release(item: T) {
    item.active = false;
  }

  return {
    acquire,
    release,
    activeItems: () => all.filter((entry) => entry.active)
  };
}
