export class TrainingDummy {
  constructor() {
    this.behavior = "stand";
    this.timer = 0;
    this.blocking = false;
    this.pendingCounter = false;
    this.recording = false;
    this.playback = false;
    this.recorded = [];
    this.playIdx = 0;
  }

  setBehavior(b) {
    this.behavior = b;
    this.timer = 0;
    this.blocking = false;
    this.pendingCounter = false;
  }

  startRecording() {
    this.recording = true;
    this.playback = false;
    this.recorded = [];
    this.playIdx = 0;
  }

  stopRecording() {
    this.recording = false;
  }

  togglePlayback() {
    if (!this.recorded.length) return false;
    this.playback = !this.playback;
    this.recording = false;
    if (this.playback) this.playIdx = 0;
    return this.playback;
  }

  recordIntent(intent) {
    if (!this.recording) return;
    this.recorded.push({ ...intent });
    if (this.recorded.length > 900) this.recorded.shift();
  }

  update(dt, snapshot, events) {
    this.timer -= dt;
    const dummy = snapshot.p2;
    if (this.behavior === "random" && this.timer <= 0) {
      this.timer = 0.5;
      this.blocking = Math.random() > 0.5;
    }

    if (this.behavior === "counter") {
      events.forEach((e) => {
        if (e.type === "BLOCK" || e.type === "HIT") {
          if (e.data?.actor === "p2") this.pendingCounter = true;
        }
      });
      if (dummy && dummy.state !== "hit" && dummy.state !== "block") {
        // wait until can act
      }
    }
  }

  getIntent(snapshot) {
    const intent = {
      left: false,
      right: false,
      up: false,
      down: false,
      hitPressed: false,
      kickPressed: false,
      powerPressed: false,
      guardHeld: false,
      guardTapped: false,
      flickLane: 0,
      jump: false,
      stepPower: false
    };

    if (this.playback && this.recorded.length) {
      const next = this.recorded[this.playIdx] || intent;
      this.playIdx = (this.playIdx + 1) % this.recorded.length;
      return { ...intent, ...next };
    }

    if (this.behavior === "stand") return intent;

    if (this.behavior === "block") {
      intent.guardHeld = true;
      return intent;
    }

    if (this.behavior === "random") {
      intent.guardHeld = this.blocking;
      return intent;
    }

    if (this.behavior === "counter") {
      const canAct = snapshot?.p2?.state === "idle" || snapshot?.p2?.state === "walk";
      if (this.pendingCounter && canAct) {
        intent.hitPressed = Math.random() > 0.5;
        intent.kickPressed = !intent.hitPressed;
        this.pendingCounter = false;
      }
      return intent;
    }

    return intent;
  }
}
