# Ayan's backend plan

Status: first contract/health/bootstrap checkpoint implemented. Follow AGENTS.md and PLAN.md. Use TypeScript Sites routes, not FastAPI. Subsequent sequence below remains planned.

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
DB and BUCKET are already declared locally; schema remains empty for your implementation. Read SETUP.md for migrations and local auth limitations.
Keep provider secrets in .dev.vars locally and hosted runtime secrets later. Use only server identity from the supplied helper. Staff IDs are configured separately; sign-in alone is insufficient.
Bound provider timeouts; preserve partial intake suggestions and manual reporting. Rate-limit provider-backed requests per authenticated user (initial10/minute). Never hardcode successful fallback results.

## Acceptance
Private evidence/images cannot be accessed by another user through changed IDs. Normal users cannot review. Competing claims cannot reserve the same report. Approval is not recovery. Repeated requests are safe. AI failures do not lose reports. Public data uses an explicit allowlist serializer.
Add tests with real behaviors, not dummy scaffolding tests. Share actual results and unfinished endpoints at each checkpoint.

## First next task
After setup PR merge, branch backend/core from main. Deliver shared contract/examples, health/bootstrap and a PR before broad feature work. Confirm the contract with Adarsh before implementing dependent endpoints.
