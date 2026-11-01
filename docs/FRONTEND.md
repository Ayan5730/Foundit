# Frontend integration checkpoint

Status: implemented on integration/complete-demo, continuing the merged shell/form rather than replacing it. Ayan's shared/api.ts contract is consumed unchanged.

## Connected behavior
- Server-generated ChatGPT sign-in/out anchors; bootstrap identity, choices, capabilities and account status. Staff screens are hidden from nonstaff; backend permissions remain authoritative.
- Existing lost/found form now uploads optional private photos, requests explicit editable AI suggestions, maps confirmed fields to the shared schema, submits and reads back actual reports.
- Event date entry explicitly uses IST independent of browser timezone. Lost reports always send private_clue:null.
- Stable client request IDs survive identical retries within the page. Drafts/evidence remain in memory only; leaving/reloading clears an unsaved draft. No fake success, browser role headers, localStorage or provider keys.
- My reports/recovery requests; real top-three candidates and supporting/conflicting/unknown reasons; private claim submission; claimant ticket/status.
- Protected staff queue, private clue/evidence/photo comparison, explicit approve/reject confirmation and separate confirmed handover. Counts refresh after changes.
- No-match lost reports can explicitly request official recovery guidance. Available, no_sources and unavailable states use the backend response.
- Request cancellation, bounded timeouts, field errors, retry controls, empty states and sign-in gates. Original photo object URLs are revoked on replacement/removal/unmount.
- The agreed intake endpoint also runs configured providers when a photo is submitted. The upload hint/review explicitly disclose that processing; private ownership clues are excluded and suggestions never overwrite submitted fields. Photo-free manual submission makes no intake/provider call unless assistance was explicitly requested.

## Verification on 1 November 2026
- Typecheck, production build, 9 frontend tests and 18 backend tests passed before final publication checks.
- Local browser: sign-in, create lost report, reload/readback, actual 91/100 candidate, private claim, staff comparison and private photo, approval/reserved state, separate handover/recovered ticket passed.
- Found form: fictional photo upload, honest AI-unavailable result, retained draft, manual submission, public readback without private clue and genuine no-match state passed.
- Guidance-unavailable state passed with credentials absent. No sample source cards or synthetic AI responses are substituted.
- Earlier checkpoint verified error/review focus, edit preservation, photo replacement/removal/corrupt-file rejection and keyboard/native datetime controls.
- Development hot reload briefly produced a stale context error while modules were being formatted; full reload restored the provider. Final build/hosted checks determine release behavior.
- Final built Worker: home-to-form navigation and anonymous sign-in gate passed with no captured browser errors. Bootstrap remained anonymous/nonstaff, owner records returned 401, and the recovered report persisted across the development-to-production restart without private fields.
- Integrated workspace at a measured 390 CSS-pixel viewport had no horizontal overflow; screenshot inspected.
- Hosted distinct-account authorization, live partner outputs, second-device testing and recording remain separate release gates; local mock identity does not establish these.

## Ownership and constraints
Frontend pages/components/styles/client helpers and integration/publishing files only. No backend/shared-contract changes in this integration checkpoint. README.md, app/chatgpt-auth.ts and connector infrastructure remain preserved.
Use ordinary anchors: the initial frontend checkpoint observed a Vinext production prefetch/navigation failure with next/link.

## Design
Preserve the established white/blue event help desk and claim-ticket timeline. Visible labels, skip link, focus styles, reduced motion, error messages, public/private separation and responsive comparison layouts take priority over decorative work.
