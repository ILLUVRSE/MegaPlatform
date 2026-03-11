import fs from "node:fs";
import path from "node:path";

const rosterPath = path.resolve("src/engine/roster/roster.json");
const fightersRoot = path.resolve("src/assets/fighters");
const REQUIRED_ANIMS = [
  "idle",
  "walk",
  "crouch",
  "jump",
  "hit",
  "block",
  "attack_hit",
  "attack_kick",
  "attack_power",
  "knockdown",
  "ko"
];

if (!fs.existsSync(rosterPath)) {
  console.error(`Missing roster file: ${rosterPath}`);
  process.exit(1);
}

const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8"));
const slots = Array.isArray(roster.slots) ? roster.slots : [];
let ok = true;

for (const id of slots) {
  const dir = path.join(fightersRoot, id);
  const atlasPng = path.join(dir, "atlas.png");
  const atlasJson = path.join(dir, "atlas.json");
  if (!fs.existsSync(atlasPng) || fs.statSync(atlasPng).size <= 0) {
    console.error(`[asset-check] Missing or empty atlas.png for '${id}'`);
    ok = false;
  }
  if (!fs.existsSync(atlasJson) || fs.statSync(atlasJson).size <= 2) {
    console.error(`[asset-check] Missing or empty atlas.json for '${id}'`);
    ok = false;
    continue;
  }

  try {
    const data = JSON.parse(fs.readFileSync(atlasJson, "utf8"));
    if (!data.frames || typeof data.frames !== "object") {
      console.error(`[asset-check] Invalid atlas.json frames for '${id}'`);
      ok = false;
      continue;
    }
    const animations = data.animations || {};
    for (const key of REQUIRED_ANIMS) {
      const entry = animations[key];
      if (!entry || !Array.isArray(entry.frames) || entry.frames.length === 0) {
        console.error(`[asset-check] Missing animation '${key}' for '${id}'`);
        ok = false;
        continue;
      }
      for (const frameName of entry.frames) {
        if (!data.frames[frameName]) {
          console.error(`[asset-check] Animation '${key}' references missing frame '${frameName}' for '${id}'`);
          ok = false;
        }
      }
    }
  } catch {
    console.error(`[asset-check] atlas.json is not valid JSON for '${id}'`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log(`[asset-check] OK: validated ${slots.length} roster fighters and required animation keys`);
