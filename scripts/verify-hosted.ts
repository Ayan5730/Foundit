import type { Bootstrap, Claim, CreateReport, Intake, Matches, PublicReport, StaffClaim } from "../shared/api.ts";
import { readFile } from "node:fs/promises";
import { isMain, saveReport } from "./provider-tools.ts";

type Sessions = { attendee?: string; staff?: string };
type Options = { local?: boolean; workflow?: boolean; private?: boolean };
type HttpFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function siteOrigin(value: string, local = false): string {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (local ? !loopback || url.protocol !== "http:" : loopback || url.protocol !== "https:")) {
    throw new Error("Use a bare HTTPS Site origin, or --local with loopback HTTP.");
  }
  return url.origin;
}

const publicFields = ["id", "event_id", "kind", "title", "category", "color", "description", "visible_features", "location", "occurred_at", "status", "created_at", "has_shared_preview"].sort();
function ensure(value: unknown, check: string): asserts value {
  if (!value) throw new Error(check);
}
function publicOnly(value: PublicReport) {
  ensure(JSON.stringify(Object.keys(value).sort()) === JSON.stringify(publicFields), "public_report_field_allowlist");
}
function recordId(value: string): string {
  ensure(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value), "valid_record_id");
  return value;
}

export async function verifyHosted(value: string, sessions: Sessions = {}, options: Options = {}, upstream: HttpFetch = fetch) {
  const origin = siteOrigin(value, options.local);
  ensure(!(options.local && options.workflow), "local_mock_is_not_a_distinct_account_workflow");
  const checks: string[] = [];
  let current = "service_connection";
  const requests: { check: string; status: number; duration_ms: number }[] = [];
  async function request(path: string, cookie?: string, body?: unknown, extraHeaders: Record<string, string> = {}) {
    const url = new URL("/api/v1/" + path, origin);
    ensure(url.origin === origin, "same_origin_requests_only");
    const start = performance.now();
    const multipart = body instanceof FormData;
    const response = await upstream(url.href, {
      method: body === undefined ? "GET" : "POST", redirect: "manual",
      headers: { ...extraHeaders, ...(cookie ? { Cookie: cookie } : {}),
        ...(body !== undefined && !multipart ? { "Content-Type": "application/json", Origin: origin } : {}) },
      body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    requests.push({ check: current, status: response.status, duration_ms: Math.round(performance.now() - start) });
    return response;
  }
  async function data<T>(path: string, cookie?: string, body?: unknown, expected = 200): Promise<T> {
    const response = await request(path, cookie, body);
    ensure(response.status === expected, current + "_http_status");
    ensure(response.headers.get("Cache-Control")?.includes("no-store"), current + "_no_store");
    const result = await response.json() as { data?: T };
    ensure(result && typeof result === "object" && "data" in result, current + "_envelope");
    return result.data as T;
  }
  async function denied(path: string, cookie?: string, body?: unknown, status = 401) {
    const response = await request(path, cookie, body);
    ensure(response.status === status, current + "_http_status");
    ensure(response.headers.get("Cache-Control")?.includes("no-store"), current + "_no_store");
    await response.body?.cancel();
  }
  const result = (status: string, failed_check?: string) => ({
    checked_at: new Date().toISOString(), scope: options.local ? "local_built_worker_only" : "hosted_site",
    origin, status, checks, requests, ...(failed_check ? { failed_check } : {}),
    limits: "Cookies, account IDs, evidence, photos and raw responses are never written to this report. Workflow mode creates labelled fictional records and confirms a fictional handover; it does not delete records. A private gate check must be repeated after any audience change.",
  });
  try {
    current = "anonymous_health";
    const health = await request("health");
    const gated = [301, 302, 303, 307, 308, 401, 403].includes(health.status);
    if (gated && !options.private) return result("blocked_site_requires_sign_in");
    if (options.private) {
      ensure(gated, "private_site_anonymous_gate");
      checks.push("private_site_anonymous_gate");
    } else {
      ensure(health.status === 200, "health_http_status");
      ensure(health.headers.get("Cache-Control")?.includes("no-store"), "health_no_store");
      ensure((await health.json() as { data?: { status?: string } }).data?.status === "ok", "health_response");
      current = "anonymous_bootstrap";
      const anonymous = await data<Bootstrap>("bootstrap");
      ensure(!anonymous.user && !anonymous.capabilities.can_report && !anonymous.capabilities.can_review, current);
      for (const path of ["me/reports", "me/claims", "staff/claims", "claims/00000000-0000-4000-8000-000000000000", "media/00000000-0000-4000-8000-000000000000"]) {
        current = "anonymous_denied_" + path.split("/")[0];
        await denied(path);
      }
      if (!options.local) {
        current = "browser_supplied_identity_headers_ignored";
        const response = await request("bootstrap", undefined, undefined, {
          "oai-authenticated-user-id": "fictional-spoofed-user", "oai-authenticated-user-email": "fictional@example.invalid",
        });
        ensure(response.status === 200, current);
        const body = await response.json() as { data: Bootstrap };
        ensure(!body.data.user && !body.data.capabilities.can_review && !body.data.capabilities.can_report, current);
        checks.push(current);
      }
      checks.push("anonymous_availability_and_private_endpoint_denials");
    }
    if (options.local) return result("passed_local_anonymous_checks");
    if (!sessions.attendee || !sessions.staff) return result("partial_missing_attendee_and_staff_sessions");
    current = "distinct_account_capabilities";
    const attendee = await data<Bootstrap>("bootstrap", sessions.attendee);
    const staff = await data<Bootstrap>("bootstrap", sessions.staff);
    ensure(attendee.user && staff.user && attendee.user.id !== staff.user.id, current);
    ensure(attendee.capabilities.can_report && !attendee.capabilities.can_review && staff.capabilities.can_review, current);
    await denied("staff/claims", sessions.attendee, undefined, 403);
    await data("staff/claims", sessions.staff);
    checks.push(current);
    current = "owner_lists";
    (await data<PublicReport[]>("me/reports", sessions.attendee)).forEach(publicOnly);
    await data("me/claims", sessions.attendee);
    checks.push(current);
    if (!options.workflow) return result("passed_read_only_checks_workflow_not_run");

    const run = crypto.randomUUID().slice(0, 8);
    const clue = "FICTIONAL DEMO: triangle inside pocket " + run;
    const photo = await readFile(new URL("./fixtures/fictional-bag.png", import.meta.url));
    const form = new FormData();
    form.set("kind", "found"); form.set("description", "FICTIONAL DEMO blue canvas backpack");
    form.set("photo", new File([photo], "fictional-bag.png", { type: "image/png" }));
    current = "private_photo_upload";
    const intake = await data<Intake>("intake", sessions.staff, form, 201);
    ensure(intake.media_id, current);
    const common = { title: "FICTIONAL DEMO " + run + " blue bag", category: "Bags" as const, color: "navy",
      description: "FICTIONAL DEMO canvas backpack with silver zipper " + run,
      visible_features: ["canvas", "silver zipper", run], location: "Main Hall" as const,
      occurred_at: new Date().toISOString() };
    const lostInput: CreateReport = { ...common, kind: "lost", intake_id: null, private_clue: null, client_request_id: crypto.randomUUID() };
    const foundInput: CreateReport = { ...common, kind: "found", intake_id: intake.id, private_clue: clue, client_request_id: crypto.randomUUID() };
    current = "report_creation_and_replay";
    const found = await data<PublicReport>("reports", sessions.staff, foundInput, 201);
    const lost = await data<PublicReport>("reports", sessions.attendee, lostInput, 201);
    ensure((await data<PublicReport>("reports", sessions.attendee, lostInput)).id === lost.id, current);
    const lostId = recordId(lost.id), foundId = recordId(found.id), mediaId = recordId(intake.media_id);
    for (const id of [lostId, foundId]) publicOnly(await data<PublicReport>("reports/" + id, sessions.attendee));
    checks.push(current);
    current = "cross_user_private_media_and_matching_denied";
    await denied("media/" + mediaId, sessions.attendee, undefined, 404);
    // A normal owner cannot read another user's private matches. Staff may.
    await denied("reports/" + foundId + "/matches", sessions.attendee, undefined, 404);
    const media = await request("media/" + mediaId, sessions.staff);
    ensure(media.status === 200 && media.headers.get("Cache-Control")?.includes("no-store"), current);
    await media.body?.cancel();
    checks.push(current);
    current = "real_matching";
    const matches = await data<Matches>("reports/" + lostId + "/matches", sessions.attendee);
    ensure(matches.candidates.some(match => match.candidate.id === foundId), current);
    matches.candidates.forEach(match => publicOnly(match.candidate));
    ensure(!JSON.stringify(matches).includes(clue), "private_clue_excluded_from_matches");
    checks.push(current);
    current = "private_claim_and_permissions";
    const claimInput = { client_request_id: crypto.randomUUID(), lost_report_id: lostId, found_report_id: foundId, evidence: clue };
    const claim = await data<Claim>("claims", sessions.attendee, claimInput, 201);
    const claimId = recordId(claim.id);
    ensure((await data<Claim>("claims", sessions.attendee, claimInput)).id === claimId, "claim_replay");
    await denied("claims/" + claimId, sessions.staff, undefined, 404);
    const claimantView = await data<Claim>("claims/" + claimId, sessions.attendee);
    ensure(!("private_clue" in claimantView), "finder_clue_excluded_from_claimant_view");
    await denied("staff/claims/" + claimId + "/review", sessions.attendee, { decision: "approved", note: null, custody_confirmed: true }, 403);
    await denied("staff/claims/" + claimId + "/handover", sessions.attendee, {}, 403);
    const detail = await data<StaffClaim>("staff/claims/" + claimId, sessions.staff);
    ensure(detail.private_clue === clue && detail.evidence === clue, current);
    await denied("staff/claims/" + claimId + "/handover", sessions.staff, {}, 409);
    const otherLost = await data<PublicReport>("reports", sessions.attendee, { ...lostInput, client_request_id: crypto.randomUUID() }, 201);
    const competing = await data<Claim>("claims", sessions.attendee, { ...claimInput,
      client_request_id: crypto.randomUUID(), lost_report_id: recordId(otherLost.id) }, 201);
    const competingId = recordId(competing.id);
    checks.push(current);
    current = "approval_reserves_without_recovery";
    const approved = await data<Claim>("staff/claims/" + claimId + "/review", sessions.staff, { decision: "approved", note: "FICTIONAL DEMO verification", custody_confirmed: true });
    ensure(approved.status === "approved", current);
    for (const id of [lostId, foundId]) ensure((await data<PublicReport>("reports/" + id, sessions.attendee)).status === "reserved", current);
    checks.push(current);
    current = "competing_approval_denied_and_rejection_final";
    await denied("staff/claims/" + competingId + "/review", sessions.staff, { decision: "approved", note: null, custody_confirmed: true }, 409);
    ensure((await data<Claim>("staff/claims/" + competingId + "/review", sessions.staff, { decision: "rejected", note: "FICTIONAL DEMO competing request" })).status === "rejected", current);
    await denied("staff/claims/" + competingId + "/handover", sessions.staff, {}, 409);
    checks.push(current);
    current = "separate_idempotent_handover";
    for (let attempt = 0; attempt < 2; attempt++) ensure((await data<Claim>("staff/claims/" + claimId + "/handover", sessions.staff, {})).status === "recovered", current);
    for (const id of [lostId, foundId]) ensure((await data<PublicReport>("reports/" + id, sessions.attendee)).status === "recovered", current);
    ensure((await data<Claim>("claims/" + claimId, sessions.attendee)).status === "recovered", current);
    checks.push(current);
    return result("passed_hosted_recovery_workflow");
  } catch {
    // Do not serialize raw errors: they can include cookies, IDs or response bodies.
    return result("failed", current);
  }
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  let origin = process.env.FOUNDIT_SITE_ORIGIN ?? "";
  const options: Options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--origin") origin = args[++i] ?? "";
    else if (args[i] === "--local") options.local = true;
    else if (args[i] === "--workflow") options.workflow = true;
    else if (args[i] === "--private") options.private = true;
    else throw new Error("Usage: npm run verify:hosted -- --origin https://your-site [--private] [--workflow]; --local permits loopback read-only checks.");
  }
  let report;
  try {
    report = !origin ? { status: "blocked_missing_origin", limits: "Set FOUNDIT_SITE_ORIGIN in ignored .env.release.local, or use --origin. No requests made." }
      : await verifyHosted(origin, { attendee: process.env.FOUNDIT_ATTENDEE_COOKIE, staff: process.env.FOUNDIT_STAFF_COOKIE }, options);
  } catch {
    report = { status: "failed", failed_check: "invalid_origin_or_options", limits: "Use a bare HTTPS origin. Local mode accepts loopback HTTP and never performs the multi-account workflow." };
  }
  await saveReport("hosted-verification.json", report);
  process.exitCode = report.status.startsWith("passed") ? 0 : report.status === "failed" ? 1 : 2;
}
