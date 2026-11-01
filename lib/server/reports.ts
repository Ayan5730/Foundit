import type { CreateReport, PublicReport } from "../../shared/api.ts";
import { EVENT } from "../../shared/api.ts";
import { ApiError } from "./http.ts";
import { Store, payloadHash, constraint, requireOwner, type Actor } from "./store.ts";
export type ReportRow = Omit<PublicReport,"visible_features"|"has_shared_preview"> & {visible_features:string;has_shared_preview:number;owner_id:string;client_request_id:string;payload_hash:string};
export function publicReport(row:ReportRow):PublicReport {
  return {id:row.id,event_id:row.event_id,kind:row.kind,title:row.title,category:row.category,color:row.color,
    description:row.description,visible_features:JSON.parse(row.visible_features),location:row.location,
    occurred_at:row.occurred_at,status:row.status,created_at:row.created_at,
    has_shared_preview:row.has_shared_preview===1&&row.status!=="recovered"};
}
export async function reportRow(store:Store,id:string):Promise<ReportRow> {
  const row=await store.one<ReportRow>("SELECT * FROM reports WHERE id=?",id);
  if(!row) throw new ApiError(404,"not_found","Report not found."); return row;
}
export async function createReport(store:Store,actor:Actor,input:CreateReport) {
  const hash=await payloadHash(input);
  const replay=async()=>{
    const existing=await store.one<ReportRow>("SELECT * FROM reports WHERE owner_id=? AND client_request_id=?",actor.id,input.client_request_id);
    if(!existing) return null;
    if(existing.payload_hash!==hash) throw new ApiError(409,"request_id_reused","Use a new request ID for changed report details.");
    return {report:publicReport(existing),created:false};
  };
  const prior=await replay(); if(prior) return prior;
  let hasSharedPreview=0;
  if(input.intake_id) {
    const intake=await store.one<{owner_id:string;shared_preview_key:string|null}>("SELECT owner_id,shared_preview_key FROM intakes WHERE id=?",input.intake_id);
    if(!intake || intake.owner_id!==actor.id) throw new ApiError(404,"not_found","Intake not found.");
    hasSharedPreview=intake.shared_preview_key?1:0;
  }
  const id=crypto.randomUUID(),now=new Date().toISOString();
  try {
    await store.batch([
      ["INSERT INTO reports (id,owner_id,client_request_id,payload_hash,event_id,kind,title,category,color,description,visible_features,location,occurred_at,status,created_at,has_shared_preview) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?)",
        id,actor.id,input.client_request_id,hash,EVENT.id,input.kind,input.title,input.category,input.color,input.description,JSON.stringify(input.visible_features),input.location,input.occurred_at,now,hasSharedPreview],
      ["INSERT INTO private_reports (report_id,private_clue,intake_id) VALUES (?,?,?)",id,input.private_clue,input.intake_id],
    ]);
  } catch(error) { if(constraint(error)){const result=await replay();if(result)return result;} throw error; }
  return {report:publicReport(await reportRow(store,id)),created:true};
}
export async function ownReports(store:Store,actor:Actor) {
  return (await store.all<ReportRow>("SELECT * FROM reports WHERE owner_id=? ORDER BY created_at DESC LIMIT 100",actor.id)).map(publicReport);
}
export async function matchSource(store:Store,actor:Actor,id:string) {
  const row=await reportRow(store,id); requireOwner(row.owner_id,actor); return row;
}
export async function hideSharedPreview(store:Store,actor:Actor,id:string):Promise<PublicReport> {
  const row=await reportRow(store,id);requireOwner(row.owner_id,actor);
  if(row.has_shared_preview===1)await store.run("UPDATE reports SET has_shared_preview=0 WHERE id=?",id);
  return publicReport(await reportRow(store,id));
}
