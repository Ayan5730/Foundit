# Frontend integration checkpoint

Status: merged in PR #4, continuing the existing shell/form. Ayan's shared/api.ts contract is consumed unchanged. RELEASE.md tracks the remaining live/hosted gates and repeatable verification commands.

Two-provider demo update: when an active lost report has no candidate, the browser shows a direct link to Rapid Metro's official lost-and-found page. This path needs no Exa key or live search call. The existing backend guidance endpoint and shared contract are unchanged. OpenAI and Cerebras passed local synthetic connection checks; hosted outputs and real-photo quality remain unverified. Cerebras text normalization showed no matching gain in the paired synthetic evaluation.

## Connected behavior
- Server-generated ChatGPT sign-in/out anchors; bootstrap identity, choices, capabilities and account status. Staff screens are hidden from nonstaff; backend permissions remain authoritative.
- Existing lost/found form now uploads optional private photos, requests explicit editable AI suggestions, maps confirmed fields to the shared schema, submits and reads back actual reports.
- A reporter can explicitly approve a small item preview for signed-in match viewers. The form re-encodes it separately from the private original, shows the sharing choice again before saving, and defaults to private-only. Candidate tabs, report comparisons and the owner's report list show approved previews; otherwise they show labelled category icons. The reporter or staff can hide a shared preview from the report page. The preview is a recognition aid, never ownership proof.
- Event date entry explicitly uses IST independent of browser timezone. Lost reports always send private_clue:null.
- Stable client request IDs survive identical retries within the page. Drafts/evidence remain in memory only; leaving/reloading clears an unsaved draft. No fake success, browser role headers, localStorage or provider keys.
- My reports/recovery requests; real top-three candidates and supporting/conflicting/unknown reasons; private claim submission; claimant ticket/status.
- Protected staff queue, private clue/evidence/photo comparison, explicit approve/reject confirmation and separate confirmed handover. Counts refresh after changes.
- No-match active lost reports display a direct link to the official Rapid Metro lost-and-found page; the browser no longer requests the backend guidance endpoint.
- Request cancellation, bounded timeouts, field errors, retry controls, empty states and sign-in gates. Original photo object URLs are revoked on replacement/removal/unmount.
- The agreed intake endpoint also runs configured providers when a photo is submitted. The upload hint/review explicitly disclose that processing; private ownership clues are excluded and suggestions never overwrite submitted fields. Photo-free manual submission makes no intake/provider call unless assistance was explicitly requested.
- The found-item flow asks the finder to hand the physical item to staff and states that a saved report does not establish custody. Staff approval now requires an explicit physical-custody checkbox in the UI; the backend still enforces staff authorization. The checkbox is not a persisted custody record. The sign-in gate gives honest guidance for someone who lost their sign-in device; assisted online claims are not implemented.

## Verification on 1 November 2026
- At the frontend checkpoint, typecheck, production build, 9 frontend tests and 18 backend tests passed. The current repository has 39 passing tests; see EVALUATION.md.
- Local browser: sign-in, create lost report, reload/readback, actual 91/100 candidate, private claim, staff comparison and private photo, approval/reserved state, separate handover/recovered ticket passed.
- Found form: fictional photo upload, honest AI-unavailable result, retained draft, manual submission, public readback without private clue and genuine no-match state passed.
- The earlier backend-guidance unavailable state passed with credentials absent. For the two-provider update, headless Edge loaded the signed-in fictional no-match keyring in local development and rendered the official Rapid Metro link without an unavailable message; the desktop screenshot was inspected. No sample source cards or synthetic AI responses are substituted.
- Earlier checkpoint verified error/review focus, edit preservation, photo replacement/removal/corrupt-file rejection and keyboard/native datetime controls.
- Development hot reload briefly produced a stale context error while modules were being formatted; full reload restored the provider. Final build/hosted checks determine release behavior.
- Final built Worker: home-to-form navigation and anonymous sign-in gate passed with no captured browser errors. Bootstrap remained anonymous/nonstaff, owner records returned 401, and the recovered report persisted across the development-to-production restart without private fields.
- Integrated workspace at a measured 390 CSS-pixel viewport had no horizontal overflow; screenshot inspected.
- Hosted distinct-account authorization and partner outputs, real-photo quality, second-device testing and recording remain separate release gates; local mock identity and provider connection checks do not establish these.
- The approved-preview path needs a local browser check after migration and a hosted check with separate accounts before it can be demonstrated as complete.
- The local preview migration was applied once. A fictional bag intake used both configured providers, saved an approved preview, and returned the separate JPEG to a signed-in request (200) while denying an anonymous request (401). This verifies the API path, not the rendered browser flow or hosted access.

## Ownership and constraints
Frontend pages/components/styles/client helpers and integration/publishing files only. No backend/shared-contract changes in this integration checkpoint. README.md, app/chatgpt-auth.ts and connector infrastructure remain preserved.
Use ordinary anchors: the initial frontend checkpoint observed a Vinext production prefetch/navigation failure with next/link.

## Design
Preserve the established white/blue event help desk and claim-ticket timeline. Visible labels, skip link, focus styles, reduced motion, error messages, public/private separation and responsive comparison layouts take priority over decorative work.

## Audit fixes - 1 November 2026
Photo submission now stores the image without AI unless the user explicitly requests assistance. Inputs freeze during assistance and edits invalidate suggestions. Staff submits custody_confirmed to the server and cannot approve their own claim. Owner and staff lists provide pagination; partial matching scans show a warning. Structural image checks do not prove full image decoding.
