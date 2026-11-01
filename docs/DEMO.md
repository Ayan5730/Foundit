# FoundIt demonstration and completion checklist

## Progress against the agreed plan
| Outcome | Evidence/current state |
|---|---|
| Shared foundation and contract | Merged; typed schemas/examples and health/bootstrap exist |
| Backend recovery workflow | 16 API method/path combinations; privacy, state-transition and provider tests passing locally |
| Connected frontend | Merged in PR #4; real forms, matching, tickets, staff actions and a direct official guidance link |
| Local persistence and recovery | Browser report readback after reload; approval reserves; handover recovers |
| Partner integrations | OpenAI/Cerebras passed the owner's local synthetic connection check. Cerebras completed 18/18 calls after the Qwen reliability fix; hosted calls and real-photo quality still need verification. The two-provider demo does not use Exa |
| Labelled evaluation | 24 offline synthetic scenarios and paired Cerebras text evaluation; no measured matching gain, with more false candidate suggestions when AI output was applied automatically. See EVALUATION.md |
| Hosted candidate | Registered owner-private Site; publication result must be verified separately |
| Distinct users and recording | Pending hosted verification and rehearsal |
| Customer/business validation | No organizer interview or willingness-to-pay evidence supplied |

Follow RELEASE.md for the remaining owner steps and exact commands. The local provider calls succeeded; this is not evidence that hosted secrets, photo quality or attendee workflows are ready.

## Current ownership
Adarsh is handling frontend, backend, integration and publishing. Keep server permissions and private data checks on the backend; do not make browser workarounds or fake provider availability.

## Rehearsal preparation
1. Verify checks in SETUP.md and deploy the exact integration commit privately.
2. Configure server-only OpenAI and Cerebras secrets/model IDs through supported key/runtime tools; never chat, commit or expose them in browser variables.
3. Sign in on the hosted Site. Read each person's own Site ID through My account details, then configure the authorized staff allowlist. Do not reuse local_seedy.
4. Use separate staff/finder and attendee sessions. Prove attendee staff denial and changed-ID evidence/image denial, not just hidden buttons.
5. Create fresh FICTIONAL DEMO reports through the UI. Do not clear unrelated records or populate migrations. Previously recovered reports will not match again; use new reports for each rehearsal.
6. Example pair: found navy canvas laptop bag, silver zipper, Main Hall, 10:30 IST; lost dark blue backpack with silver zip, same area, 10:15 IST. Finder records a fictional triangle inside the pocket privately; claimant supplies it privately only after viewing the public candidate. Use an item-only fictional photo without people/documents.
7. Prepare one unrelated missing keyring as a no-match case. Open the official Rapid Metro lost-and-found link shown in the app. Explain that FoundIt does not search the operator's inventory.
8. Measure live request duration and returned provider usage without recording secrets/private payloads. Do not infer billable cost from local matcher timing.
9. After checking the private build, ask the owner to choose the public demonstration audience. Test the exact final URL on a second device.
10. Record a real successful hosted run as backup. A local mock-account recording must be labelled local and is not hosted authorization evidence.

## Three-minute script
0:00–0:40: “At busy events, descriptions differ and similar items can be handed to the wrong person.” Finder uploads item-only photo, explicitly requests suggestions, checks/edits them and saves.
0:40–1:10: Attendee submits differently worded loss. Open actual candidate, score and evidence; explain a similarity score is not proof.
1:10–2:15: Submit private detail. Switch to staff account; compare the earlier finder clue and claimant evidence. Approve: reserved. Confirm physical collection separately: recovered.
2:15–2:40: Show the no-match report and its direct link to Rapid Metro's official lost-and-found page.
2:40–3:00: State measured synthetic results and the organizer-paid event-package hypothesis; attendees use it free. Name the current verification gaps.

## Judge questions and defensible answers
- Why two APIs? OpenAI suggests visible image attributes; Cerebras offers optional, editable public-description help and one clarification. Both passed local synthetic connection checks. The paired text evaluation did not improve matching and increased false candidate suggestions when suggestions were automatically applied, so do not claim a retrieval gain. Rapid Metro already publishes its lost-and-found procedure, so this one-operator demo links to the official page directly.
- Why is this safer than a group chat? Public details support discovery; an earlier private clue and staff review support ownership checks. Neither AI nor a score approves ownership.
- Accuracy? 12/13 positive synthetic queries appeared in the top three; 3/11 negative queries still produced candidates. Small artificial evaluation, not real recovery accuracy.
- What fails offline? Existing-record workflow works locally; live provider services need connectivity. Manual description remains possible during provider outages.
- Who pays? Proposed organizer event package; no validated price or willingness to pay yet.
- What is the differentiation? Event-scoped discovery joined to private verification, reservations and confirmed handover, with an inspectable source-backed next step when no inventory match exists.
- What still needs validation? Real organizer workflow, larger inventory, photo/suggestion quality, provider cost and hosted multi-account boundaries.

## Business work requiring people
With permission, interview at least one event organizer/help-desk operator. Ask how reports arrive, how long comparisons/reunions take, how wrong claims are handled, staffing burden and whether they would pilot this.
Record date, role, exact consented feedback, current process and pilot criteria. Do not invent quotations, customers, recoveries or savings.
Propose a free limited pilot followed by an organizer-paid package; validate buyer, procurement, expected event size and a price range in interviews before putting numbers in the pitch.

## Phone and help-desk procedure
1. Finder hands the physical item to authorized desk staff. The found report describes where it was discovered; it does not record a storage shelf or prove that the desk received it. Staff keep their own custody log until the product records this directly.
2. Staff record a private distinguishing clue before a claim and keep the item secure. At approval, staff check both the claimant's private evidence and that the physical item is actually at the desk. The new approval checkbox is an operator prompt, not a stored custody record or a substitute for the API's staff permission check.
3. If the owner lost the device used to sign in, suggest another trusted device. Someone unable to sign in can visit the desk, but the current online claim flow still needs the owner's account. Do not claim that an assisted digital claim exists.
4. At collection, staff perform an appropriate physical ownership check and confirm handover separately. Never ask anyone to disclose a password, passcode, or one-time code.

## Pilot evidence worksheet
Before an event, ask the operator to estimate or retrieve its prior lost-property volume, staff effort, and confirmed returns. During the pilot, log every item physically received, every lost inquiry, time spent searching, candidate suggestions, claims, and actual handovers. Count items received at the desk as the denominator for returns; a candidate suggestion is not a recovery.

| Measure | Prior process | FoundIt pilot | Evidence source |
|---|---|---|---|
| Items physically received | To collect | To collect | Desk custody log |
| Lost inquiries | To collect | To collect | Operator records |
| Staff minutes per inquiry | To measure | To measure | Timed sample |
| Confirmed returns / items received | To calculate | To calculate | Desk log and handover records |
| Irrelevant suggestions / searches | Not applicable | To count | Review of labelled pilot queries |
| Mistaken or disputed handovers | To ask | To count | Operator incident log |

Ask who owns the budget, what they currently spend on staffing and lost-property handling, and what result would justify a paid event package. Record the operator's actual words only with permission. A single small pilot can show feasibility, but it cannot establish market size or real-world model accuracy.
