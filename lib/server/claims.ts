import type { Claim, ClaimSummary, CreateClaim, StaffClaim, ClaimStatus } from "../../shared/api.ts";
import { ApiError } from "./http.ts";
import { Store, constraint, payloadHash, requireStaff, type Actor } from "./store.ts";
import { reportRow,publicReport } from "./reports.ts";
type ClaimRow = Claim & {owner_id:string;client_request_id:string;payload_hash:string};
export function claimView(row:ClaimRow):Claim {return {id:row.id,lost_report_id:row.lost_report_id,found_report_id:row.found_report_id,evidence:row.evidence,status:row.status,created_at:row.created_at,updated_at:row.updated_at};}
function summary(row:ClaimRow):ClaimSummary {const {evidence,...rest}=claimView(row);void evidence;return rest;}
async function row(store:Store,id:string):Promise<ClaimRow> {const value=await store.one<ClaimRow>("SELECT * FROM claims WHERE id=?",id);if(!value)throw new ApiError(404,"not_found","Claim not found.");return value;}
export async function readClaim(store:Store,actor:Actor,id:string):Promise<Claim> {
  const value=await row(store,id); if(value.owner_id!==actor.id)throw new ApiError(404,"not_found","Claim not found.");return claimView(value);
}
export async function createClaim(store:Store,actor:Actor,input:CreateClaim) {
  const hash=await payloadHash(input);
  const replay=async()=>{const prior=await store.one<ClaimRow>("SELECT * FROM claims WHERE owner_id=? AND client_request_id=?",actor.id,input.client_request_id);
    if(!prior)return null;if(prior.payload_hash!==hash)throw new ApiError(409,"request_id_reused","Use a new request ID for changed claim details.");return {claim:claimView(prior),created:false};};
  const previous=await replay();if(previous)return previous;
  const lost=await reportRow(store,input.lost_report_id),found=await reportRow(store,input.found_report_id);
  if(lost.owner_id!==actor.id)throw new ApiError(404,"not_found","Lost report not found.");
  if(lost.kind!=="lost"||found.kind!=="found"||lost.event_id!==found.event_id||lost.category!==found.category)
    throw new ApiError(422,"invalid_pair","Choose a compatible lost and found report.");
  const id=crypto.randomUUID(),now=new Date().toISOString();
  try {
    const result=await store.run("INSERT INTO claims (id,owner_id,client_request_id,payload_hash,lost_report_id,found_report_id,evidence,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,'pending',?,? WHERE EXISTS (SELECT 1 FROM reports WHERE id=? AND status='active') AND EXISTS (SELECT 1 FROM reports WHERE id=? AND status='active')",
      id,actor.id,input.client_request_id,hash,lost.id,found.id,input.evidence,now,now,lost.id,found.id);
    if(!result.meta.changes)throw new ApiError(409,"reports_unavailable","One of these reports is already reserved or recovered.");
  }catch(error){if(constraint(error)){const prior=await replay();if(prior)return prior;}throw error;}
  return {claim:claimView(await row(store,id)),created:true};
}
export async function listClaims(store:Store,actor:Actor):Promise<ClaimSummary[]> {
  return (await store.all<ClaimRow>("SELECT * FROM claims WHERE owner_id=? ORDER BY created_at DESC LIMIT 100",actor.id)).map(summary);
}
export async function staffQueue(store:Store,actor:Actor) {
  requireStaff(actor);
  const entries=await store.all<ClaimRow>("SELECT * FROM claims ORDER BY created_at DESC LIMIT 100");
  const counts:Record<ClaimStatus,number>={pending:0,approved:0,rejected:0,recovered:0};
  for(const value of await store.all<{status:ClaimStatus;count:number}>("SELECT status,COUNT(*) AS count FROM claims GROUP BY status"))counts[value.status]=value.count;
  return {claims:entries.map(summary),counts};
}
export async function staffDetail(store:Store,actor:Actor,id:string):Promise<StaffClaim> {
  requireStaff(actor);const claim=await row(store,id);
  const lost=await reportRow(store,claim.lost_report_id),found=await reportRow(store,claim.found_report_id);
  const reference=await store.one<{private_clue:string|null}>("SELECT private_clue FROM private_reports WHERE report_id=?",found.id);
  const media=await store.all<{id:string}>("SELECT i.id FROM intakes i JOIN private_reports p ON p.intake_id=i.id WHERE p.report_id IN (?,?) AND i.object_key IS NOT NULL",lost.id,found.id);
  return {...claimView(claim),lost_report:publicReport(lost),found_report:publicReport(found),private_clue:reference?.private_clue??"",media_ids:media.map(m=>m.id)};
}
export async function reviewClaim(store:Store,actor:Actor,id:string,decision:"approved"|"rejected",note:string|null) {
  requireStaff(actor);const claim=await row(store,id);
  if(claim.status===decision)return claimView(claim);
  if(claim.status!=="pending")throw new ApiError(409,"invalid_transition","Only pending claims can be reviewed.");
  const now=new Date().toISOString();
  if(decision==="rejected"){
    const results=await store.batch([
      ["UPDATE claims SET status='rejected',updated_at=? WHERE id=? AND status='pending'",now,id],
      ["INSERT OR IGNORE INTO review_events (id,claim_id,actor_id,action,note,created_at) SELECT ?,?,?,'rejected',?,? WHERE EXISTS (SELECT 1 FROM claims WHERE id=? AND status='rejected')",crypto.randomUUID(),id,actor.id,note,now,id],
    ]);
    if(!results[0].meta.changes && (await row(store,id)).status!=="rejected")throw new ApiError(409,"invalid_transition","The claim has already changed.");
  }else{
    const reserve="INSERT INTO reservations (report_id,claim_id) SELECT ?,c.id FROM claims c WHERE c.id=? AND c.status='pending' AND EXISTS (SELECT 1 FROM reports WHERE id=c.lost_report_id AND status='active') AND EXISTS (SELECT 1 FROM reports WHERE id=c.found_report_id AND status='active')";
    try{
      const results=await store.batch([
        [reserve,claim.lost_report_id,id],[reserve,claim.found_report_id,id],
        ["UPDATE reports SET status='reserved' WHERE id IN (SELECT report_id FROM reservations WHERE claim_id=?) AND status='active'",id],
        ["UPDATE claims SET status='approved',updated_at=? WHERE id=? AND status='pending' AND (SELECT COUNT(*) FROM reservations WHERE claim_id=?)=2",now,id,id],
        ["INSERT OR IGNORE INTO review_events (id,claim_id,actor_id,action,note,created_at) SELECT ?,?,?,'approved',?,? WHERE EXISTS (SELECT 1 FROM claims WHERE id=? AND status='approved')",crypto.randomUUID(),id,actor.id,note,now,id],
      ]);
      if(!results[3].meta.changes)throw new ApiError(409,"reports_unavailable","The reports are no longer available for approval.");
    }catch(error){if(constraint(error))throw new ApiError(409,"reports_unavailable","Another claim already reserved an item.");throw error;}
  }
  return claimView(await row(store,id));
}
export async function handover(store:Store,actor:Actor,id:string) {
  requireStaff(actor);const claim=await row(store,id);
  if(claim.status==="recovered")return claimView(claim);
  if(claim.status!=="approved")throw new ApiError(409,"invalid_transition","Approve the claim before confirming handover.");
  const now=new Date().toISOString();
  await store.batch([
    ["UPDATE claims SET status='recovered',updated_at=? WHERE id=? AND status='approved' AND (SELECT COUNT(*) FROM reservations WHERE claim_id=?)=2",now,id,id],
    ["UPDATE reports SET status='recovered' WHERE id IN (SELECT report_id FROM reservations WHERE claim_id=?) AND EXISTS (SELECT 1 FROM claims WHERE id=? AND status='recovered')",id,id],
    ["INSERT OR IGNORE INTO review_events (id,claim_id,actor_id,action,note,created_at) SELECT ?,?,?,'recovered',NULL,? WHERE EXISTS (SELECT 1 FROM claims WHERE id=? AND status='recovered')",crypto.randomUUID(),id,actor.id,now,id],
    ["DELETE FROM reservations WHERE claim_id=? AND EXISTS (SELECT 1 FROM claims WHERE id=? AND status='recovered')",id,id],
  ]);
  const updated=await row(store,id);
  if(updated.status!=="recovered")throw new ApiError(409,"reservation_missing","The claim reservation could not be confirmed.");
  return claimView(updated);
}
