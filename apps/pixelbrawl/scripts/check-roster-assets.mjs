import fs from "node:fs";
import path from "node:path";

const rosterPath = path.resolve("src/engine/roster/roster.json");
const fightersRoot = path.resolve("src/assets/fighters");

if (!fs.existsSync(rosterPath)) {
  console.error(`Missing roster file: ${rosterPath}`);
  process.exit(1);
}
if (!fs.existsSync(fightersRoot)) {
  console.error(`Missing fighters assets folder: ${fightersRoot}`);
  process.exit(1);
}

const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8"));
const fighterKeys = new Set(Object.keys(roster.fighters || {}));
const slots = Array.isArray(roster.slots) ? roster.slots : [];
const assetDirs = fs.readdirSync(fightersRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

let ok = true;

for (const id of slots) {
  if (!fighterKeys.has(id)) {
    console.error(`[roster-check] Slot '${id}' is not defined in fighters map`);
    ok = false;
  }
}

for (const id of fighterKeys) {
  const dir = path.join(fightersRoot, id);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`[roster-check] Missing fighter asset directory for '${id}'`);
    ok = false;
  }
}

for (const dir of assetDirs) {
  if (!fighterKeys.has(dir)) {
    console.error(`[roster-check] Orphan fighter asset directory not present in roster: '${dir}'`);
    ok = false;
  }
}

const zoneIds = [];
const walk = (root) => {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      walk(full);
      continue;
    }
    if (e.name.endsWith(":Zone.Identifier")) zoneIds.push(full);
  }
};
walk(fightersRoot);

if (zoneIds.length > 0) {
  for (const file of zoneIds) {
    console.error(`[roster-check] Remove Windows ADS artifact: ${path.relative(process.cwd(), file)}`);
  }
  ok = false;
}

if (!ok) process.exit(1);
console.log(`[roster-check] OK: roster/assets consistency validated (${fighterKeys.size} fighters)`);
