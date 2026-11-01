import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PostgresDatabase, postgresQuery, type QueryPool } from "../../lib/server/netlify/postgres.ts";
import { Store } from "../../lib/server/store.ts";
import { createReport } from "../../lib/server/reports.ts";
import { createClaim, reviewClaim, handover, staffQueue } from "../../lib/server/claims.ts";
import { rateLimit } from "../../lib/server/intake.ts";
import { lostReportRequest, foundReportRequest } from "../../shared/examples.ts";

test("Postgres preserves report privacy, retries, claims, custody, reservations and handover", async () => {
  const db = new PGlite();
  await db.exec(readFileSync(new URL("../../netlify/database/migrations/20261101100000_foundit.sql", import.meta.url), "utf8"));
  const query: QueryPool["query"] = async (sql, values) => {
    const result = await db.query<Record<string, unknown>>(sql, values);
    return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
  };
  const pool: QueryPool = { query, connect: async () => ({ query, release() {} }) };
  const store = new Store(new PostgresDatabase(() => pool).asD1());
  const owner = { id: "owner", staff: false }, finder = { id: "finder", staff: false }, staff = { id: "staff", staff: true };
  try {
    const lost = await createReport(store, owner, lostReportRequest), found = await createReport(store, finder, foundReportRequest);
    assert.equal((await createReport(store, owner, lostReportRequest)).created, false);
    assert.equal("owner_id" in found.report, false);
    const input = { client_request_id: crypto.randomUUID(), lost_report_id: lost.report.id, found_report_id: found.report.id, evidence: "Fictional private proof" };
    const claim = await createClaim(store, owner, input);
    assert.equal((await createClaim(store, owner, input)).created, false);
    await assert.rejects(createClaim(store, owner, { ...input, client_request_id: crypto.randomUUID() }), { status: 409 });
    await assert.rejects(reviewClaim(store, staff, claim.claim.id, "approved", null), { status: 422 });
    await assert.rejects(reviewClaim(store, { ...owner, staff: true }, claim.claim.id, "approved", null, true), { status: 403 });
    assert.equal((await reviewClaim(store, staff, claim.claim.id, "approved", null, true)).status, "approved");
    assert.equal((await staffQueue(store, staff)).counts.approved, 1);
    assert.equal((await handover(store, staff, claim.claim.id)).status, "recovered");
    assert.equal((await handover(store, staff, claim.claim.id)).status, "recovered");
    assert.equal((await store.one<{ count: number }>("SELECT COUNT(*) AS count FROM reservations"))?.count, 0);
    assert.equal((await store.one<{ count: number }>("SELECT COUNT(*) AS count FROM review_events WHERE action='custody_confirmed'"))?.count, 1);
    for (let i = 0; i < 10; i++) await rateLimit(store, owner);
    await assert.rejects(rateLimit(store, owner), { status: 429 });
    await assert.rejects(store.batch([
      ["INSERT INTO guidance_cache (key,payload,expires_at) VALUES (?,?,?)", "rollback", "private", "2030"],
      ["INSERT INTO reports (id) VALUES (?)", "invalid"],
    ]));
    assert.equal(await store.one("SELECT * FROM guidance_cache WHERE key=?", "rollback"), null);
  } finally { await db.close(); }
});

test("Postgres parameters preserve literal question marks and never interpolate values", () => {
  assert.deepEqual(postgresQuery("SELECT '?' AS clue, ? AS value, 'it''s ?' AS note", ["'); DROP TABLE claims; --"]), {
    text: "SELECT '?' AS clue, $1 AS value, 'it''s ?' AS note", values: ["'); DROP TABLE claims; --"],
  });
  assert.equal(postgresQuery("INSERT OR IGNORE INTO example (id) VALUES (?)", ["x"]).text,
    "INSERT INTO example (id) VALUES ($1) ON CONFLICT DO NOTHING");
  assert.throws(() => postgresQuery("SELECT ?", []));
});

test("serialization failure rolls back and retries the whole transaction", async () => {
  const events: string[] = []; let attempts = 0, releases = 0;
  const query: QueryPool["query"] = async sql => {
    events.push(sql);
    if (sql === "BEGIN ISOLATION LEVEL SERIALIZABLE") attempts++;
    if (sql === "SELECT $1" && attempts === 1) throw Object.assign(new Error("retry"), { code: "40001" });
    return { rows: [], rowCount: 1 };
  };
  const adapter = new PostgresDatabase(() => ({ query, connect: async () => ({ query, release() { releases++; } }) }));
  await adapter.batch([adapter.prepare("SELECT ?").bind(1)]);
  assert.equal(attempts, 2); assert.equal(releases, 2);
  assert.deepEqual(events, ["BEGIN ISOLATION LEVEL SERIALIZABLE", "SELECT $1", "ROLLBACK", "BEGIN ISOLATION LEVEL SERIALIZABLE", "SELECT $1", "COMMIT"]);
});
