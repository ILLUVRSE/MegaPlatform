export class InputRecorder {
  constructor(limit = 12) {
    this.limit = limit;
    this.entries = [];
  }

  record(intent, timeMs) {
    const dir = intent.left ? -1 : intent.right ? 1 : 0;
    const vert = intent.up ? -1 : intent.down ? 1 : 0;
    const lane = intent.flickLane || 0;
    const entry = {
      t: timeMs,
      dir,
      vert,
      lane,
      hit: !!intent.hitPressed,
      kick: !!intent.kickPressed,
      power: !!intent.powerPressed,
      guard: !!intent.guardHeld,
      guardTap: !!intent.guardTapped
    };
    this.entries.unshift(entry);
    if (this.entries.length > this.limit) this.entries.length = this.limit;
  }

  getEntries() {
    return this.entries;
  }
}
