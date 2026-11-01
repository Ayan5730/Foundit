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

## Targeted phone diagnostics
`npm run evaluate:matching` now also reports 12 additional fictional phone/electronics scenarios under `targeted_phone`. These cases were written after discovering that a black phone and black headphones could be suggested together. They are developer-authored diagnostics, not an independent holdout or a measured field accuracy rate. The original 24 rows and their split remain unchanged so that provider comparisons still use the same baseline.

On main commit 079c156 before the Electronics item-type guard, the correct candidate appeared in the top three for 5/5 positive phone scenarios. All 7 deliberately challenging negative queries received a suggestion, with 9 false suggestions in total.

After the matching-quality PR merged, the 1 November rerun on main commit e2f6971 still retrieved 5/5 positive phone scenarios. Four of 7 deliberately challenging negative queries received a suggestion, with 5 false suggestions total. The guard excludes clearly different named Electronics types such as phone versus headphones; different black phones, color conflicts, long time gaps and generic devices still expose limits. These developer-authored diagnostics are not an independent field accuracy rate.

These cases show why a 0-100 similarity score must never be read as an ownership probability. A useful next evaluation needs real desk inventory and independently labelled reports, including similarly described phones, before changing broad thresholds or claiming precision.

The UI displays the actual conflicting/unknown signals and requires private human verification. These results do not authorize recovery or establish real-world precision. Any scoring-rule change needs a stated rationale and a fresh held-out set rather than tuning these results away.

## Live paired text evaluation

On 1 November 2026, OpenAI and Cerebras passed the synthetic connection check with the owner's local configuration. The paired evaluation then used Cerebras `qwen-3.8-27b` on the same 24 fictional cases and fixed matcher in both arms. The first run had seven failed normalizations despite HTTP 200 responses: seven completions reached the 800-token cap. Disabling Qwen reasoning for this short structured-output task produced a completed rerun: 18/18 requests returned HTTP 200, no normalization failed, and the largest completion used 85 tokens. These are local synthetic observations, not a hosted or real-attendee test.

| 24-case comparison | Raw fields | Cerebras suggestions applied automatically |
|---|---:|---:|
| Positive queries with correct candidate in top three | 12/13 | 12/13 |
| Negative queries receiving a candidate | 3/11 | 4/11 |
| False candidate suggestions across all cases | 3 | 6 |

The automatic suggestion arm added false candidates in cases 8, 9 and 20 and did not recover the missed positive. It provides **no measured matching improvement** on this set. The product shows suggestions for explicit review and editing; the evaluation deliberately applies them automatically to expose possible effects. Do not present Cerebras as improving retrieval or the score from these results. Its current role is optional, editable description help and a follow-up question. Manual reporting remains available.

The paired runner is `npm run evaluate:providers -- --live`; without `--live` it makes no calls and reports `not_run`. Reports under ignored `outputs/` include numeric usage and request duration, but no key, prompt, private evidence or inferred billable cost. The developer-authored cases are small and previously inspected, so this result does not establish field accuracy.

## What is not measured

OpenAI photo-attribute accuracy, Cerebras suggestion quality against independently labelled real descriptions, hosted provider behavior, billable cost, large-inventory ranking and real attendee recovery outcomes remain unmeasured. The two-provider demo links directly to the official Rapid Metro page; the optional backend Exa adapter is outside the demo and its live source quality remains unmeasured. Per-scenario matcher timings are process-only observations, including cold start variation; they are not HTTP/provider latency or a service-level promise.

## Other verification
The current 29 backend tests cover privacy, approved item-preview access and hiding, authorization, idempotency, reservations, invalid/competing review, repeated handover, provider failures, malformed data, guidance caching and Qwen request behavior. Five of those cover release tooling: opt-in provider calls, numeric-only usage reports, paired evaluation, redirect/origin protection and the real handler workflow with isolated actors. Ten frontend tests cover form validation, event time mapping, retry identity and API errors.
Local D1/R2 browser flow supplements SQL-adapter tests; hosted multi-user verification remains required.
