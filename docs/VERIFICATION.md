# Foundation verification (historical checkpoint)

Verified locally on Windows with Node 24.16.0 and npm 11.13.0.

- Locked dependency installation: completed (682 packages).
- npm run typecheck: passed.
- npm run build: passed; emitted client and Worker output.
- npm start -- --port 4183: started on loopback and recognized local DB and BUCKET bindings.
- GET /: HTTP 200; FoundIt title, placeholder, and explicit unimplemented-feature text present.
- Referenced JavaScript asset: HTTP 200.
- Local D1 SELECT 1 AS ok: returned ok=1.
- Original README.md: unchanged against the initial commit.
- Environment examples: empty values only; local secrets/build/runtime state excluded by .gitignore.

The upstream build reports its route-classification limitation ("Unknown" for /); the production HTTP smoke check above passed. Installation also emitted deprecation notices for upstream @esbuild-kit packages.

No product test suite exists yet. No AI calls, hosted sign-in, staff authorization, original-image access, or recovery workflow was tested because these features are not implemented. R2 binding presence was verified; application upload behavior was not. The preview was opened in Codex; visual browser QA was not performed.

No Site was registered or deployed and no hosted migrations were applied. This is a source-foundation PR, not a working product demo.

## Completion verification — 1 November 2026

The historical foundation limits above describe the setup PR, not the later merged application. PR #4 merged the connected recovery UI. The completion branch adds release checks and CI without changing the agreed matcher, API contract, migration, authentication helper or connector infrastructure.

- Node 24.16.0; locked dependency installation completed in this workspace.
- npm run typecheck: passed after correcting a test-only unknown JSON type.
- npm test: 32 passed (18 existing backend, 5 release-tool, 9 frontend).
- ESLint on the six touched/new TypeScript script/test files: passed.
- npm run build: passed; client/Worker output emitted. Existing Vinext unknown-route classification and plugin timing notices remain.
- Local database was confirmed empty before applying the initial migration once. No hosted database or migration was touched.
- Actual local D1/R2 HTTP smoke: development sign-in, report create/readback/replay, real 99/100 match, private upload/read, private claim, nonstaff review denial and anonymous media denial passed.
- With only the single development identity temporarily staff-allowlisted, actual HTTP private comparison, early-handover denial, approval/reservation, separate recovery and harmless repeat handover passed. A Keys report produced a genuine empty match list; guidance returned unavailable with no credentials. The temporary .dev.vars fixture was removed after verification.
- Built Worker on loopback: seven page/direct-link HTTP responses returned 200, recovered report state survived the development-to-production restart, public serialization omitted private fields, anonymous bootstrap stayed nonstaff, owner APIs returned 401 and the sign-in route issued no local mock identity cookie.
- The new checker also passed its explicit local anonymous-only mode against that built Worker. Tests exercise the complete hosted workflow runner with isolated SQL/R2 test actors; this is not a hosted account test.
- Provider configuration check correctly reported all three integrations missing and made zero requests. The paired evaluation's default mode made zero calls, retained the fixed 12/13 positive and 3/11 negative-suggestion baseline, and reported no normalized result.

Current run limits: browser control of Comet was denied, so no new visual/hydration/keyboard QA or recording was completed. Prior browser evidence remains in FRONTEND.md. Live provider credentials, authenticated hosted sessions and Sites publishing tools were unavailable. Hosted deployment status, distinct-account isolation, live source quality and provider latency/cost remain unverified. See RELEASE.md for the final owner steps. GitHub CI results must be read separately after pushing; local results do not imply remote CI passed.
