import type { InputSnapshot } from "./types";

export class InputManager {
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private mouseDown = false;
  private mouseClicked = false;
  private mouseX = 0;
  private mouseY = 0;
  private enabled = true;

  constructor(private canvas: HTMLCanvasElement) {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    canvas.addEventListener("mousemove", this.handleMouseMove);
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.keysDown.clear();
      this.keysPressed.clear();
      this.mouseDown = false;
      this.mouseClicked = false;
    }
  }

  snapshot(): InputSnapshot {
    const keysDown: Record<string, boolean> = {};
    const keysPressed: Record<string, boolean> = {};

    this.keysDown.forEach((key) => {
      keysDown[key] = true;
    });
    this.keysPressed.forEach((key) => {
      keysPressed[key] = true;
    });

    const snapshot = {
      keysDown,
      keysPressed,
      mouse: {
        x: this.mouseX,
        y: this.mouseY,
        down: this.mouseDown,
        clicked: this.mouseClicked
      }
    };

    this.keysPressed.clear();
    this.mouseClicked = false;

    return snapshot;
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.enabled) return;
    if (event.repeat) return;
    this.keysDown.add(event.code);
    this.keysPressed.add(event.code);
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (!this.enabled) return;
    this.keysDown.delete(event.code);
  }

  private handleMouseDown(event: MouseEvent) {
    if (!this.enabled) return;
    this.mouseDown = true;
    this.mouseClicked = true;
    this.updateMousePosition(event);
  }

  private handleMouseUp(event: MouseEvent) {
    if (!this.enabled) return;
    this.mouseDown = false;
    this.updateMousePosition(event);
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.enabled) return;
    this.updateMousePosition(event);
  }

  private updateMousePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouseX = (event.clientX - rect.left) * scaleX;
    this.mouseY = (event.clientY - rect.top) * scaleY;
  }
}
