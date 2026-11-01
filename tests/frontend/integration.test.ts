import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toCreateReport,
  toEventTimestamp,
  emptyDraft,
} from "../../lib/client/report-draft.ts";
import {
  api,
  post,
  ApiClientError,
  requestIdentity,
  signInPath,
} from "../../lib/client/api.ts";
const draft = {
  ...emptyDraft,
  title: "Blue bag",
  category: "Bags",
  description: "Silver zipper",
  location: "Main Hall",
  occurredAt: "2026-11-01T10:15",
  privateClue: "Private mark",
};
test("report mapping uses event IST and includes private reference only for found reports", () => {
  assert.equal(toEventTimestamp(draft.occurredAt), "2026-11-01T04:45:00.000Z");
  const id = crypto.randomUUID();
  const lost = toCreateReport(draft, "lost", id, null, []);
  assert.equal(lost.private_clue, null);
  assert.equal(lost.color, null);
  assert.equal(lost.occurred_at, "2026-11-01T04:45:00.000Z");
  assert.equal(
    toCreateReport(draft, "found", id, null, ["Silver zipper"]).private_clue,
    "Private mark",
  );
  assert.equal("owner_id" in lost, false);
});
test("request identity stays stable on retries and changes with the payload", () => {
  const first = requestIdentity(null, { title: "Bag" });
  assert.equal(requestIdentity(first, { title: "Bag" }).id, first.id);
  assert.notEqual(requestIdentity(first, { title: "Keys" }).id, first.id);
});
test("API client uses same-origin credentials and decodes success/error envelopes", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(input, "/api/v1/reports");
      assert.equal(init?.credentials, "same-origin");
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.method, "POST");
      return Response.json({ data: { id: "report-id" } });
    };
    assert.deepEqual(await post("/reports", { title: "Bag" }), {
      id: "report-id",
    });
    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "validation_error",
            message: "Check title",
            field_errors: { title: ["Required"] },
          },
        },
        { status: 422 },
      );
    await assert.rejects(
      api("/reports"),
      (error) =>
        error instanceof ApiClientError &&
        error.status === 422 &&
        error.fieldErrors.title[0] === "Required",
    );
    globalThis.fetch = async () => Response.json({ unexpected: true });
    await assert.rejects(api("/reports"), /incomplete response/);
    await assert.rejects(api("//external.test"), /Invalid service path/);
  } finally {
    globalThis.fetch = original;
  }
});
test("sign-in redirect cannot target an external origin", () => {
  assert.equal(
    signInPath("//external.test"),
    "/signin-with-chatgpt?return_to=%2Fworkspace",
  );
});
