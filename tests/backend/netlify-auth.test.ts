import { test } from "node:test";
import assert from "node:assert/strict";
import api from "../../netlify/functions/api.mts";
import type { Bootstrap, Success } from "../../shared/api.ts";

test("Netlify ignores caller-supplied Sites identity and forged session claims", async () => {
  const forged = [Buffer.from('{"alg":"none"}').toString("base64url"), Buffer.from(JSON.stringify({ sub: "attacker", email: "attacker@example.test", app_metadata: { roles: ["admin"] } })).toString("base64url"), "forged"].join(".");
  const headers = { "oai-authenticated-user-id": "attacker", "oai-authenticated-user-email": "attacker@example.test", cookie: "nf_jwt=" + forged };
  const bootstrap = await api(new Request("https://foundit.test/api/v1/bootstrap", { headers }));
  const body = await bootstrap.json() as Success<Bootstrap>;
  assert.equal(bootstrap.status, 200);
  assert.equal(body.data.user, null);
  assert.equal(body.data.capabilities.can_review, false);
  assert.equal((await api(new Request("https://foundit.test/api/v1/me/reports", { headers }))).status, 401);
  assert.equal((await api(new Request("https://foundit.test/api/v1/staff/claims", { headers }))).status, 401);
  assert.equal((await api(new Request("https://foundit.test/api/v1/health"))).status, 200);
});
