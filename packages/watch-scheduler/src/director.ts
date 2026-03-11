import { runDirectorCycle } from "../../agent-manager/src/ops/director";

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

function readIntervalMs() {
  const value = Number(process.env.DIRECTOR_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  if (!Number.isFinite(value) || value < 10_000) return DEFAULT_INTERVAL_MS;
  return value;
}

async function runOnce() {
  const result = await runDirectorCycle();
  console.log(JSON.stringify({ service: "director", ts: new Date().toISOString(), ...result }));
  return result;
}

async function main() {
  const once = process.argv.includes("--once");
  if (once) {
    const result = await runOnce();
    if (!result.ok) process.exit(1);
    return;
  }

  const intervalMs = readIntervalMs();
  await runOnce();
  setInterval(() => {
    void runOnce();
  }, intervalMs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
