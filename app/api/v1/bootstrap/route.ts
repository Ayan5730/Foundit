import { makeBootstrap } from "@/lib/server/bootstrap";
import { ok, failure } from "@/lib/server/http";
import { bindings, identity } from "@/lib/server/runtime";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return ok(makeBootstrap(await identity(),bindings().STAFF_USER_IDS)); }
  catch(error) { return failure(error); }
}
