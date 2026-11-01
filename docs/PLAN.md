# FoundIt agreed build plan

Status (1 November 2026): foundation, contract, backend and connected frontend checkpoints are merged. The complete recovery workflow is verified locally. Release automation adds opt-in provider checks, paired text-normalization evaluation and hosted account/workflow checks. Live providers, hosted multi-account verification, second-device rehearsal, recording and business validation remain release gates. See FRONTEND.md, EVALUATION.md, DEMO.md and RELEASE.md for actual evidence. The original ChatGPT handoff's FastAPI claims do not describe this repository.

Current demo decision: use OpenAI for visible photo attributes and Cerebras for editable text suggestions, subject to live checks and paired evaluation. The no-match browser flow links to Rapid Metro's official lost-and-found page directly. The original Exa proposal below remains documented, while its backend endpoint is unused by the two-provider demo and awaits backend-owner review.

## Decisions
- Six-hour build; events/hackathons first; dedicated staff screen.
- Adarsh: frontend, integration, and publication. Ayan: backend.
- One Sites-hosted React/Vinext application with TypeScript server routes, D1 and private R2 files. This supersedes React SPA + Python FastAPI.
- OpenAI, Cerebras, Exa API access is reported available; each needs a real connection check.
- Sites ChatGPT identity; staff IDs allowlisted server-side.
- Public hosted link with local workflow/recording backup. No deployment during the foundation task.
- One event: FoundIt Hackathon Help Desk; do not imply organizer endorsement.

## Outcome
Lost/found reports -> real ranked match -> private claim -> staff approval -> confirmed handover.
When no match exists, return source-linked official recovery guidance. Product claims must remain inspectable. No calibrated probability or online-learning claims.

## Ownership and workflow
AGENTS.md is authoritative for paths. Frontend and backend use separate branches from the same merged foundation. Adarsh owns root configuration/lockfiles and the integration branch. Ayan proposes the shared executable API contract/examples first; both agree before feature integration. Shared contract ownership does not authorize breaking frontend assumptions.
Use PR checkpoints; verify each merged flow before continuing. Keep GitHub source sharing distinct from Sites publishing. Never exchange credentials in Git.

## Data and privacy contract (planned)
- PublicReport: id, event_id, kind (lost/found), title, category, color, description, visible_features, location, occurred_at, status, created_at.
- PrivateReport: report owner, original image reference, finder reference clue.
- Claim: id, lost_report_id, found_report_id, claimant identity, evidence, status, timestamps.
- ReviewEvent: claim, staff actor, action, time, optional private note.
- Report states: active -> reserved -> recovered.
- Claim states: pending -> approved -> recovered, or pending -> rejected.
- Approval reserves; handover completes recovery. No competing reservations.
- Finder supplies a private clue before any claimant evidence exists.
- Original images: uploader and staff only. Public candidates use safe fields and category illustrations.
- Public endpoints never serialize owner identity, private reference clues, claimant evidence, or original image links.
- Anonymous visitors: landing/public summaries. Writes, owner records and matches: signed-in users. Staff access requires backend allowlist. Ownership always comes from Sites identity, not request body.

## Input conventions
Categories: Bags, Electronics, Keys, Clothing, Books, Accessories, Drinkware, Other.
Locations: Registration, Main Hall, Workshop Rooms, Cafeteria, Entrance, Other.
ISO 8601 timestamps with timezone offset; optional unknown values are null. Title <=120 characters; description/evidence <=2000; JPEG/PNG/WebP <=4 MB.
Create report/claim requests carry client-generated request IDs for deduplication. Use fictional demo data.
Ayan freezes exact TypeScript request/response schemas and JSON examples with Adarsh at the first backend checkpoint. This document does not pretend those executable contracts already exist.

## API routes (all under /api/v1)
| Method/path | Planned behavior |
|---|---|
| GET /health | Availability, no secret values |
| GET /bootstrap | User/staff capability, event, choices, supported recovery organizations |
| POST /intake | Multipart description/photo; editable suggestions, at most one clarification |
| POST /reports | Save confirmed fields and attach owned intake/photo |
| GET /reports/{id} | Explicit public serializer |
| GET /me/reports | Owner reports |
| GET /reports/{id}/matches | Owner/staff; ranked public candidates and explanations |
| POST /claims | Claim a compatible lost/found pair |
| GET /me/claims | Owner claim summaries |
| GET /claims/{id} | Claimant evidence/status, never finder reference clue |
| GET /staff/claims | Staff queue and counts |
| GET /staff/claims/{id} | Staff comparison of evidence, clue, records and photos |
| POST /staff/claims/{id}/review | Approve/reject |
| POST /staff/claims/{id}/handover | Confirm physical handover |
| GET /media/{id} | Permission-checked image response |
| POST /recovery-guidance | Official sources for supported organization |

Success envelope: {data: ...}. Error: {error: {code, message, field_errors?}}.
401 missing identity; 403 forbidden action; 404 inaccessible individual private record; 409 state conflict; 422 invalid input.
Match response: candidate public report, integer score, reasons identifying supports/conflicts/unknowns, similarity disclaimer.
Intake returns provider availability and editable suggestions; manual reporting remains possible.

## AI roles and failure behavior
- OpenAI: visible photo attributes.
- Cerebras: normalize public descriptive input and propose one relevant missing-field question.
- Validate model output, preserve unknown values, require user confirmation.
- Never send private finder clues/claim evidence into public assistance or search.
- Exa: official Rapid Metro recovery guidance, restricted to the official DMRC domain. Return URLs/titles/passages/retrieval time; distinguish guidance from an item match.
- No arbitrary web pages promoted as verified inventory. Do not imply access to transit operators' private data.
- Cache successful organization guidance for one hour with retrieval time. Explicit no_sources/unavailable states.
- Bounded provider timeouts, partial intake results, manual fallback, no fake outputs.
- Provider-backed routes rate-limited per authenticated user: initial 10 requests/minute. Explicit invocation, not every keystroke.
- Pin event-accessible model IDs after connection tests. All provider calls and secrets stay server-side.
- Retrieved pages/model content are untrusted data, never instructions granting access.

## Initial matcher
Candidates: active, opposite kind, same event/category.
Score: category agreement 25; canonical color agreement 15; normalized feature Jaccard overlap up to25; location agreement20; time proximity up to15 declining linearly to zero at24h.
Unknown factors and empty feature sets contribute zero; no redistribution. Known color conflict subtracts20. Found >2h before lost caps total at40. Clamp0..100.
Return top3 scoring >=55 with color agreement or visible-feature overlap. Exclude reserved/recovered reports. Template explanations reflect actual signals; human verification determines ownership.
These are initial heuristic weights, not validated probabilities. Measure results on labelled cases before tuning.

## Schedule and acceptance gates
| Elapsed | Joint outcome |
|---|---|
| 0:30 | Contract/examples, provider checks, shared starter/hosted path when authorized |
| 1:30 | Browser report saved and read back after refresh |
| 2:30 | Different-wording match with real reasons |
| 3:30 | Private claim, staff approval and confirmed handover |
| 4:15 | Useful source-linked no-match guidance |
| 5:00 | Integrated hosted candidate; feature freeze |
| 6:00 | Rehearsed demo and backup |

Detailed individual work: FRONTEND.md and BACKEND.md. Timings describe the subsequent feature build, not completed foundation work.

## Verification and judging evidence
Approximately24 labelled synthetic cases: synonyms, similar distractors, unrelated categories, missing clues, impossible times, no match, rejected/competing claims, provider errors, unauthorized access.
Keep a held-out subset; compare raw vs AI-assisted normalization under identical scoring. Record actual top3 retrieval, false suggestions, latency and usage; disclose synthetic scope.
Test public response privacy, original-image access, forbidden staff actions, duplicate creates, competing approvals, repeat handover, and restart persistence.
No fabricated accuracy, users, recovery totals, or business traction.

## Publication, demo, and business
Adarsh registers/publishes only in a later authorized task, configuring DB/BUCKET, runtime secrets and returned Site identity. Verify private build, then requested public audience and separate claimant/staff accounts.
Local data is separate; loopback mock identity is not proof of hosted authorization. Keep a recording backup.
Demo: photo/confirmed attributes -> differently worded report -> candidate evidence -> private claim -> staff clue comparison -> approval -> handover -> sourced no-match guidance.
Adarsh documents organizer interviews with permission and the proposed event-package buyer. Ayan supplies actual latency/usage measurements. Attendees use it free; organizer willingness to pay and pricing remain hypotheses.
Cut decorative polish, analytics/filters, additional organizations, advanced clarification, extra image formats before cutting privacy, persistence, review, handover or integration checks.
