import path from "path";
import { existsSync } from "node:fs";

export function findRepoRootSync(start = process.cwd()) {
  let current = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return start;
}
