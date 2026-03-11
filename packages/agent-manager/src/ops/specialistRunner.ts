import { runSpecialist } from "./specialist";
import type { OpsAgent } from "./taskQueue";

function parseAgentArg() {
  const idx = process.argv.findIndex((arg) => arg === "--agent");
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error("Missing required --agent argument");
  }
  return process.argv[idx + 1] as OpsAgent;
}

async function main() {
  const agent = parseAgentArg();
  const result = await runSpecialist(agent);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
