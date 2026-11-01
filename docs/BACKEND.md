# Ayan's backend plan

Status: backend and connected frontend checkpoints are merged in main. Live providers and hosted multi-user verification remain pending; RELEASE.md supplies opt-in connection/evaluation/workflow checks. Follow AGENTS.md and PLAN.md. Use TypeScript Sites routes, not FastAPI.

## First checkpoint
Read docs/API.md and shared/api.ts for the proposed executable contract; typed JSON examples live in shared/examples.ts. Health and bootstrap are dynamic, no-store routes. Authentication uses the existing Sites helper and an exact server-side staff-ID allowlist. No frontend/hosting/root dependency files are changed.

## Environment names (server-only)
OPENAI_API_KEY and OPENAI_MODEL: vision-capable Responses model, set together.
CEREBRAS_API_KEY and CEREBRAS_MODEL: structured-output chat model, set together.
EXA_API_KEY: official-source recovery guidance.
STAFF_USER_IDS: comma-separated exact Sites user IDs; unset grants no staff role.
DB and BUCKET are existing platform bindings, not string environment secrets.
Use the ignored .dev.vars file locally; configure hosted secrets through the publishing owner later. Do not send keys in chats, commit them, or use public environment prefixes. The user requested mocked verification; live provider calls are not authorized for this run.

## Backend verification command
Use node --experimental-strip-types --test tests/backend/*.test.ts with Node >=22.13.0; no root package edits/dependencies are needed. Also run npm run typecheck and npm run build. Hosted identity/header integrity must be verified on Sites later; local mocks are not production proof.

## Ownership
app/api, lib/server, db, drizzle, backend tests, shared contract/types/examples, API documentation. Request root dependency/config/hosting changes from Adarsh. No frontend edits.

## Sequence
1. 0:00-0:30: clone starter; define shared types and concrete JSON examples; health/bootstrap; Sites identity wrapper/staff allowlist; check each provider and pin supported model IDs. Provide environment names, never keys in commits.
2. 0:30-1:30: reports/private records/intakes/uploads/claims/review events/reservations schema and migrations. Explicit public serializer, authenticated owner operations, private R2 images, type/size/attachment ownership checks and deduplication. Reject client owner/status overrides.
3. 1:30-2:30: OpenAI photo attributes -> Cerebras public normalization/one clarification -> validation/user confirmation. Implement deterministic PLAN.md matching and template reasons. No private evidence in public AI pipeline.
4. 2:30-3:30: claimant owns lost report; compatible active pair; separate claimant/staff serializers; atomic review/reservation; unique reservations prevent competing approvals; atomic handover; audit actor/time; harmless repeat handover and 409 invalid transitions.
5. 3:30-4:15: Exa official Rapid Metro guidance using DMRC domain restriction; sourced passages/time, explicit unavailable/no_sources, one-hour cache. No private input in search.
6. 4:15-5:00: meaningful tests for matching, state transitions, privacy, permissions, provider errors and deployed origin; private no-store responses; no sensitive payloads in logs. Safe fictional demo loader separate from migrations, never clearing unrelated data.
7. 5:00-6:00: integration fixes, provider/persistence checks, real staff/attendee authorization tests, rehearsal and actual latency/usage.

## Runtime
DB and BUCKET are declared locally; the eight-table schema and initial migration are implemented. Read SETUP.md for migrations and local auth limitations.
Keep provider secrets in .dev.vars locally and hosted runtime secrets later. Use only server identity from the supplied helper. Staff IDs are configured separately; sign-in alone is insufficient.
Bound provider timeouts; preserve partial intake suggestions and manual reporting. Rate-limit provider-backed requests per authenticated user (initial10/minute). Never hardcode successful fallback results.

## Acceptance
Private evidence/images cannot be accessed by another user through changed IDs. Normal users cannot review. Competing claims cannot reserve the same report. Approval is not recovery. Repeated requests are safe. AI failures do not lose reports. Public data uses an explicit allowlist serializer.
Add tests with real behaviors, not dummy scaffolding tests. Share actual results and unfinished endpoints at each checkpoint.

## First next task
After setup PR merge, branch backend/core from main. Deliver shared contract/examples, health/bootstrap and a PR before broad feature work. Confirm the contract with Adarsh before implementing dependent endpoints.

## Delivered backend and verification
- First checkpoint e37805c: browser-safe shared contract/types/examples, health/bootstrap, staff-capability checks, HTTP envelopes.
- Contract agreement received before dependent endpoint work. API notes and schemas use the same snake_case/null/timezone conventions.
- Eight-table Drizzle schema and initial schema-only migration: reports/private references, intakes/private media, claims, reservations, review events, rate limits, guidance cache.
- Report/claim request replay is owner-scoped; changed payload with reused ID returns409. Public report and claimant/staff serializers are separate.
- Matching uses actual normalized attributes and documented weights. Scores remain heuristic. Atomic D1 batches and unique report reservations protect approval; only confirmed handover completes recovery.
- A precision guard excludes an Electronics candidate when both titles clearly name different item types (for example, phone versus headphones). Generic or mixed titles keep the original score; the 24-case bag baseline is unchanged. Broader item evaluation is still needed.
- Provider adapters use bounded calls and validated structured responses; private proof is never passed into the public assistance pipeline. Exa guidance is source-restricted, cited and cached.
- All 18 backend tests and 5 existing frontend tests pass. TypeScript and production builds pass. The generated migration was applied once to local D1; SQL-adapter tests load that same migration.
- Local HTTP smoke passed development sign-in, report create/readback, replay, computed match (sample score 99), R2 upload/read, claim creation, nonstaff review denial, and anonymous media denial.
- After stopping development and starting the built Worker, the public report still returned200 with private fields absent; bootstrap was anonymous and the owner-only report list returned401.
- Full staff handover, rejected/competing claims and private cross-user checks pass through the handler/SQL adapter. Hosted multi-user auth and real-provider results have not been verified. At this backend checkpoint the UI was preview-only; frontend integration subsequently merged in PR #4.

## Reproduce local storage and HTTP checks
Generate/build schema output first. If this migration is not yet applied to your local database, apply it once:
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_gray_speedball.sql
```
Do not replay an already-applied migration. Local/hosted state is separate. No hosted migrations were applied by this work.

With provider secrets and STAFF_USER_IDS unset, run `npm run dev -- --port 4184`. Then, in a second terminal:
```sh
node --experimental-strip-types tests/backend/smoke-local.ts
```
The runner is restricted to loopback HTTP, uses only the built-in local development identity, creates clearly fictional records, and never deletes existing records. It intentionally does not test authorized staff actions against HTTP; use the backend integration tests for those until distinct hosted accounts are available. It expects no live provider configuration.

## Integration blockers and publishing-owner handoff
1. Frontend integration is complete in PR #4: shared schemas, bootstrap, report/intake, matching, claims and staff actions are connected. RELEASE.md tracks the remaining hosted/live gates.
2. Publishing owner configures existing DB/BUCKET bindings, applies migration via Sites publication, and sets server secrets/model IDs and staff-ID allowlist. No root dependency/config changes are required by this backend patch.
3. Verify provider account/model availability, actual latency/cost, hosted sign-in and isolation with distinct accounts, staff approval/handover, image permissions, and the final public URL before judging. No production-readiness or real-world accuracy claim is established by mocked tests.
4. All keys remain absent; no real provider calls, Site creation/deployment, or audience changes were performed. Request future root-script/dependency/hosting changes from Adarsh.
5. Tests use Node's experimental built-in SQLite as a transactional D1 adapter; real local D1/R2 HTTP checks supplement this but do not prove all hosted failure/concurrency behavior.
6. Publishing owner should update the foundation-era status text in docs/SETUP.md when integrating this branch; that document remains outside backend ownership.

Provider formats checked against:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://inference-docs.cerebras.ai/api-reference/chat-completions
- https://exa.ai/docs/reference/search
