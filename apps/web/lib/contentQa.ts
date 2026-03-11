type QaInput = {
  projectType: string;
  caption: string;
  assetKinds: string[];
  assetCount: number;
};

const BLOCKED_POLICY_TERMS = ["hate", "terror", "violence", "extremist"];

export function evaluateContentQa(input: QaInput) {
  const issues: string[] = [];
  let technicalScore = 100;
  let policyScore = 100;

  if (input.assetCount === 0) {
    technicalScore -= 60;
    issues.push("No render asset available for publish.");
  }

  if (input.projectType === "SHORT" && !input.assetKinds.includes("SHORT_MP4") && !input.assetKinds.includes("HLS_MANIFEST")) {
    technicalScore -= 50;
    issues.push("Short publish requires SHORT_MP4 or HLS_MANIFEST.");
  }
  if (input.projectType === "MEME" && !input.assetKinds.includes("MEME_PNG")) {
    technicalScore -= 50;
    issues.push("Meme publish requires MEME_PNG.");
  }

  const normalizedCaption = input.caption.toLowerCase();
  for (const term of BLOCKED_POLICY_TERMS) {
    if (normalizedCaption.includes(term)) {
      policyScore -= 45;
      issues.push(`Caption contains high-risk policy term: ${term}.`);
    }
  }

  const status = technicalScore >= 60 && policyScore >= 65 ? "PASS" : "FAIL";
  return { status, technicalScore, policyScore, issues };
}
