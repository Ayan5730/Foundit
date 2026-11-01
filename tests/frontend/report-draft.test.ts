import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, validateDraft, validatePhoto } from "../../lib/client/report-draft.ts";
const valid = { ...emptyDraft, title: "Navy backpack", category: "Bags", description: "Dark blue fabric and silver zippers.", location: "Main Hall", occurredAt: "2026-11-01T10:15" };
test("lost reports accept optional color and do not require a private clue", () => {
  assert.deepEqual(validateDraft(valid, "lost"), {});
});
test("found reports require a separate private clue", () => {
  assert.ok(validateDraft(valid, "found").privateClue);
  assert.deepEqual(validateDraft({ ...valid, privateClue: "Fictional hidden stitch" }, "found"), {});
});
test("date validation rejects normalized calendar overflow and accepts leap days", () => {
  for (const occurredAt of ["2026-02-30T10:15", "2026-11-01", "2026-11-01T24:15", "2026-11-01T10:15Z"]) {
    assert.ok(validateDraft({ ...valid, occurredAt }, "lost").occurredAt, occurredAt);
  }
  assert.deepEqual(validateDraft({ ...valid, occurredAt: "2028-02-29T10:15" }, "lost"), {});
  assert.deepEqual(validateDraft({ ...valid, occurredAt: "2026-11-01T10:15:30" }, "lost"), {});
});
test("reject whitespace, unknown form choices, invalid date, and excessive input", () => {
  const errors = validateDraft({ ...valid, title: " ", category: "Invented", location: "Elsewhere", occurredAt: "invalid", description: "x".repeat(2001) }, "lost");
  for (const field of ["title","category","location","occurredAt","description"] as const) assert.ok(errors[field], field);
  assert.ok(validateDraft({ ...valid, title: "x".repeat(121) }, "lost").title);
  assert.ok(validateDraft({ ...valid, privateClue: "x".repeat(2001) }, "found").privateClue);
});
test("photo validation rejects unsupported, empty, and oversized files", () => {
  assert.equal(validatePhoto({type:"image/jpeg",size:4*1024*1024}), null);
  assert.equal(validatePhoto({type:"image/png",size:10}), null);
  assert.equal(validatePhoto({type:"image/webp",size:10}), null);
  assert.ok(validatePhoto({type:"image/svg+xml",size:10}));
  assert.ok(validatePhoto({type:"image/png",size:0}));
  assert.ok(validatePhoto({type:"image/jpeg",size:4*1024*1024+1}));
});
