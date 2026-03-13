import { replayAgentInteractions, replayAgentRun } from "./replay";

function parseArg(name: string) {
  const idx = process.argv.findIndex((arg) => arg === name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const actor = parseArg("--actor");
  const runId = parseArg("--run-id");
  const last = parseArg("--last");
  if (!actor || !runId) {
    if (!actor || !last) {
      throw new Error("Usage: --actor <agent|Director> --run-id <id> [--last <n>] OR --actor <agent|Director> --last <n>");
    }
  }

  const repoRoot = process.cwd();
  const replay = runId
    ? await replayAgentRun(repoRoot, actor, runId, { last: last ? Number(last) : undefined })
    : await replayAgentInteractions(repoRoot, actor, { last: Number(last) });
  console.log(JSON.stringify(replay, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
