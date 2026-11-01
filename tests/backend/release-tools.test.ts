import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProviders } from "../../scripts/check-providers.ts";
import { measuredFetcher } from "../../scripts/provider-tools.ts";
import { evaluateProviders, applyNormalization, publicNormalizationInput } from "../../scripts/evaluate-providers.ts";
import { base, baselineRows, summarize } from "../../scripts/evaluate-matching.ts";
import { siteOrigin, verifyHosted } from "../../scripts/verify-hosted.ts";
import { emptySuggestions } from "../../lib/server/providers.ts";
import { database, bucket } from "./helpers.ts";
import { handle } from "../../lib/server/application.ts";
import { makeBootstrap } from "../../lib/server/bootstrap.ts";
import { ok } from "../../lib/server/http.ts";

test("release provider tools never call out unless live is explicit and configuration exists", async () => {
  let calls = 0;
  const upstream = async () => { calls++; throw new Error("secret diagnostic"); };
  const configured = { OPENAI_API_KEY: "secret-key", OPENAI_MODEL: "example-model", CEREBRAS_API_KEY: "secret-key", CEREBRAS_MODEL: "example-model", EXA_API_KEY: "secret-key" };
  const report = await checkProviders(configured, false, upstream);
  assert.equal(report.status, "not_run");
  assert.equal(JSON.stringify(report).includes("secret-key"), false);
  assert.equal((await checkProviders({}, true, upstream)).status, "blocked_missing_configuration");
  assert.equal((await evaluateProviders(configured, false, upstream)).normalized, null);
  assert.equal((await evaluateProviders({}, true, upstream)).status, "blocked_missing_configuration");
  assert.equal(calls, 0);
  const live = await checkProviders(configured, true, async url => {
    if (url.includes("openai")) return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(emptySuggestions()) }] }] });
    if (url.includes("cerebras")) return Response.json({ choices: [{ message: { content: JSON.stringify(emptySuggestions()) } }] });
    return Response.json({ results: [{ title: "Official test source", url: "https://new.delhimetrorail.com/en/rapid-metro", highlights: ["Fictional test excerpt"] }] });
  });
  assert.equal(live.status, "passed");
  assert.equal(live.requests.length, 3);
  assert.equal(live.results.exa.source_count, 1);
  assert.equal(JSON.stringify(live).includes("secret-key"), false);
});

test("provider measurements whitelist numeric usage and omit credentials, text and diagnostics", async () => {
  const measured = measuredFetcher(async () => Response.json({
    usage: { input_tokens: 7, output_tokens: 3, total_tokens: 10, secret: "do-not-store", prompt_tokens: "bad", completion_tokens: -1 },
    output: "private text", error: "secret diagnostic", costDollars: { total: 0.001 },
  }));
  const response = await measured.fetcher("https://api.openai.com/v1/responses", { headers: { Authorization: "Bearer secret-key" }, body: "private prompt" });
  assert.equal((await response.json() as { output: string }).output, "private text");
  assert.deepEqual(measured.requests[0].usage, { input_tokens: 7, output_tokens: 3, total_tokens: 10, reported_cost_usd: 0.001 });
  for (const sensitive of ["secret", "private", "Bearer"]) assert.equal(JSON.stringify(measured.requests).includes(sensitive), false);
  await assert.rejects(measured.fetcher("https://unexpected.example/"), /Unexpected provider/);
  const failed = measuredFetcher(async () => { throw new Error("secret diagnostic"); });
  await assert.rejects(failed.fetcher("https://api.exa.ai/search"));
  assert.equal(failed.requests[0].status, null);
  assert.equal(JSON.stringify(failed.requests).includes("secret"), false);
});

test("paired evaluation keeps the fixed baseline and never normalizes identity or recovery state", async () => {
  assert.deepEqual(summarize(baselineRows()), { scenarios: 24, positive_queries: 13, top3_hits: 12, negative_queries: 11, negative_queries_with_suggestions: 1, false_suggestions: 1 });
  const report = { ...base, owner_id: "private-owner", evidence: "private-proof" };
  const input = publicNormalizationInput(report);
  assert.equal(input.includes("private"), false);
  assert.equal(input.includes("occurred_at"), false);
  const normalized = applyNormalization(base, { ...emptySuggestions(), color: "blue", visible_features: ["canvas"] });
  for (const key of ["id", "event_id", "kind", "occurred_at", "status", "created_at"] as const) assert.equal(normalized[key], base[key]);
  const result = await evaluateProviders({ CEREBRAS_API_KEY: "test-only", CEREBRAS_MODEL: "example" }, true,
    async () => Response.json({ choices: [{ message: { content: JSON.stringify(emptySuggestions()) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }));
  assert.equal(result.status, "completed");
  assert.deepEqual(result.normalized, result.raw);
  assert.ok(result.requests.length > 0 && result.requests.length < 48, "Repeated public inputs should be reused.");
});

test("hosted checker rejects unsafe origins, avoids redirects and never starts writes without explicit workflow", async () => {
  for (const origin of ["http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com/?secret=x", "http://127.0.0.1:4184"]) assert.throws(() => siteOrigin(origin));
  assert.equal(siteOrigin("http://127.0.0.1:4184", true), "http://127.0.0.1:4184");
  let calls = 0;
  const gated = await verifyHosted("https://foundit.test", { attendee: "secret-session" }, {}, async (_url, init) => {
    calls++;
    assert.equal(init?.redirect, "manual");
    assert.equal(new Headers(init?.headers).has("Cookie"), false, "Anonymous checks must not send a session.");
    assert.equal(init?.method, "GET");
    return new Response(null, { status: 302, headers: { Location: "https://other.example/" } });
  });
  assert.equal(calls, 1);
  assert.equal(gated.status, "blocked_site_requires_sign_in");
  assert.equal(JSON.stringify(gated).includes("secret-session"), false);
  await assert.rejects(verifyHosted("http://127.0.0.1:4184", {}, { local: true, workflow: true }), /local_mock/);
});

test("hosted workflow runner exercises actual handlers with distinct isolated test actors", async () => {
  const { db, d1 } = database(), images = bucket();
  const attendeeCookie = "session=secret-attendee", staffCookie = "session=secret-staff";
  const upstream = async (input: string, init?: RequestInit) => {
    const request = new Request(input, init);
    const cookie = request.headers.get("Cookie");
    const actor = cookie === attendeeCookie ? { id: "attendee", staff: false } : cookie === staffCookie ? { id: "staff", staff: true } : null;
    const path = new URL(input).pathname;
    if (path.endsWith("/health")) return ok({ status: "ok" });
    if (path.endsWith("/bootstrap")) return ok(makeBootstrap(actor ? { userId: actor.id, displayName: "Test account" } : null, "staff"));
    return handle(request, { db: d1, bucket: images.binding, actor, providers: {} });
  };
  try {
    const readOnly = await verifyHosted("https://foundit.test", { attendee: attendeeCookie, staff: staffCookie }, {}, upstream);
    assert.equal(readOnly.status, "passed_read_only_checks_workflow_not_run", JSON.stringify(readOnly));
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM reports").get()?.count, 0);
    const result = await verifyHosted("https://foundit.test", { attendee: attendeeCookie, staff: staffCookie }, { workflow: true }, upstream);
    assert.equal(result.status, "passed_hosted_recovery_workflow", JSON.stringify(result));
    assert.ok(result.checks.includes("competing_approval_denied_and_rejection_final"));
    assert.ok(result.checks.includes("separate_idempotent_handover"));
    for (const secret of [attendeeCookie, staffCookie, "triangle inside pocket"]) assert.equal(JSON.stringify(result).includes(secret), false);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM reports WHERE status='recovered'").get()?.count, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM claims WHERE status='rejected'").get()?.count, 1);
  } finally { db.close(); }
});
