import { z } from "zod";
import { CreateReportSchema,CreateClaimSchema,ReviewSchema,GuidanceRequestSchema,type Guidance } from "../../shared/api.ts";
import { ApiError,ok,failure } from "./http.ts";
import { Store,requireActor,requireStaff,requireOwner,type Actor } from "./store.ts";
import { reportRow,createReport,ownReports,matchSource,publicReport,hideSharedPreview,type ReportRow } from "./reports.ts";
import { rankMatches } from "./matching.ts";
import { createClaim,readClaim,listClaims,staffQueue,staffDetail,reviewClaim,handover } from "./claims.ts";
import { boundedBody,createIntake,rateLimit } from "./intake.ts";
import { recoveryGuidance,type ProviderConfig,type Fetcher } from "./providers.ts";
export type Resources={db?:D1Database;bucket?:R2Bucket;actor:Actor|null;providers:ProviderConfig;fetcher?:Fetcher};
async function json<T extends z.ZodTypeAny>(request:Request,schema:T):Promise<z.infer<T>>{
  if(!(request.headers.get("content-type")??"").startsWith("application/json"))throw new ApiError(422,"invalid_body","Use JSON for this request.");
  let value:unknown;try{value=JSON.parse(new TextDecoder().decode(await boundedBody(request,32768)));}
  catch(error){if(error instanceof ApiError)throw error;throw new ApiError(422,"invalid_json","The request body is not valid JSON.");}
  const parsed=schema.safeParse(value);if(!parsed.success){
    const fields:Record<string,string[]>={};for(const issue of parsed.error.issues){const key=issue.path.join(".")||"_";(fields[key]??=[]).push(issue.message);}
    throw new ApiError(422,"validation_error","Check the request fields.",fields);
  }return parsed.data;
}
function id(value:string):string{if(!z.string().uuid().safeParse(value).success)throw new ApiError(404,"not_found","Record not found.");return value;}
export async function handle(request:Request,resources:Resources):Promise<Response>{
  try{
    const path=new URL(request.url).pathname.replace(/^\/api\/v1\/?/,"").split("/").filter(Boolean);
    const method=request.method;
    if(method==="POST"){
      const origin=request.headers.get("origin");
      if(request.headers.get("sec-fetch-site")==="cross-site"||(origin&&origin!==new URL(request.url).origin))
        throw new ApiError(403,"cross_origin","Use the application's own origin for changes.");
    }
    if(!resources.db)throw new ApiError(503,"storage_unavailable","Database storage is not configured.");
    const store=new Store(resources.db),actor=resources.actor;
    if(method==="POST"&&path.join("/")==="reports"){
      const user=requireActor(actor),input=await json(request,CreateReportSchema),result=await createReport(store,user,input);
      return ok(result.report,result.created?201:200);
    }
    if(method==="POST"&&path[0]==="reports"&&path.length===4&&path[2]==="preview"&&path[3]==="hide"){
      const user=requireActor(actor);await json(request,z.object({}).strict());
      return ok(await hideSharedPreview(store,user,id(path[1])));
    }
    if(method==="GET"&&path[0]==="reports"&&path.length===2)return ok(publicReport(await reportRow(store,id(path[1]))));
    if(method==="GET"&&path[0]==="reports"&&path.length===3&&path[2]==="preview"){
      requireActor(actor);
      const report=await reportRow(store,id(path[1]));
      if(report.has_shared_preview!==1||report.status==="recovered")throw new ApiError(404,"not_found","Item preview not found.");
      const preview=await store.one<{shared_preview_key:string|null}>("SELECT i.shared_preview_key FROM private_reports p JOIN intakes i ON i.id=p.intake_id WHERE p.report_id=?",report.id);
      if(!preview?.shared_preview_key)throw new ApiError(404,"not_found","Item preview not found.");
      if(!resources.bucket)throw new ApiError(503,"storage_unavailable","Image storage is not configured.");
      const object=await resources.bucket.get(preview.shared_preview_key);
      if(!object)throw new ApiError(404,"not_found","Item preview not found.");
      return new Response(object.body,{headers:{"Content-Type":"image/jpeg","Content-Disposition":'inline; filename="shared-item-preview.jpg"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Cross-Origin-Resource-Policy":"same-origin","Content-Security-Policy":"default-src 'none'; sandbox"}});
    }
    if(method==="GET"&&path.join("/")==="me/reports")return ok(await ownReports(store,requireActor(actor)));
    if(method==="GET"&&path[0]==="reports"&&path[2]==="matches"&&path.length===3){
      const source=await matchSource(store,requireActor(actor),id(path[1]));
      const candidates=await store.all<ReportRow>("SELECT * FROM reports WHERE event_id=? AND category=? AND kind<>? AND status='active' ORDER BY created_at DESC LIMIT 500",source.event_id,source.category,source.kind);
      return ok(rankMatches(publicReport(source),candidates.map(publicReport)));
    }
    if(method==="POST"&&path.join("/")==="intake")return ok(await createIntake(request,store,resources.bucket,requireActor(actor),resources.providers,resources.fetcher),201);
    if(method==="POST"&&path.join("/")==="claims"){
      const user=requireActor(actor),input=await json(request,CreateClaimSchema),result=await createClaim(store,user,input);
      return ok(result.claim,result.created?201:200);
    }
    if(method==="GET"&&path.join("/")==="me/claims")return ok(await listClaims(store,requireActor(actor)));
    if(method==="GET"&&path[0]==="claims"&&path.length===2)return ok(await readClaim(store,requireActor(actor),id(path[1])));
    if(path[0]==="staff"){
      const user=requireStaff(actor);
      if(method==="GET"&&path.join("/")==="staff/claims")return ok(await staffQueue(store,user));
      if(path[1]==="claims"&&path[2]){
        const claimId=id(path[2]);
        if(method==="GET"&&path.length===3)return ok(await staffDetail(store,user,claimId));
        if(method==="POST"&&path[3]==="review"&&path.length===4){const input=await json(request,ReviewSchema);return ok(await reviewClaim(store,user,claimId,input.decision,input.note));}
        if(method==="POST"&&path[3]==="handover"&&path.length===4){await json(request,z.object({}).strict());return ok(await handover(store,user,claimId));}
      }
    }
    if(method==="GET"&&path[0]==="media"&&path.length===2){
      const user=requireActor(actor);
      const media=await store.one<{owner_id:string;object_key:string|null;content_type:string|null}>("SELECT owner_id,object_key,content_type FROM intakes WHERE id=?",id(path[1]));
      if(!media?.object_key)throw new ApiError(404,"not_found","Image not found.");
      requireOwner(media.owner_id,user);
      if(!resources.bucket)throw new ApiError(503,"storage_unavailable","Image storage is not configured.");
      const object=await resources.bucket.get(media.object_key);
      if(!object)throw new ApiError(404,"not_found","Image not found.");
      return new Response(object.body,{headers:{"Content-Type":media.content_type??"application/octet-stream","Content-Disposition":'inline; filename="private-item"',"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
    }
    if(method==="POST"&&path.join("/")==="recovery-guidance"){
      const user=requireActor(actor);await json(request,GuidanceRequestSchema);
      await rateLimit(store,user);
      const cached=await store.one<{payload:string}>("SELECT payload FROM guidance_cache WHERE key='rapid_metro' AND expires_at>?",new Date().toISOString());
      if(cached)return ok(JSON.parse(cached.payload) as Guidance);
      const result=await recoveryGuidance(resources.providers,resources.fetcher);
      if(result.status==="available")await store.run("INSERT INTO guidance_cache (key,payload,expires_at) VALUES ('rapid_metro',?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at",JSON.stringify(result),new Date(Date.now()+3600000).toISOString());
      return ok(result);
    }
    throw new ApiError(404,"not_found","Endpoint not found.");
  }catch(error){return failure(error);}
}
