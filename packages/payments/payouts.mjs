#!/usr/bin/env node
import {
  createPayoutBatches,
  previewPayoutBatches,
  runPayoutProcessor,
  summarizeCreatorEconomy,
  resolveCreatorEconomyRoot
} from "./core.mjs";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const processor = args.has("--processor=live") ? "live" : "fake";
const root = await resolveCreatorEconomyRoot();

const created = dryRun ? await previewPayoutBatches({ processor }, root) : await createPayoutBatches({ processor }, root);
const processed = dryRun ? [] : await runPayoutProcessor({ processor }, root);
const summary = await summarizeCreatorEconomy(root);

console.log(
  JSON.stringify(
    {
      ok: true,
      dryRun,
      processor,
      root,
      createdBatches: created.length,
      preview: dryRun ? created : undefined,
      processedBatches: processed,
      pendingReviews: summary.fraudReviews.filter((review) => review.status === "pending_review").length,
      queuedEvents: summary.payoutQueue.filter((event) => event.status === "queued").length
    },
    null,
    2
  )
);
