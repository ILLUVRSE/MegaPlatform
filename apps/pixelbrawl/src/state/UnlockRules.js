export const UnlockRules = {
  defaultUnlocked: ["byte", "vex", "glitch", "brick"],
  unlockOrder: ["echo", "zip", "spark", "shade", "iron", "flair", "rift", "nova"],
  getNextUnlock(unlocked) {
    return this.unlockOrder.find((id) => !unlocked[id]) || null;
  },
  getClearNumberFor(id) {
    const idx = this.unlockOrder.indexOf(id);
    return idx >= 0 ? idx + 1 : null;
  }
};
