import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/engine/GameEngine.js";

const neutral = () => ({
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
});

describe("GameEngine", () => {
  it("produces a stable snapshot shape after starting a match", () => {
    const engine = new GameEngine();
    engine.startMatch("VEX", "BYTE");
    const s = engine.getSnapshot();

    expect(s.p1.name).toBe("VEX");
    expect(s.p2.name).toBe("BYTE");
    expect(s.round).toBe(1);
    expect(Array.isArray(s.events)).toBe(true);
    expect(s.debug).toHaveProperty("hitboxes");
    expect(s.debug).toHaveProperty("hurtboxes");
  });

  it("emits HIT and decreases defender health when a strike connects", () => {
    const engine = new GameEngine();
    engine.startMatch("VEX", "BYTE");

    engine.player.x = 430;
    engine.cpu.x = 490;
    const before = engine.cpu.hp;

    let sawHit = false;
    for (let i = 0; i < 45; i += 1) {
      const p1 = i === 0 ? { ...neutral(), hitPressed: true } : neutral();
      const s = engine.update(1 / 60, p1, neutral());
      if (s.events.some((e) => e.type === "HIT")) {
        sawHit = true;
        break;
      }
    }

    expect(sawHit).toBe(true);
    expect(engine.cpu.hp).toBeLessThan(before);
  });

  it("emits BLOCK and only chip damage when defender is guarding", () => {
    const engine = new GameEngine();
    engine.startMatch("VEX", "BYTE");

    engine.player.x = 430;
    engine.cpu.x = 490;
    const before = engine.cpu.hp;

    let blockEvent = null;
    for (let i = 0; i < 45; i += 1) {
      const p1 = i === 0 ? { ...neutral(), powerPressed: true } : neutral();
      const p2 = { ...neutral(), guardHeld: true };
      const s = engine.update(1 / 60, p1, p2);
      blockEvent = s.events.find((e) => e.type === "BLOCK") || blockEvent;
      if (blockEvent) break;
    }

    expect(blockEvent).not.toBeNull();
    expect(engine.cpu.hp).toBeLessThan(before);
    expect(before - engine.cpu.hp).toBeLessThan(4);
  });
});
