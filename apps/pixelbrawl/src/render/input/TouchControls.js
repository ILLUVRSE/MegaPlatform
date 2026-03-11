const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class TouchControls {
  constructor(root) {
    this.root = root;
    this.stick = root.querySelector("#stickBase");
    this.knob = root.querySelector("#stickKnob");
    this.stickZone = root.querySelector("#stickZone");
    this.flickHint = root.querySelector("#flickHint");
    this.hitBtn = root.querySelector("#hitBtn");
    this.kickBtn = root.querySelector("#kickBtn");
    this.powerBtn = root.querySelector("#powerBtn");
    this.guardBtn = root.querySelector("#guardBtn");
    this.debugBtn = document.getElementById("debugBtn");

    this.knobX = 0;
    this.knobY = 0;
    this.guardTapped = false;
    this.flickLane = 0;
    this.stepPowerWindow = 0;
    this.touch = { active: false, pointerId: null, lastY: 0, lastT: 0, cooldownMs: 0 };
    this.btnState = { hit: false, kick: false, power: false, guard: false };

    this.bindStick();
    this.bindButtons();
  }

  bindButtons() {
    const bind = (el, key) => {
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        this.btnState[key] = true;
        el.classList.add("pressed");
        if (key === "guard") {
          this.guardTapped = true;
          el.classList.add("holding");
        }
      });
      const up = (e) => {
        e.preventDefault();
        this.btnState[key] = false;
        el.classList.remove("pressed");
        if (key === "guard") el.classList.remove("holding");
      };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("lostpointercapture", up);
    };

    bind(this.hitBtn, "hit");
    bind(this.kickBtn, "kick");
    bind(this.powerBtn, "power");
    bind(this.guardBtn, "guard");
  }

  bindStick() {
    const zone = this.stickZone;
    zone.addEventListener("pointerdown", (e) => {
      this.touch.active = true;
      this.touch.pointerId = e.pointerId;
      this.touch.lastY = e.clientY;
      this.touch.lastT = performance.now();
      zone.setPointerCapture(e.pointerId);
      zone.classList.add("active");
      this.updateStick(e.clientX, e.clientY);
    });

    zone.addEventListener("pointermove", (e) => {
      if (!this.touch.active || e.pointerId !== this.touch.pointerId) return;
      const now = performance.now();
      const dy = e.clientY - this.touch.lastY;
      const dt = Math.max(1, now - this.touch.lastT);
      if (Math.abs(dy) > 20 && dt < 70 && this.touch.cooldownMs <= 0) {
        this.flickLane = dy < 0 ? 1 : -1;
        this.touch.cooldownMs = 220;
        this.stepPowerWindow = 0.2;
        if (this.flickHint) {
          this.flickHint.classList.remove("up", "down");
          this.flickHint.classList.add(dy < 0 ? "up" : "down");
          this.flickHint.classList.add("show");
        }
      }
      this.touch.lastY = e.clientY;
      this.touch.lastT = now;
      this.updateStick(e.clientX, e.clientY);
    });

    const clear = (e) => {
      if (e.pointerId !== this.touch.pointerId) return;
      this.touch.active = false;
      this.touch.pointerId = null;
      this.knobX = 0;
      this.knobY = 0;
      this.knob.style.transform = "translate(-50%, -50%)";
      zone.classList.remove("active");
      if (this.flickHint) this.flickHint.classList.remove("show", "up", "down");
    };

    zone.addEventListener("pointerup", clear);
    zone.addEventListener("pointercancel", clear);
    zone.addEventListener("lostpointercapture", clear);
  }

  updateStick(x, y) {
    const rect = this.stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = x - cx;
    let dy = y - cy;
    const max = rect.width * 0.32;
    const mag = Math.hypot(dx, dy);
    if (mag > max) {
      dx = (dx / mag) * max;
      dy = (dy / mag) * max;
    }
    this.knobX = dx / max;
    this.knobY = dy / max;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  update(dt) {
    if (this.touch.cooldownMs > 0) this.touch.cooldownMs -= dt * 1000;
    if (this.stepPowerWindow > 0) this.stepPowerWindow -= dt;
  }

  getIntent() {
    const intent = {
      left: this.knobX < -0.26,
      right: this.knobX > 0.26,
      up: this.knobY < -0.34,
      down: this.knobY > 0.34,
      hitPressed: this.btnState.hit,
      kickPressed: this.btnState.kick,
      powerPressed: this.btnState.power,
      guardHeld: this.btnState.guard,
      guardTapped: this.guardTapped,
      flickLane: this.flickLane,
      jump: false,
      stepPower: this.stepPowerWindow > 0 && this.btnState.power
    };

    this.guardTapped = false;
    this.flickLane = 0;
    return intent;
  }
}
