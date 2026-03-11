export interface Poolable {
  active: boolean;
  setActive: (value: boolean) => unknown;
  setVisible: (value: boolean) => unknown;
}

export class ObjectPool<T extends Poolable> {
  private readonly items: T[];
  private readonly create: () => T;

  constructor(create: () => T, size: number) {
    this.create = create;
    this.items = Array.from({ length: size }, () => {
      const item = this.create();
      item.setActive(false);
      item.setVisible(false);
      return item;
    });
  }

  acquire(): T {
    const found = this.items.find((item) => !item.active);
    if (found) return found;
    const extra = this.create();
    extra.setActive(false);
    extra.setVisible(false);
    this.items.push(extra);
    return extra;
  }

  all(): readonly T[] {
    return this.items;
  }
}
