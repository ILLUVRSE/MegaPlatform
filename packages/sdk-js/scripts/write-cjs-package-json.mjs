import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(import.meta.dirname, "..", "dist", "cjs");

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "package.json"), JSON.stringify({ type: "commonjs" }, null, 2));
