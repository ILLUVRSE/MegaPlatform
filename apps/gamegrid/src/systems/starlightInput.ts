import Phaser from 'phaser';

export interface InputState {
  moveX: number;
  moveY: number;
  firing: boolean;
  abilityPressed: boolean;
  secondaryPressed: boolean;
}

interface InputUiOptions {
  showSecondaryButton: boolean;
}

export class MobileInputController {
  private state: InputState = { moveX: 0, moveY: 0, firing: false, abilityPressed: false, secondaryPressed: false };
  private joystickCenter = new Phaser.Math.Vector2(160, 560);
  private readonly stick = new Phaser.Math.Vector2();
  private joystickRadius = 92;
  private leftPointerId: number | null = null;
  private rightFirePointers = new Set<number>();
  private stickKnob!: Phaser.GameObjects.Arc;
  private fireIndicator!: Phaser.GameObjects.Arc;
  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    fire: Phaser.Input.Keyboard.Key;
    ability: Phaser.Input.Keyboard.Key;
    secondary: Phaser.Input.Keyboard.Key;
  } | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly options: InputUiOptions) {
    this.buildUI();
    this.bindDesktopFallback();
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerdown', this.handlePointerDown, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
    scene.input.on('pointerupoutside', this.handlePointerUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointermove', this.handlePointerMove, this);
      scene.input.off('pointerdown', this.handlePointerDown, this);
      scene.input.off('pointerup', this.handlePointerUp, this);
      scene.input.off('pointerupoutside', this.handlePointerUp, this);
    });
  }

  private bindDesktopFallback(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) return;
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ability: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      secondary: Phaser.Input.Keyboard.KeyCodes.E
    }) as typeof this.keys;

    const arrows = keyboard.createCursorKeys();
    if (!this.keys) return;
    this.scene.events.on('update', () => {
      const k = this.keys;
      if (!k) return;
      const x = Number(k.right.isDown || arrows.right?.isDown) - Number(k.left.isDown || arrows.left?.isDown);
      const y = Number(k.down.isDown || arrows.down?.isDown) - Number(k.up.isDown || arrows.up?.isDown);
      if (x !== 0 || y !== 0) {
        const len = Math.hypot(x, y) || 1;
        this.state.moveX = x / len;
        this.state.moveY = y / len;
      } else if (this.leftPointerId === null) {
        this.state.moveX = 0;
        this.state.moveY = 0;
      }
      this.state.firing = this.rightFirePointers.size > 0 || k.fire.isDown;
      if (Phaser.Input.Keyboard.JustDown(k.ability)) this.state.abilityPressed = true;
      if (Phaser.Input.Keyboard.JustDown(k.secondary)) this.state.secondaryPressed = true;
    });
  }

  private buildUI(): void {
    const { width, height } = this.scene.scale;
    this.joystickCenter.set(Math.max(115, width * 0.2), height - 140);
    this.scene.add.circle(this.joystickCenter.x, this.joystickCenter.y, this.joystickRadius, 0x13375a, 0.3).setScrollFactor(0).setDepth(40);
    this.stickKnob = this.scene.add.circle(this.joystickCenter.x, this.joystickCenter.y, 34, 0x58b0ff, 0.7).setScrollFactor(0).setDepth(41);

    const fire = this.scene.add.circle(width - 114, height - 138, 78, 0xff8b3d, 0.32).setScrollFactor(0).setDepth(40);
    this.fireIndicator = this.scene.add.circle(width - 114, height - 138, 44, 0xffb77a, 0.2).setScrollFactor(0).setDepth(41);
    fire.setInteractive();

    const ability = this.scene.add.rectangle(width - 268, height - 136, 102, 102, 0x89f5ff, 0.35).setScrollFactor(0).setDepth(40).setInteractive();
    this.scene.add.text(width - 268, height - 136, 'BLINK', { fontFamily: 'Verdana', fontSize: '16px', color: '#05243b' }).setOrigin(0.5).setDepth(41);
    ability.on('pointerdown', () => {
      this.state.abilityPressed = true;
    });

    if (this.options.showSecondaryButton) {
      const secondary = this.scene.add.rectangle(width - 268, height - 262, 102, 102, 0xffe07a, 0.35).setScrollFactor(0).setDepth(40).setInteractive();
      this.scene.add.text(width - 268, height - 262, 'SEC', { fontFamily: 'Verdana', fontSize: '20px', color: '#382a06' }).setOrigin(0.5).setDepth(41);
      secondary.on('pointerdown', () => {
        this.state.secondaryPressed = true;
      });
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const half = this.scene.scale.width * 0.5;
    if (pointer.x < half && this.leftPointerId === null) {
      this.leftPointerId = pointer.id;
      this.joystickCenter.set(pointer.x, pointer.y);
      this.updateStick(pointer);
      return;
    }
    if (pointer.x >= half) {
      this.rightFirePointers.add(pointer.id);
      this.state.firing = true;
      this.fireIndicator.setFillStyle(0xffc08f, 0.7);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.leftPointerId === pointer.id && pointer.isDown) {
      this.updateStick(pointer);
    }
    if (pointer.x >= this.scene.scale.width * 0.5 && pointer.isDown) {
      this.rightFirePointers.add(pointer.id);
      this.state.firing = true;
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.leftPointerId === pointer.id) {
      this.leftPointerId = null;
      this.stick.set(0, 0);
      this.state.moveX = 0;
      this.state.moveY = 0;
      this.stickKnob.setPosition(this.joystickCenter.x, this.joystickCenter.y);
    }

    this.rightFirePointers.delete(pointer.id);
    if (this.rightFirePointers.size === 0 && !(this.keys?.fire.isDown ?? false)) {
      this.state.firing = false;
      this.fireIndicator.setFillStyle(0xffb77a, 0.2);
    }
  }

  private updateStick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.joystickCenter.x;
    const dy = pointer.y - this.joystickCenter.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const mag = Math.min(this.joystickRadius, len) / this.joystickRadius;
    this.stick.set((dx / len) * mag, (dy / len) * mag);
    this.state.moveX = this.stick.x;
    this.state.moveY = this.stick.y;
    this.stickKnob.setPosition(this.joystickCenter.x + this.stick.x * this.joystickRadius, this.joystickCenter.y + this.stick.y * this.joystickRadius);
  }

  consumeAbility(): boolean {
    const value = this.state.abilityPressed;
    this.state.abilityPressed = false;
    return value;
  }

  consumeSecondary(): boolean {
    const value = this.state.secondaryPressed;
    this.state.secondaryPressed = false;
    return value;
  }

  snapshot(): InputState {
    return { ...this.state };
  }
}
