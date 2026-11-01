# FoundIt API v1 contract

Contract agreed in chat after first checkpoint e37805c. All routes below are implemented. OpenAI and Cerebras passed local synthetic connection checks; hosted provider behavior and identity remain unverified. Import browser-safe types/runtime schemas from shared/api.ts. Representative typed fixtures are in shared/examples.ts; they are labelled examples, not a live-data fallback.

## Implemented at the first checkpoint
- GET /api/v1/health -> {data:{status:"ok",api_version:"v1"}}. Process availability only, not database/provider readiness.
- GET /api/v1/bootstrap -> shared Bootstrap type. Anonymous user=null, both capabilities false. Authenticated identity comes from Sites; can_review requires an exact configured staff ID. Capabilities describe permission, not provider readiness.
Both responses use Cache-Control:no-store. No backend secrets/provider keys are returned.

## Wire conventions for subsequent routes
Snake_case JSON; ISO8601 timestamps with explicit offset (UTC Z accepted). UI datetime-local must be converted deliberately before posting; it is not accepted as an unzoned timestamp.
Success: {data:T}; errors: {error:{code,message,field_errors?}}. Field errors are arrays keyed by field.
401 sign-in required; 403 forbidden action; 404 missing/inaccessible private record; 409 conflict; 413 body too large; 422 validation; 429 rate limit; 503 unconfigured storage.
PublicReport is an explicit allowlist with no owner, private_clue, evidence, image key or original-media URL. `has_shared_preview` only signals that the reporter approved a separate item preview; it never identifies a private R2 object.

## Inputs and outputs
CreateReportSchema is authoritative: client_request_id UUID, kind, title, category, nullable color, description, visible_features array, location, occurred_at, nullable intake_id, nullable private_clue. All fields are explicit; no defaults silently change intent. A found item requires private_clue; a lost item uses null. Unknown properties (including owner_id/status) are rejected.
CreateClaimSchema: client_request_id UUID, lost_report_id UUID, found_report_id UUID, evidence.
ReviewSchema: decision (approved/rejected), nullable private note.
GuidanceRequestSchema: organization="rapid_metro".
Create requests are idempotent per owner and request ID: identical payload returns the original; changed payload with reused ID returns409.
POST /intake uses multipart kind, description, optional photo and optional `shared_preview` JPEG file. The latter requires a photo and explicit reporter consent in the UI. It returns an Intake with editable suggestions and per-provider status. No private clue/evidence is sent to AI.
Original media is private: only uploader/staff may retrieve it. A separate, smaller item preview is available only to signed-in users while the report is not recovered; the reporter or staff can hide it. Claimant detail includes their evidence/status but never finder reference clue. Staff detail uses a distinct StaffClaim DTO.

## Implemented route map (added after the first checkpoint)
POST /intake -> Intake
POST /reports -> PublicReport (201 new,200 replay)
GET /reports/{id} -> PublicReport
GET /reports/{id}/preview -> approved item preview bytes (signed-in; 404 when absent or recovered)
POST /reports/{id}/preview/hide -> PublicReport with preview hidden (reporter or staff; empty JSON body)
GET /me/reports -> PublicReport[]
GET /reports/{id}/matches -> Matches (owner/staff)
POST /claims -> Claim (201 new,200 replay)
GET /me/claims -> ClaimSummary[]
GET /claims/{id} -> Claim (claimant only)
GET /staff/claims -> {claims:ClaimSummary[],counts:Record<ClaimStatus,number>}
GET /staff/claims/{id} -> StaffClaim
POST /staff/claims/{id}/review -> Claim
POST /staff/claims/{id}/handover -> Claim
GET /media/{id} -> private image bytes (uploader/staff)
POST /recovery-guidance -> Guidance

Approval reserves both reports; only confirmed handover marks recovered. Reports/claims are not proof of identity. Match score is a heuristic ranking signal.
Within Electronics, a candidate with a clearly different item type in each title is excluded before scoring. When either title is generic or names multiple types, the existing score applies. This does not establish ownership or overall matching accuracy.

Handover accepts an empty JSON object {}. Review accepts {decision:"approved"|"rejected",note:string|null}. Repeating an identical review/handover returns the existing state; an incompatible transition returns409. Concurrent approval conflicts also return409. Approval does not automatically reject other pending claims.
Owner lists and staff queue return at most 100 newest entries; matching considers up to 500 newest active same-event/category candidates and returns top 3. Public report GET remains anonymous-safe. Staff claim detail has its own endpoint; GET /claims/{id} is claimant-only.
Intake accepts kind and description, with optional photo; an empty description is permitted only with a photo. It rejects private_clue/evidence fields. Intake IDs also identify private media when media_id is non-null; attach intake_id to a confirmed report. The shared preview must be a separate JPG no larger than 512 KB; the browser re-encodes it at up to 720 pixels on its longest edge. Uploads use byte-signature/MIME and size checks, not a full image decoder or content moderation. The reporter must inspect visible pixels and exclude faces, documents, serial labels and hidden ownership clues. Invalid images should still be handled by the frontend.
Assistance endpoints share a persisted 10/minute/user limit and 8-second timeout per provider call. Failed/missing AI returns unavailable status and empty/partial editable suggestions. Manual report creation never requires a provider.
Guidance returns only HTTPS new.delhimetrorail.com source passages, with original source links and retrieval time. Available results are cached for one hour; unavailable/no_sources are not invented matches.
POST requests reject cross-origin Origin/Sec-Fetch-Site values. All responses and image reads are no-store. Request sizes are bounded. Payloads and provider errors are not logged or echoed by handlers.

## Frontend integration handoff
The existing frontend draft has camelCase occurredAt/privateClue. Keep it as UI state; map explicitly to occurred_at/private_clue at submission after contract agreement. Get choices/limits/capabilities from bootstrap. Do not supply owner IDs or emulate role headers.
No contract changes should be implemented silently. Shared schemas, these notes and examples must be updated together when both owners agree.
