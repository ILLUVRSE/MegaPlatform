import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve("src/assets");
const publicDir = path.resolve("public");
const outDir = path.join(publicDir, "assets");

if (!fs.existsSync(srcDir)) {
  console.error(`Missing source assets directory: ${srcDir}`);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(srcDir, outDir, { recursive: true });

console.log(`Synced assets: ${srcDir} -> ${outDir}`);
