# Ayan's backend plan

Status: future work. Follow AGENTS.md and PLAN.md. Use TypeScript Sites routes, not FastAPI.

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
