import { describe, expect, it } from "vitest";
import { submitCouncilProposal, voteCouncilProposal } from "@/lib/creatorGovernanceCouncil";

describe("creator governance council api", () => {
  it("tracks proposals, votes, and outcomes", async () => {
    const submit = await submitCouncilProposal({
      proposalId: "prop-160",
      title: "Adjust remix rights baseline",
      proposerId: "creator-1",
      policyArea: "rights"
    });

    expect(submit.ok).toBe(true);
    if (!submit.ok) return;

    await voteCouncilProposal({ proposalId: "prop-160", voterId: "c1", vote: "yes" });
    const vote = await voteCouncilProposal({ proposalId: "prop-160", voterId: "c2", vote: "yes" });

    expect(vote.ok).toBe(true);
    if (!vote.ok) return;
    const proposal = vote.proposal as { status?: string };
    expect(proposal.status).toBe("approved");
  });
});
