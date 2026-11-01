# Release verification and final owner handoff

Owner: Adarsh (integration/publishing), with Ayan responsible for backend/provider configuration and any agreed scoring changes. The completion branch does not change the API contract, matcher weights, database migration, supplied authentication helper or connector infrastructure.

## Checks that require no accounts or provider keys

```sh
npm run typecheck
npm test
npm run evaluate:matching
npm run providers:check
npm run evaluate:providers
npm run build
```

The first evaluation retains the fixed 24-case offline baseline and adds 12 targeted phone diagnostics. The provider commands default to **not_run**, make zero external calls and cannot claim live success. Reports are written under ignored outputs/. GitHub Actions runs typecheck, tests, the offline evaluation and build; it never invokes live providers or uses account cookies.

## Final owner steps, in order

1. Review the help-desk readiness PR and the separate matching-quality PR, including CI results. Ayan reviews the matching rule's precision/recall tradeoff before it is merged. Keep GitHub and Sites publishing separate.
2. Add provider keys/model IDs privately, then run the connection check below. Confirm real photo suggestions, structured text normalization and at least one useful official Exa source. Pin model IDs only after the actual account succeeds.
3. Reconnect the Sites integration, publish this reviewed commit to the existing owner-private Site and confirm deployment status. Preserve .openai/hosting.json; do not create a replacement Site. Confirm hosted DB/BUCKET, pending migrations and runtime secret revision. Local .dev.vars is not hosted configuration.
4. Sign in with separate attendee and staff accounts. Read each Site-specific ID from My account details; configure STAFF_USER_IDS server-side. Test the full workflow and changed-ID denials. Include a physical item hand-in and the staff custody checkbox in the rehearsal. Optional API automation is below. Never use local_seedy as a hosted staff ID.
5. After the private build passes, select the intended demonstration audience. Repeat anonymous/signed-in checks at the final URL from a second device, rehearse the three-minute script in DEMO.md and record a real working backup.
6. Interview an organizer/help-desk operator with permission. Record actual feedback and pilot criteria. Pricing, willingness to pay and operating savings remain hypotheses until measured.

Live credentials and authenticated hosted sessions are not available to the completion run. Sites tool access is also unavailable in this session. These gates must remain pending until actual results exist; no credentials should be pasted into chat.

## Provider connection and usage checks

Use ignored .dev.vars locally, starting from .dev.vars.example. Configure OPENAI_API_KEY/OPENAI_MODEL, CEREBRAS_API_KEY/CEREBRAS_MODEL and EXA_API_KEY. Then:

```sh
npm run providers:check -- --live
npm run evaluate:providers -- --live
```

The connection check makes at most three calls using the existing production adapters: OpenAI sees the bundled fictional bag illustration, Cerebras receives a fictional public description, and Exa receives the fixed official-recovery query. A successful schema/connection check does not establish photo extraction accuracy. No model is silently selected for your account.

The paired evaluation sends only synthetic public item fields to Cerebras, caching repeated input. It uses the same 24 cases and matcher in both arms, preserves identity/event/kind/time/status and applies suggested descriptive fields in the synthetic arm. It makes at most 53 calls, normally fewer because of caching. Failures retain raw fields and are counted; no substitute AI output is invented. This text-only evaluation does not measure OpenAI vision quality. Existing held-out cases have already been inspected and are not a fresh independent benchmark.

JSON reports retain HTTP status, duration and numeric token usage only. Exa cost is recorded only if returned by the provider; other billable costs are not guessed. Keys, prompts, raw provider diagnostics and private evidence are excluded. Review live output before quoting findings in the pitch.

Request formats were checked against the official [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs) and [image input](https://developers.openai.com/api/docs/guides/images-vision), [Cerebras chat completion](https://inference-docs.cerebras.ai/api-reference/chat-completions), and [Exa search](https://exa.ai/docs/reference/search) documentation. Account/model access still requires the live check.

## Optional hosted API verification

Anonymous verification needs only the exact Site origin:

```sh
npm run verify:hosted -- --origin https://YOUR-SITE
```

If the Site is still owner-private, add `--private`. Redirects are never followed; an unexpected sign-in gate is reported instead of being mistaken for an API success.

You can test the two accounts manually in separate browsers. To automate the same checks, put existing **test** session cookies locally in ignored .env.release.local (never in chat, commits, terminal command arguments or screenshots):

```dotenv
FOUNDIT_SITE_ORIGIN=
FOUNDIT_ATTENDEE_COOKIE=
FOUNDIT_STAFF_COOKIE=
```

With those two sessions configured, the default command checks distinct identities/capabilities, nonstaff denial and owner lists without writing records. Add `--workflow` to explicitly create a fresh labelled fictional pair plus a competing claim, upload the bundled fictional illustration and verify:

- Safe public serialization and real matching.
- Cross-user private photo/match/claim denial and nonstaff review/handover denial.
- Stable report/claim retries, staff clue/evidence comparison and invalid transition denial.
- Approval reserves both items, competing approval fails, and rejected claims cannot recover.
- Separate handover recovers both reports, repeat handover is harmless and readback preserves state.

```sh
npm run verify:hosted -- --private --workflow
```

Workflow mode retains its clearly labelled records and never deletes unrelated data. Photo intake can invoke configured providers. The report contains only check names, HTTP codes and durations; it never stores cookies, account IDs, private evidence, images or raw responses. Renew expired test sessions locally and rerun.

For a **local built Worker** only, `--local --origin http://127.0.0.1:4186` checks anonymous access/denials. Local mode refuses the distinct-account workflow and skips hosted identity-header integrity assertions because there is no Sites dispatch. It is not hosted authorization evidence.

Exit codes: 0 for the stated passed scope (including explicitly labelled read-only/local scopes), 1 for a failed check, 2 for a missing prerequisite or gated/partial verification. Read the status and scope, not just the process exit code.
