import { ok } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export function GET() { return ok({ status:"ok", api_version:"v1" }); }
