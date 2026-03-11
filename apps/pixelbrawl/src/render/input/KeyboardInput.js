export class KeyboardInput {
  constructor() {
    this.keys = new Set();
    this.guardTapped = false;
    this.stepPowerWindow = 0;

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "l") this.guardTapped = true;
      if (["j", "k", "l", "i", " "].includes(e.key.toLowerCase())) e.preventDefault();
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  update(dt) {
    if (this.stepPowerWindow > 0) this.stepPowerWindow -= dt;
  }

  getIntent() {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    const hit = this.keys.has("j");
    const kick = this.keys.has("i");
    const power = this.keys.has("k");

    const intent = {
      left,
      right,
      up,
      down,
      hitPressed: hit,
      kickPressed: kick,
      powerPressed: power,
      guardHeld: this.keys.has("l"),
      guardTapped: this.guardTapped,
      flickLane: 0,
      jump: this.keys.has(" "),
      stepPower: this.stepPowerWindow > 0 && power
    };

    this.guardTapped = false;
    return intent;
  }
}
