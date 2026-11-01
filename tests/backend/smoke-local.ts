// Loopback-only, fictional smoke data. Never targets a hosted Site or deletes records.
import assert from "node:assert/strict";
import {lostReportRequest,foundReportRequest} from "../../shared/examples.ts";
import type {Bootstrap,Claim,Intake,Matches,PublicReport,Success} from "../../shared/api.ts";
const base=new URL(process.argv[2]??"http://127.0.0.1:4184");
if(base.protocol!=="http:"||!["127.0.0.1","localhost"].includes(base.hostname)||base.username||base.password)
  throw new Error("This smoke runner is restricted to loopback HTTP development.");
const health=await fetch(new URL("/api/v1/health",base));assert.equal(health.status,200);
const login=await fetch(new URL("/signin-with-chatgpt?return_to=/",base),{redirect:"manual"});
const cookie=login.headers.getSetCookie().map(value=>value.split(";")[0]).join("; ");
assert.ok(cookie,"Use npm run dev: the built Worker does not simulate sign-in.");
const headers={Cookie:cookie};
const get=async<T>(path:string):Promise<T>=>{
  const response=await fetch(new URL("/api/v1/"+path,base),{headers});
  assert.equal(response.status,200,path);
  return (await response.json() as Success<T>).data;
};
const bootstrap=await get<Bootstrap>("bootstrap");
assert.equal(bootstrap.user?.id,"local_seedy");assert.equal(bootstrap.capabilities.can_review,false);
const post=async(path:string,body:unknown,expected=201)=>{
  const response=await fetch(new URL("/api/v1/"+path,base),{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(body)});
  assert.equal(response.status,expected,path);return response;
};
const form=new FormData();form.set("kind","found");form.set("description","Fictional navy bag");
form.set("photo",new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZV8AAAAASUVORK5CYII=","base64")],"synthetic.png",{type:"image/png"}));
const intakeResponse=await fetch(new URL("/api/v1/intake",base),{method:"POST",headers,body:form});
assert.equal(intakeResponse.status,201);const intake=(await intakeResponse.json() as Success<Intake>).data;
assert.equal(intake.providers.openai,"unavailable");
const lostInput={...lostReportRequest,client_request_id:crypto.randomUUID()};
const foundInput={...foundReportRequest,client_request_id:crypto.randomUUID(),intake_id:intake.id};
const lost=(await (await post("reports",lostInput)).json() as Success<PublicReport>).data;
const found=(await (await post("reports",foundInput)).json() as Success<PublicReport>).data;
await post("reports",lostInput,200);
assert.ok((await get<PublicReport[]>("me/reports")).some(row=>row.id===lost.id));
const matches=await get<Matches>("reports/"+lost.id+"/matches");
assert.ok(matches.candidates.some(row=>row.candidate.id===found.id));
assert.equal(JSON.stringify(matches).includes(foundInput.private_clue!),false);
const claimInput={client_request_id:crypto.randomUUID(),lost_report_id:lost.id,found_report_id:found.id,evidence:"Fictional triangle mark inside the pocket"};
const claim=(await (await post("claims",claimInput)).json() as Success<Claim>).data;
assert.equal((await get<Claim>("claims/"+claim.id)).status,"pending");
await post("staff/claims/"+claim.id+"/review",{decision:"approved",note:null},403);
const media=await fetch(new URL("/api/v1/media/"+intake.media_id,base),{headers});
assert.equal(media.status,200);assert.equal(media.headers.get("Cache-Control"),"no-store");
const anonymous=await fetch(new URL("/api/v1/media/"+intake.media_id,base));
assert.equal(anonymous.status,401);
console.log(JSON.stringify({status:"passed",lost_report_id:lost.id,found_report_id:found.id,claim_id:claim.id,match_score:matches.candidates.find(row=>row.candidate.id===found.id)?.score,
  verified:["local_sign_in","D1_create_readback","request_replay","real_matching","private_R2_upload_read","claim_creation","nonstaff_review_denied","anonymous_media_denied"],
  limits:"Single development identity; staff handover/concurrent ownership tested separately using SQL integration fixtures, not hosted accounts."},null,2));
