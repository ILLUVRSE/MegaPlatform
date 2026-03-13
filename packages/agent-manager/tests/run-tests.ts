import { spawnSync } from "child_process";
import path from "path";

function parseArg(name: string) {
  const index = process.argv.findIndex((arg) => arg === name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const filter = parseArg("--run");
const testsDir = path.resolve(import.meta.dirname);
const target = filter ? path.join(testsDir, filter) : path.join(testsDir, "*.test.ts");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", target], {
  cwd: path.resolve(import.meta.dirname, ".."),
  stdio: "inherit"
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
