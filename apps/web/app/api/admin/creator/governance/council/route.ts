export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/rbac";
import { listCouncilProposals, submitCouncilProposal, voteCouncilProposal } from "@/lib/creatorGovernanceCouncil";

const submitSchema = z.object({
  action: z.literal("submit"),
  proposalId: z.string().min(1),
  title: z.string().min(1),
  proposerId: z.string().min(1),
  policyArea: z.string().min(1)
});

const voteSchema = z.object({
  action: z.literal("vote"),
  proposalId: z.string().min(1),
  voterId: z.string().min(1),
  vote: z.enum(["yes", "no"])
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const proposals = await listCouncilProposals();
  return NextResponse.json({ ok: true, proposals });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsedSubmit = submitSchema.safeParse(body);
  if (parsedSubmit.success) {
    const result = await submitCouncilProposal(parsedSubmit.data);
    if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });
    return NextResponse.json({ ok: true, result });
  }

  const parsedVote = voteSchema.safeParse(body);
  if (parsedVote.success) {
    const result = await voteCouncilProposal(parsedVote.data);
    if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ error: "invalid payload" }, { status: 400 });
}
