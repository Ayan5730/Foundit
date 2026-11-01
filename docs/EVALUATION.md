# Matching evaluation — 1 November 2026

Run `npm run evaluate:matching`. The same rows are also saved in ignored outputs/matching-evaluation.json.
The integration-owned runner calls Ayan's existing matcher offline. It does not change weights, read a database, seed the demo or call a provider.

## Fixed synthetic baseline
24 labelled scenarios: 16 development, 8 held out before the first execution. No threshold tuning followed these results. The same developer authored the examples and inspected implementation; this is not an independent or representative benchmark. Most candidate pools are deliberately small.

| Split | Expected positive queries | Top-three hits | Expected negative queries | Negatives with a suggestion |
|---|---:|---:|---:|---:|
| Development | 8 | 8 | 8 | 1 |
| Held out | 5 | 4 | 3 | 2 |
| Total | 13 | 12 | 11 | 3 |

Three false candidate suggestions were returned in total. Scores are heuristic similarity, never ownership probabilities or recovery accuracy.

Known limits exposed:
- An unrelated blue bag at the same place/time scores 75 even without feature overlap.
- Otherwise identical reports with conflicting color can score 65.
- Otherwise identical reports five days apart can score 85.
- Unseen synonyms with missing color can miss a true candidate.

The UI displays the actual conflicting/unknown signals and requires private human verification. These results do not authorize recovery or establish real-world precision. Ayan should propose any scoring-rule change, agree on its impact, and evaluate against a fresh held-out set rather than tuning these results away.

## What is not measured
Live OpenAI/Cerebras normalization versus raw input, Exa source quality, provider latency/token usage/cost, large-inventory ranking and real attendee recovery outcomes remain unmeasured. The offline runner made zero provider calls.
The paired text-normalization runner is now available as `npm run evaluate:providers -- --live`; without --live it makes no calls and reports not_run. It reuses the fixed cases/scoring in both arms and records actual numeric usage and durations. See RELEASE.md for configuration, call limits and the distinction between synthetic suggestions and user confirmation. Tooling availability is not a measured improvement.
Per-scenario matcher timings are process-only observations, including cold start variation; they are not HTTP/provider latency or a service-level promise.

## Other verification
The separate 18 backend tests cover privacy, authorization, idempotency, reservations, invalid/competing review, repeated handover, provider failures, malformed data and guidance caching. Five release-tool tests cover opt-in provider calls, numeric-only usage reports, paired evaluation, redirect/origin protection and the real handler workflow with isolated actors. Nine frontend tests cover form validation, event time mapping, retry identity and API errors.
Local D1/R2 browser flow supplements SQL-adapter tests; hosted multi-user verification remains required.
