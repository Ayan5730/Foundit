# FoundIt working agreement

Read docs/SETUP.md and docs/PLAN.md before implementation. The foundation, backend and connected frontend are merged. See docs/FRONTEND.md, docs/DEMO.md and docs/RELEASE.md for verified scope and remaining gates.

## Architecture
React/Vinext on Sites; TypeScript server routes; D1 (DB); R2 (BUCKET); supplied ChatGPT sign-in helpers. The earlier Python/FastAPI proposal is superseded. Preserve the Sites runtime and build integration.

## Current ownership
- Adarsh now handles frontend, backend, integration and publication. The earlier Adarsh/Ayan path split documents completed checkpoints, not a current editing restriction.
- Frontend paths: app pages/layouts/styles except app/api/** and app/chatgpt-auth.ts; components/**; hooks/**; public/**; lib/client/**; lib/utils.ts; tests/frontend/**; docs/FRONTEND.md; pitch/demo materials.
- Backend paths: app/api/**; lib/server/**; db/**; drizzle/**; tests/backend/**; docs/BACKEND.md; docs/API.md; shared/**.
- Integration and publication paths: root manifests/configs/lockfiles; .openai/**; .github/**; scripts/**; worker/**; vendor/**; docs/SETUP.md; docs/PLAN.md; docs/SITES-STARTER.md; docs/DEMO.md; docs/EVALUATION.md; docs/RELEASE.md; AGENTS.md. Evaluation and release scripts run server matching/adapters outside the browser; client code still never imports server modules.
- Preserve supplied app/chatgpt-auth.ts and lib/connector* infrastructure unless a specific change is coordinated with Adarsh.
- Preserve the original README.md unless the repository owner explicitly requests changes.
- Assign an owner before adding paths outside these areas. Frontend imports shared types, never server/database modules into client code.

## Coordination
The frontend/core and backend/core checkpoints are merged. Use focused branches and reviewed PRs for further changes. Adarsh owns integration and publication. The shared API types/examples and health/bootstrap endpoints are established; update docs/API.md and shared types together when changing fields. Do not break frontend or backend assumptions silently.
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
Run npm run typecheck, npm test and npm run build for source/config changes. Add meaningful tests when implementing behavior. Check relevant browser flows for UI work. Report actual outcomes and limits, never planned tests as passing. Live provider and hosted verification are explicit opt-in checks, never part of ordinary CI.
