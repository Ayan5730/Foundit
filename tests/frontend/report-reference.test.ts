import { test } from "node:test";
import assert from "node:assert/strict";
import { reportIdFromReference } from "../../lib/client/report-reference.ts";

const origin = "https://foundit-recovery-desk.netlify.app";
const id = "c17f129a-628d-4a19-9b2b-a05f087e86ce";

test("manual recovery accepts this site's report link or ID", () => {
  assert.equal(reportIdFromReference(id, origin), id);
  assert.equal(reportIdFromReference(`${origin}/reports/${id}`, origin), id);
  assert.equal(reportIdFromReference(`/reports/${id}/?source=shared`, origin), id);
});

test("manual recovery rejects foreign, malformed and unrelated links", () => {
  for (const value of [
    `https://other.example/reports/${id}`,
    `//other.example/reports/${id}`,
    `${origin}/claims/${id}`,
    `${origin}/reports/not-a-uuid`,
    "javascript:alert(1)",
  ]) assert.equal(reportIdFromReference(value, origin), null, value);
});
