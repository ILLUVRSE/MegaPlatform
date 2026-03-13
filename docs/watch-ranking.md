# Watch Ranking Freshness

The wall/watch feed now applies three freshness controls:

- A configurable recency weight multiplies the exponential half-life score.
- An age-bucket decay schedule reduces freshness for content older than 24h, 72h, and 7d.
- Newly trending items receive a short-window surge when both total engagement and engagement velocity clear threshold.

Server-side guardrails cap freshness for rapid low-quality posts. Posts created inside the rapid-post window must clear the minimum engagement threshold before they can receive the full freshness contribution or any surge boost.

Offline evaluation is runnable with:

```bash
node packages/recommendation/offline/evalHarness.mjs --scenario=watch-freshness
```

The evaluator compares the baseline wall ranker against the freshness-aware formula and reports simulated CTR plus AUC and KS so rollout decisions can consider both rank quality and click bias.
