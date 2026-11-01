# FoundIt API v1 contract

Initial contract checkpoint for frontend/backend coordination. This follows docs/PLAN.md without changing frontend code. Import browser-safe types/runtime schemas from shared/api.ts. Representative typed fixtures are in shared/examples.ts; they are labelled examples, not a live-data fallback.

## Implemented at the first checkpoint
- GET /api/v1/health -> {data:{status:"ok",api_version:"v1"}}. Process availability only, not database/provider readiness.
- GET /api/v1/bootstrap -> shared Bootstrap type. Anonymous user=null, both capabilities false. Authenticated identity comes from Sites; can_review requires an exact configured staff ID. Capabilities describe permission, not provider readiness.
Both responses use Cache-Control:no-store. No backend secrets/provider keys are returned.

## Wire conventions for subsequent routes
Snake_case JSON; ISO8601 timestamps with explicit offset (UTC Z accepted). UI datetime-local must be converted deliberately before posting; it is not accepted as an unzoned timestamp.
Success: {data:T}; errors: {error:{code,message,field_errors?}}. Field errors are arrays keyed by field.
401 sign-in required; 403 forbidden action; 404 missing/inaccessible private record; 409 conflict; 413 body too large; 422 validation; 429 rate limit; 503 unconfigured storage.
PublicReport is an explicit allowlist with no owner, private_clue, evidence, image key or media URL.

## Inputs and outputs
CreateReportSchema is authoritative: client_request_id UUID, kind, title, category, nullable color, description, visible_features array, location, occurred_at, nullable intake_id, nullable private_clue. All fields are explicit; no defaults silently change intent. A found item requires private_clue; a lost item uses null. Unknown properties (including owner_id/status) are rejected.
CreateClaimSchema: client_request_id UUID, lost_report_id UUID, found_report_id UUID, evidence.
ReviewSchema: decision (approved/rejected), nullable private note.
GuidanceRequestSchema: organization="rapid_metro".
Create requests are idempotent per owner and request ID: identical payload returns the original; changed payload with reused ID returns409.
POST /intake uses multipart kind, description, optional photo. It returns an Intake with editable suggestions and per-provider status. No private clue/evidence is sent to AI.
Original media is private: only uploader/staff may retrieve it. Claimant detail includes their evidence/status but never finder reference clue. Staff detail uses a distinct StaffClaim DTO.

## Planned route map (not implemented by the first checkpoint)
POST /intake -> Intake
POST /reports -> PublicReport (201 new,200 replay)
GET /reports/{id} -> PublicReport
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

## Frontend integration handoff
The existing frontend draft has camelCase occurredAt/privateClue. Keep it as UI state; map explicitly to occurred_at/private_clue at submission after contract agreement. Get choices/limits/capabilities from bootstrap. Do not supply owner IDs or emulate role headers.
No contract changes should be implemented silently. Shared schemas, these notes and examples must be updated together when both owners agree.
