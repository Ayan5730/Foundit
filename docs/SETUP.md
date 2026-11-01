# FoundIt setup and integration

README.md is preserved. Read AGENTS.md for current ownership and docs/API.md for the agreed contract.

## Current implementation
React/Vinext on Sites, TypeScript API routes, D1 DB, private R2 BUCKET and the supplied ChatGPT identity helpers. The backend and connected recovery frontend are merged in main (PRs #3 and #4).
Reports, private intakes/photos, matching, claims, staff review, reservations, handover, rate limits and guidance cache are implemented. See docs/RELEASE.md for reproducible checks and the final owner handoff; docs/DEMO.md contains the rehearsal script.

## Local setup
Node >=22.13.0 (Node 24 works), npm, Git; publication also needs tar.
```sh
git clone https://github.com/adarshyadav428/Foundit.git
cd Foundit
npm run install:ci
npm run typecheck
npm test
npm run build
```
For an existing checkout, preserve local changes and use its current branch. Do not reinstall when dependencies and lockfile are unchanged.

Apply the initial migration ONCE to a new local database after building:
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_gray_speedball.sql
```
Do not replay applied migrations. Later migrations must retain their history. Local and hosted data are separate; Sites publication applies pending hosted schema migrations. Demo data never belongs in migrations.
The approved item-preview feature adds `drizzle/0001_past_vengeance.sql`. It was applied once to this shared local workspace on 1 November 2026; do not replay it here. Apply it once to any other existing local database before testing previews; publishing must also apply it to hosted D1.
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_past_vengeance.sql
```

Run `npm run dev` and open the printed loopback URL, normally http://127.0.0.1:5173. Stop with Ctrl+C before building on Windows to avoid locked dist files.
`npm start` serves the built Worker locally using the same .wrangler/state; it does not deploy and does not simulate sign-in.

## Runtime configuration names
Examples contain names with empty values only. Use ignored .dev.vars for local Worker secrets, not public prefixes or committed files.
- OPENAI_API_KEY, OPENAI_MODEL
- CEREBRAS_API_KEY, CEREBRAS_MODEL
- STAFF_USER_IDS

Set each model with its key after a connection test confirms account availability. All provider calls are server-side. Blank credentials produce truthful unavailable responses; manual reporting/matching still work.
The two-provider demo uses OpenAI and Cerebras. Both passed local synthetic connection checks; the paired Cerebras evaluation found no matching improvement. Its no-match screen links directly to the official Rapid Metro lost-and-found page without a search API. The backend Exa endpoint remains available, but the demo UI and release checks do not invoke it.
DB and BUCKET are platform bindings, not string secrets. .env.example is an inventory; it does not automatically configure Worker runtime.

Development simulates ONE loopback user, local_seedy. For an isolated local staff rehearsal, temporarily set STAFF_USER_IDS to that development ID in ignored .dev.vars. Remove that fixture afterward; never configure it on the hosted Site. Other local configuration must be preserved.
Hosted staff access requires exact Site-specific IDs from authenticated bootstrap/My account details. Account UUIDs from unrelated tools are not interchangeable with those IDs. Sign-in alone grants no staff role.

## Reproducible verification
```sh
npm run typecheck
npm test
npm run evaluate:matching
npm run build
```
Matching evaluation is offline, synthetic and read-only; it neither seeds data nor calls providers. See docs/EVALUATION.md.
GitHub Actions repeats typecheck, tests, the fixed offline evaluation and production build for PRs and main pushes. CI never receives provider keys or test-session cookies.
`npm run providers:check` and `npm run evaluate:providers` make no external calls by default. Add `-- --live` only after setting local provider configuration. Generated reports stay in ignored outputs/. See RELEASE.md for live and hosted modes.
The existing tests/backend/smoke-local.ts runner creates labelled fictional records on loopback only and never clears unrelated records. Follow docs/BACKEND.md for its required port/settings. Do not aim it at production.

## Team and publication
Adarsh now handles backend, frontend, root configuration, integration and publication. Use focused PRs and review before merging; preserve the existing API contract and privacy boundaries.
.openai/hosting.json persists the one registered FoundIt Site identity and DB/BUCKET binding names. GitHub origin remains the team repository; Sites source synchronization uses its separate short-lived credential through stdin, never Git configuration or files.
Publishing uses the exact pushed source commit and its build archive. Verify private deployment first; public audience changes need the owner's explicit request. Configure hosted runtime secrets separately, deploy their revision, and test distinct staff/attendee accounts before judging.

## Additive audit migration
After the initial and approved-preview migrations, apply `drizzle/0002_audit_query_indexes.sql` once to existing local databases using the same local D1 execute command and persistence directory, replacing the --file argument. Do not replay already-applied migrations. Sites publication must apply the new pending migration separately. It adds query indexes and does not delete data.

## Netlify deployment
The `deploy/netlify-20261101` branch adds a second hosting target, owned by Adarsh. The original `npm run build` remains Sites/Vinext with D1/R2 and its supplied identity helpers. `npm run build:netlify` builds Next.js for Netlify, with verified Netlify Identity sessions, PostgreSQL via `@netlify/database`, and private Netlify Blobs. The Netlify build replaces only the server runtime import; it never trusts caller-supplied Sites identity headers.

Netlify project: `foundit-recovery-desk`. The checkout-local `.netlify/` directory is ignored. Enable Identity in the project dashboard, leave email confirmation enabled, and configure the available sign-in providers there. The `/account` page supports email registration, sign-in, confirmation callbacks, password recovery and sign-out; enabled OAuth providers are discovered from Identity settings.

The fresh PostgreSQL schema is in `netlify/database/migrations/20261101100000_foundit.sql`; Netlify applies it during deployment. Existing Sites data is not copied. The adapter keeps parameter binding, transactional state changes and serializable batch retries, and a partial unique index prevents concurrent duplicate active claims. Production photo storage persists across deployments. Preview photo stores are isolated by deploy ID and do not access production photos.

Set `STAFF_USER_IDS` to the comma-separated Netlify Identity user IDs of trusted reviewers, using Netlify environment variables with Functions scope; redeploy after changes. Account IDs from the Netlify dashboard or ChatGPT are not substitutes. Optional `OPENAI_API_KEY`, `OPENAI_MODEL`, `CEREBRAS_API_KEY`, `CEREBRAS_MODEL` and `EXA_API_KEY` also belong in hosted environment variables, never in the repository. Without provider credentials, manual reports and matching remain available and assistance reports its unavailability.

Verify with `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` and `npm run build:netlify`. Deploy a draft with `netlify deploy --context deploy-preview`, verify it, then publish with `netlify deploy --prod`. Identity needs a real hosted deployment; local development does not provide Netlify Identity sign-in.
