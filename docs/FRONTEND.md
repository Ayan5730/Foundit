# Adarsh's frontend plan

Status: future work. Follow AGENTS.md and PLAN.md; this foundation contains a placeholder only.

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
