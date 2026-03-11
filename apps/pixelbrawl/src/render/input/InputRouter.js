import { KeyboardInput } from "./KeyboardInput.js";
import { TouchControls } from "./TouchControls.js";

export class InputRouter {
  constructor() {
    this.keyboard = new KeyboardInput();
    this.touch = new TouchControls(document.getElementById("touchControls"));
  }

  update(dt) {
    this.keyboard.update(dt);
    this.touch.update(dt);
  }

  getIntent() {
    const k = this.keyboard.getIntent();
    const t = this.touch.getIntent();
    return {
      ...k,
      left: k.left || t.left,
      right: k.right || t.right,
      up: k.up || t.up,
      down: k.down || t.down,
      hitPressed: k.hitPressed || t.hitPressed,
      kickPressed: k.kickPressed || t.kickPressed,
      powerPressed: k.powerPressed || t.powerPressed,
      guardHeld: k.guardHeld || t.guardHeld,
      guardTapped: k.guardTapped || t.guardTapped,
      flickLane: t.flickLane,
      jump: k.jump,
      stepPower: k.stepPower || t.stepPower
    };
  }
}
