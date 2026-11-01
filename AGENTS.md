# FoundIt working agreement

Read docs/SETUP.md and docs/PLAN.md before implementation. The foundation and backend checkpoints are merged; the integration branch connects the frontend to the agreed contract. See docs/FRONTEND.md and docs/DEMO.md for verified scope and remaining gates.

## Architecture
React/Vinext on Sites; TypeScript server routes; D1 (DB); R2 (BUCKET); supplied ChatGPT sign-in helpers. The earlier Python/FastAPI proposal is superseded. Preserve the Sites runtime and build integration.

## Sole ownership
- Adarsh (frontend): app pages/layouts/styles EXCEPT app/api/** and app/chatgpt-auth.ts; components/**; hooks/**; public/**; lib/client/**; lib/utils.ts; tests/frontend/**; docs/FRONTEND.md; pitch/demo materials.
- Ayan (backend): app/api/**; lib/server/**; db/**; drizzle/**; tests/backend/**; docs/BACKEND.md; docs/API.md; shared/** (future API contract/types/examples).
- Adarsh (integration/publishing): all root manifests/configs/lockfiles; .openai/**; .github/**; scripts/**; worker/**; vendor/**; docs/SETUP.md; docs/PLAN.md; docs/SITES-STARTER.md; AGENTS.md.
- Adarsh (demo/evaluation documentation): docs/DEMO.md, docs/EVALUATION.md and scripts/evaluate-matching.ts. Evaluation runs server matching offline; client code still never imports server modules.
- Preserve supplied app/chatgpt-auth.ts and lib/connector* infrastructure unless a specific change is coordinated with Adarsh.
- Preserve the original README.md unless the repository owner explicitly requests changes.
- Assign an owner before adding paths outside these areas. Frontend imports shared types, never server/database modules into client code.

## Coordination
Use frontend/core and backend/core branches from main after the setup PR is merged. Adarsh owns integration and publication. Each owner commits/pushes and opens a PR. Do not merge another owner's work without review.
Ayan's first checkpoint defines shared API types/examples and health/bootstrap endpoints. Both agree on fields before integration. Update docs/API.md and shared types together; no unilateral breaking changes. Request root dependency/configuration changes from Adarsh.
Check branch/status before editing. Do not overwrite teammate changes, force-push shared branches, or merge main automatically. Secrets and publishing credentials never belong in commits/messages.

## Invariants for later implementation
- Backend owns scores, identity, permissions, private evidence, and state transitions.
- Public responses exclude private clues/evidence, owner identity, and original photo URLs.
- AI suggestions are editable; unknowns remain unknown. No hardcoded matches or online-learning claims.
- Approval reserves items; confirmed handover marks recovery. Human staff approve ownership.
- Use Sites server identity, not browser-supplied owner IDs. Staff allowlist checks are server-side.
- No NEXT_PUBLIC_/VITE_ secrets. Keep local secret files ignored and use hosted runtime secrets.
- Fixtures must be labelled and isolated from the real demo.
- Do not create/deploy a Site or change audience solely to verify this foundation.

## Verification
Run npm run typecheck and npm run build for source/config changes. Add meaningful tests when implementing behavior; no product test suite exists yet. Check relevant browser flows for UI work. Report actual outcomes and limits, never planned tests as passing.
