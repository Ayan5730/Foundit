import type { Config } from "@netlify/functions";
import { handle } from "../../lib/server/application.ts";
import { makeBootstrap, isStaff } from "../../lib/server/bootstrap.ts";
import { ok, failure } from "../../lib/server/http.ts";
import { bindings, identity } from "../../lib/server/netlify/runtime.ts";

export default async function api(request: Request): Promise<Response> {
  try {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/api/v1/health") return ok({ status: "ok", api_version: "v1" });
    const config = bindings(), user = await identity();
    if (request.method === "GET" && path === "/api/v1/bootstrap") return ok(makeBootstrap(user, config.STAFF_USER_IDS));
    return await handle(request, {
      db: config.DB, bucket: config.BUCKET, providers: config,
      actor: user ? { id: user.userId, staff: isStaff(user, config.STAFF_USER_IDS) } : null,
    });
  } catch (error) { return failure(error); }
}

export const config: Config = { path: "/api/v1/*" };
