import path from "path";
import { replayAgentRun } from "./replay";

function parseArg(name: string) {
  const idx = process.argv.findIndex((arg) => arg === name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const actor = parseArg("--actor");
  const runId = parseArg("--run-id");
  if (!actor || !runId) {
    throw new Error("Usage: --actor <agent|Director> --run-id <id>");
  }

  const repoRoot = process.cwd();
  const replay = await replayAgentRun(repoRoot, actor, runId);
  console.log(JSON.stringify(replay, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
