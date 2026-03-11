import Phaser from 'phaser';
import type { PlayerInputState } from '../../shared/types';

interface ControlMap {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  sprint: Phaser.Input.Keyboard.Key;
  pass: Phaser.Input.Keyboard.Key;
  shoot: Phaser.Input.Keyboard.Key;
  shootAlt?: Phaser.Input.Keyboard.Key;
  switch: Phaser.Input.Keyboard.Key;
  tackle: Phaser.Input.Keyboard.Key;
}

export class InputSystem {
  private controls: Array<ControlMap | null> = [null, null];
  private scene: Phaser.Scene | null = null;

  bind(scene: Phaser.Scene): void {
    this.scene = scene;
    const kb = scene.input.keyboard;
    if (!kb) {
      return;
    }
    this.controls[0] = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      sprint: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      pass: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
      shootAlt: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      switch: kb.addKey(Phaser.Input.Keyboard.KeyCodes.TAB),
      tackle: kb.addKey(Phaser.Input.Keyboard.KeyCodes.C)
    };

    this.controls[1] = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      sprint: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO),
      pass: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE),
      shoot: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO),
      switch: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE),
      tackle: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR)
    };

  }

  read(slot: 0 | 1): PlayerInputState {
    const c = this.controls[slot];
    const pad = this.tryGetGamepad(slot);

    let moveX = 0;
    let moveY = 0;
    let sprint = false;
    let passPressed = false;
    let shootHeld = false;
    let shootReleased = false;
    let switchPressed = false;
    let tacklePressed = false;

    if (c) {
      moveX += Number(c.right.isDown) - Number(c.left.isDown);
      moveY += Number(c.down.isDown) - Number(c.up.isDown);
      sprint = sprint || c.sprint.isDown;
      passPressed = passPressed || Phaser.Input.Keyboard.JustDown(c.pass);
      const shootPressed = c.shoot.isDown || Boolean(c.shootAlt?.isDown);
      shootHeld = shootHeld || shootPressed;
      shootReleased = shootReleased || Phaser.Input.Keyboard.JustUp(c.shoot) || Boolean(c.shootAlt && Phaser.Input.Keyboard.JustUp(c.shootAlt));
      switchPressed = switchPressed || Phaser.Input.Keyboard.JustDown(c.switch);
      tacklePressed = tacklePressed || Phaser.Input.Keyboard.JustDown(c.tackle);
    }

    if (pad) {
      moveX += pad.leftStick.x;
      moveY += pad.leftStick.y;
      sprint = sprint || pad.R2 > 0.2;
      passPressed = passPressed || pad.A;
      shootHeld = shootHeld || pad.B;
      shootReleased = shootReleased || pad.BJustReleased;
      switchPressed = switchPressed || pad.L1;
      tacklePressed = tacklePressed || pad.Y;
    }

    const mag = Math.hypot(moveX, moveY);
    if (mag > 1) {
      moveX /= mag;
      moveY /= mag;
    }

    return {
      moveX,
      moveY,
      sprint,
      passPressed,
      shootHeld,
      shootReleased,
      switchPressed,
      tacklePressed
    };
  }

  private tryGetGamepad(slot: 0 | 1):
    | {
        leftStick: { x: number; y: number };
        R2: number;
        A: boolean;
        B: boolean;
        BJustReleased: boolean;
        L1: boolean;
        Y: boolean;
      }
    | null {
    const pads = this.scene?.input.gamepad?.gamepads;
    if (!pads) {
      return null;
    }
    const raw = pads[slot];
    if (!raw) {
      return null;
    }
    const gp = raw as unknown as {
      leftStick: { x: number; y: number };
      R2: number;
      A: boolean;
      B: boolean;
      L1: boolean;
      Y: boolean;
      justReleased?(buttonIndex: number): boolean;
      buttons?: Array<{ value: number; pressed: boolean }>;
    };
    return {
      leftStick: { x: gp.leftStick?.x ?? 0, y: gp.leftStick?.y ?? 0 },
      R2: gp.R2 ?? gp.buttons?.[7]?.value ?? 0,
      A: Boolean(gp.A ?? gp.buttons?.[0]?.pressed),
      B: Boolean(gp.B ?? gp.buttons?.[1]?.pressed),
      BJustReleased: Boolean(gp.justReleased?.(1)),
      L1: Boolean(gp.L1 ?? gp.buttons?.[4]?.pressed),
      Y: Boolean(gp.Y ?? gp.buttons?.[3]?.pressed)
    };
  }
}
