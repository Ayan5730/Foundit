# FoundIt local setup

The original README is preserved. Start here for development.

## Current state
The Sites Vinext starter includes React, TypeScript route support, D1/R2 binding declarations, Drizzle tooling, a ChatGPT sign-in helper, and a placeholder page.
There are no FoundIt API routes, report tables, matching/provider integrations, claim screens, or deployment yet. The schema is empty. No hosted Site ID is fabricated or provisioned.

## Prerequisites
Node.js >=22.13.0 (Node 24 works), npm, and Git. Later publishing also needs tar (Windows tar.exe is supported). Provider keys are not needed for foundation verification.

## Clone and run after the setup PR is merged
```sh
git clone https://github.com/adarshyadav428/Foundit.git
cd Foundit
npm run install:ci
npm run typecheck
npm run build
npm run dev
```
Open the printed local URL (normally http://localhost:5173); stop with Ctrl+C. install:ci performs one locked npm ci. Scripts are checked in: Ayan does not need the Sites plugin to develop locally. Clean clones default to portable mode.

Create frontend/core (Adarsh) or backend/core (Ayan) from updated main. The setup branch is not a feature branch.

## Environment
Both example files contain names with empty values only. For Worker runtime secrets, copy .dev.vars.example to ignored .dev.vars. .env.example is an inventory for dotenv-compatible tooling, not automatic Worker configuration. Avoid duplicating secrets across files.
Do not expose keys with NEXT_PUBLIC_ or VITE_ prefixes. Leave values blank until integrations need them. Hosted secrets are configured separately through Sites during later publication.

## Database and images
.openai/hosting.json declares logical bindings DB and BUCKET. These are not live resource IDs. Miniflare supplies local bindings; Sites provisions hosted resources during publication.
Ayan owns db/schema.ts and drizzle/. Add real tables, run npm run db:generate, inspect and commit SQL/metadata. Do not create demonstration tables simply for setup.
After a build emits dist/server/wrangler.json, apply each actual pending local migration exactly once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/<pending-migration>.sql
```
Replace the filename. Local and hosted data are separate. Do not replay applied migrations or change their history. Hosted publishing applies pending schema migrations; seeding is separate.

Non-mutating local D1 binding check:
```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --command "SELECT 1 AS ok"
```

npm start serves the built Worker locally on loopback with the same local D1/R2 state. It does not deploy.

## Authentication
Keep app/chatgpt-auth.ts and dispatch-owned auth routes intact. Portable npm run dev simulates loopback sign-in at /signin-with-chatgpt?return_to=/ with the single identity local_seedy. This is not hosted account verification or multi-user testing.
npm start does not simulate sign-in; production excludes mock auth. Ayan will authorize server identity and STAFF_USER_IDS. Sign-in alone never grants staff status. Browser code must not invent identity/role headers.

## Team checkpoints
Read AGENTS.md for path ownership.
1. Ayan defines the shared contract/examples and health/bootstrap.
2. Adarsh builds shell/report form against that contract.
3. Both submit one report, refresh, and read it back before expanding scope.

## Verification and publishing handoff
Run npm run typecheck and npm run build. Product tests arrive with features; there is no dummy passing suite.
A GitHub PR is not a Sites deployment. After review, Adarsh registers a Site, saves its returned project_id, configures secrets, and follows the Sites packaging/publication workflow from the reviewed integration commit. Keep GitHub and Sites publishing remotes separate. Never share publishing credentials in Git.
Do not deploy or enable public access for this setup PR. See SITES-STARTER.md for upstream instructions and PLAN.md for agreed future work.
