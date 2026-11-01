# Adarsh's frontend plan

Status: first frontend checkpoint implemented on frontend/core. Follow AGENTS.md and PLAN.md. Later integration work below remains planned.

## Checkpoint delivered
- Shared header/footer, design tokens, event-help-desk home, and separate lost/found routes using the existing shared form.
- Required-field and calendar-date validation, optional color, found-only private identifying clue, photo MIME/size checks and corrupt-image feedback.
- In-memory photo preview with replacement/removal cleanup and object-URL revocation on unmount.
- Error-summary/review focus, input labels and associated hints/errors, skip link, focus styles, reduced-motion handling, and responsive layouts.
- Review/edit preserves the draft; the review summary does not repeat the private clue. Submission stays disabled and visibly unavailable.
- No API requests, uploads, persistence, sample matches, browser-stored evidence, or fake success state. lib/client/report-draft.ts describes local UI state only, not an API contract.
- Normal anchor navigation deliberately avoids the observed Vinext production next/link prefetch/navigation failure. Do not restore client routing until it is verified against the built Worker.

## Verification for this checkpoint
Passed npm run typecheck, npm run test:frontend (5 tests), and npm run build. Tests cover lost/found requirements, invalid choices/limits, impossible dates/leap days, and file MIME/size limits.
The initial build was blocked by a running preview holding dist open on Windows; after stopping that preview the production build passed. The starter still emits its route-classification/performance notices.
Browser checks against npm start: home-to-form and lost/found navigation, error focus, valid review focus, edit preservation, private-clue validation/exclusion from review, disabled submission, and photo selection/replacement/removal/corrupt-image rejection passed.
Native datetime entry was verified through accessibility controls; the browser automation fill method did not reliably populate datetime-local.
Responsive checks at measured CSS widths 325 and 1200 found no horizontal overflow on home; the form also fit the narrow viewport. Screenshots were inspected.
The source is valid UTF-8; apparent curly-apostrophe/ellipsis encoding issues were not present in the actual file.

## Integration pending
Ayan's shared contract and API routes are not in this checkout or origin/main at review time. No backend files, auth helper, connector infrastructure, README, storage schema, or Site configuration are changed by this checkpoint.
Next: agree on executable report/intake/bootstrap types and examples, replace local form choices with bootstrap values, add authorized submission and field-error mapping, and verify report readback after refresh. Wire shapes and authentication behavior must come from the backend contract.
AI assistance, matching, claim/staff screens, persistence, hosted multi-user access, and deployment remain unimplemented/unverified. No Site registration, deployment, or audience change was performed.

## Ownership
Pages/layout/styles, components, hooks, public assets, browser API client, frontend tests. Also root configuration/lockfile and publishing. Do not implement matching, provider calls, database access or permissions in browser code. Consume Ayan's shared contract after the first checkpoint.

## Design
Modern event help desk: white #FFFFFF, background #F3F6FA, blue #2457D6, text #172238, success #16734A, attention #9A6200. Public Sans with system fallback; bundle if available, no runtime font dependency.
Left-aligned, visible labels, clear focus, restrained borders. Claim ticket and recovery timeline provide the visual identity. Show supporting/conflicting/unknown evidence beside the score.
Screens: home, combined lost/found form, my reports, matches/comparison, claim status, recovery guidance, staff queue/detail. Combine views where practical.

## Sequence
1. 0:00-0:30: shared starter, contract agreement, app shell, consistent controls, preserved Sites sign-in integration, later authorized hosted shell.
2. 0:30-1:30: form/photo preview/validation, API client/errors, top-level sign-in navigation, persistence/readback. Preserve values on failed requests.
3. 1:30-2:30: explicit AI-assist button, editable suggestions, at most one clarification, three candidate cards and actual supporting/conflicting/unknown reasons. Honest empty state.
4. 2:30-3:30: private evidence form, claim ticket/timeline, staff queue and protected comparison, confirmed approve/reject, separate handover action.
5. 3:30-4:15: official-source cards with title/domain/passage/retrieval time; guidance not inventory, explicit unavailable/no-source states.
6. 4:15-5:00: mobile/desktop, keyboard/focus, direct links/reloads, errors/expired identity, remove fixtures from live path, publish integrated candidate when authorized.
7. 5:00-6:00: defect fixes only, second-device URL check, actual screenshots/results and three-minute rehearsal.

## Acceptance
All scores/statuses server-derived. Loading/empty/error/forbidden views work. AI suggestions editable before save. Retries preserve work without duplicates. Public views never fetch staff data. No private evidence in localStorage/logs, no keys in bundles. Refresh and full recovery journey work.

## First next task
From merged foundation create frontend/core. Build shell/form; use agreed contract examples and clearly labelled temporary fixtures only until endpoints exist. Submit PR checkpoint and list missing API behavior. Do not edit backend paths to bypass integration blockers.
