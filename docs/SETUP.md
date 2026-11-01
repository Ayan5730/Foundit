# FoundIt setup and integration

README.md is preserved. Read AGENTS.md for sole ownership and docs/API.md for the agreed contract.

## Current implementation
React/Vinext on Sites, TypeScript API routes, D1 DB, private R2 BUCKET and the supplied ChatGPT identity helpers. Backend checkpoints and initial frontend shell are merged; integration/complete-demo connects the full recovery UI.
Reports, private intakes/photos, matching, claims, staff review, reservations, handover, rate limits and guidance cache are implemented. See docs/DEMO.md for remaining verification.

## Local setup
Node >=22.13.0 (Node 24 works), npm, Git; publication also needs tar.
```sh
git clone https://github.com/adarshyadav428/Foundit.git
cd Foundit
npm run install:ci
npm run typecheck
npm run test:frontend
node --experimental-strip-types --test tests/backend/*.test.ts
npm run build
```
For an existing checkout, preserve local changes and use its current branch. Do not reinstall when dependencies and lockfile are unchanged.

Apply the initial migration ONCE to a new local database after building:
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_gray_speedball.sql
```
Do not replay applied migrations. Later migrations must retain their history. Local and hosted data are separate; Sites publication applies pending hosted schema migrations. Demo data never belongs in migrations.

Run `npm run dev` and open the printed loopback URL, normally http://127.0.0.1:5173. Stop with Ctrl+C before building on Windows to avoid locked dist files.
`npm start` serves the built Worker locally using the same .wrangler/state; it does not deploy and does not simulate sign-in.

## Runtime configuration names
Examples contain names with empty values only. Use ignored .dev.vars for local Worker secrets, not public prefixes or committed files.
- OPENAI_API_KEY, OPENAI_MODEL
- CEREBRAS_API_KEY, CEREBRAS_MODEL
- EXA_API_KEY
- STAFF_USER_IDS

Set each model with its key after a connection test confirms account availability. All provider calls are server-side. Blank credentials produce truthful unavailable responses; manual reporting/matching still work.
DB and BUCKET are platform bindings, not string secrets. .env.example is an inventory; it does not automatically configure Worker runtime.

Development simulates ONE loopback user, local_seedy. For an isolated local staff rehearsal, temporarily set STAFF_USER_IDS to that development ID in ignored .dev.vars. Remove that fixture afterward; never configure it on the hosted Site. Other local configuration must be preserved.
Hosted staff access requires exact Site-specific IDs from authenticated bootstrap/My account details. Account UUIDs from unrelated tools are not interchangeable with those IDs. Sign-in alone grants no staff role.

## Reproducible verification
```sh
npm run typecheck
npm run test:frontend
node --experimental-strip-types --test tests/backend/*.test.ts
node --experimental-strip-types scripts/evaluate-matching.ts
npm run build
```
Matching evaluation is offline, synthetic and read-only; it neither seeds data nor calls providers. See docs/EVALUATION.md.
The existing tests/backend/smoke-local.ts runner creates labelled fictional records on loopback only and never clears unrelated records. Follow docs/BACKEND.md for its required port/settings. Do not aim it at production.

## Team and publication
Ayan owns backend/schema/shared contract; Adarsh owns frontend, root configuration, integration and publication. Use PR review; do not merge another owner's work or main automatically.
.openai/hosting.json persists the one registered FoundIt Site identity and DB/BUCKET binding names. GitHub origin remains the team repository; Sites source synchronization uses its separate short-lived credential through stdin, never Git configuration or files.
Publishing uses the exact pushed source commit and its build archive. Verify private deployment first; public audience changes need the owner's explicit request. Configure hosted runtime secrets separately, deploy their revision, and test distinct staff/attendee accounts before judging.
