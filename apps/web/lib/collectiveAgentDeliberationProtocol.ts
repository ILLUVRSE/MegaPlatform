import path from "path";
import { promises as fs } from "fs";
import { createHash } from "crypto";
import { z } from "zod";

const policySchema = z.object({ minimumParticipants: z.number().int().min(1), approvalThreshold: z.number().min(0).max(1) });
const requestSchema = z.object({
  decisionId: z.string().min(1),
  positions: z.array(z.object({ agentId: z.string().min(1), stance: z.enum(["approve", "reject"]), rationale: z.string().min(1) })).min(1)
});
const fallback = { minimumParticipants: 3, approvalThreshold: 0.67 };

async function loadPolicy() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "ops", "governance", "collective-agent-deliberation-protocol.json"), "utf-8");
    const parsed = JSON.parse(raw);
    const validated = policySchema.safeParse(parsed);
    return validated.success ? validated.data : fallback;
  } catch { return fallback; }
}

export async function runCollectiveDeliberation(rawRequest: unknown) {
  const parsed = requestSchema.safeParse(rawRequest);
  if (!parsed.success) return { ok: false as const, reason: "invalid_request" };

  const policy = await loadPolicy();
  const transcript = [...parsed.data.positions].sort((a, b) => a.agentId.localeCompare(b.agentId));
  if (transcript.length < policy.minimumParticipants) {
    return { ok: false as const, reason: "insufficient_participants" };
  }

  const approvals = transcript.filter((entry) => entry.stance === "approve").length;
  const approvalRatio = approvals / transcript.length;
  const resolution = approvalRatio >= policy.approvalThreshold ? "approved" : "rejected";
  const transcriptDigest = createHash("sha256").update(JSON.stringify({ decisionId: parsed.data.decisionId, transcript, resolution })).digest("hex");

  return {
    ok: true as const,
    transcript,
    resolution,
    approvalRatio: Number(approvalRatio.toFixed(4)),
    transcriptDigest
  };
}
