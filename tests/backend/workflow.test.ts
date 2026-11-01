import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {database,bucket} from "./helpers.ts";
import {Store} from "../../lib/server/store.ts";
import {handle,type Resources} from "../../lib/server/application.ts";
import {lostReportRequest,foundReportRequest} from "../../shared/examples.ts";
import {rankMatches} from "../../lib/server/matching.ts";
import {createReport} from "../../lib/server/reports.ts";
import {createClaim,reviewClaim,handover,listClaims,staffQueue} from "../../lib/server/claims.ts";
import type {PublicReport,StaffClaim,Success} from "../../shared/api.ts";
const owner={id:"owner",staff:false},finder={id:"finder",staff:false},staff={id:"staff",staff:true};
const post=(path:string,body:unknown)=>new Request("https://foundit.test/api/v1/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
test("report -> matching -> private claim -> staff review -> handover; retries and privacy",async()=>{
  const {db,d1}=database(),store=new Store(d1);
  try{
    const lost=await createReport(store,owner,lostReportRequest),found=await createReport(store,finder,foundReportRequest);
    const matches=rankMatches(lost.report,[found.report]);assert.equal(matches.candidates.length,1);assert.ok(matches.candidates[0].score>=80);
    assert.equal(JSON.stringify(found.report).includes("private_clue"),false);
    assert.equal(JSON.stringify(found.report).includes("owner_id"),false);
    assert.equal((await createReport(store,owner,lostReportRequest)).created,false);
    await assert.rejects(createReport(store,owner,{...lostReportRequest,title:"changed"}),{status:409});
    const input={client_request_id:crypto.randomUUID(),lost_report_id:lost.report.id,found_report_id:found.report.id,evidence:foundReportRequest.private_clue!};
    const claim=await createClaim(store,owner,input);assert.equal((await createClaim(store,owner,input)).created,false);
    await assert.rejects(createClaim(store,owner,{...input,evidence:"Changed proof"}),{status:409});
    const resources:Resources={db:d1,actor:finder,providers:{}};
    assert.equal((await handle(new Request("https://foundit.test/api/v1/claims/"+claim.claim.id),resources)).status,404);
    assert.equal((await handle(post("staff/claims/"+claim.claim.id+"/review",{decision:"approved",note:null}),resources)).status,403);
    const detail=await handle(new Request("https://foundit.test/api/v1/staff/claims/"+claim.claim.id),{...resources,actor:staff});
    assert.equal((await detail.json() as Success<StaffClaim>).data.private_clue,foundReportRequest.private_clue);
    await assert.rejects(handover(store,staff,claim.claim.id),{status:409});
    assert.equal((await reviewClaim(store,staff,claim.claim.id,"approved",null,true)).status,"approved");
    assert.equal((await store.one<{count:number}>("SELECT COUNT(*) AS count FROM review_events WHERE action='custody_confirmed'"))?.count,1);
    assert.equal((await store.one<{status:string}>("SELECT status FROM reports WHERE id=?",found.report.id))?.status,"reserved");
    const competingLost=await createReport(store,{id:"second-owner",staff:false},{...lostReportRequest,client_request_id:crypto.randomUUID()});
    await assert.rejects(createClaim(store,{id:"second-owner",staff:false},{...input,client_request_id:crypto.randomUUID(),lost_report_id:competingLost.report.id}),{status:409});
    assert.equal((await handover(store,staff,claim.claim.id)).status,"recovered");
    assert.equal((await handover(store,staff,claim.claim.id)).status,"recovered");
    assert.equal((await store.one<{count:number}>("SELECT COUNT(*) AS count FROM review_events WHERE action='recovered'"))?.count,1);
    assert.equal((await store.one<{count:number}>("SELECT COUNT(*) AS count FROM reports WHERE status='recovered'"))?.count,2);
    assert.equal((await store.one<{count:number}>("SELECT COUNT(*) AS count FROM reservations"))?.count,0);
  }finally{db.close();}
});
test("competing approval batches cannot reserve the same found item; rejected claims cannot recover",async()=>{
  const {db,d1}=database(),store=new Store(d1);
  try{
    const found=await createReport(store,finder,foundReportRequest);
    const a=await createReport(store,owner,lostReportRequest);
    const other={id:"other",staff:false};
    const b=await createReport(store,other,{...lostReportRequest,client_request_id:crypto.randomUUID()});
    const make=(lostId:string)=>({client_request_id:crypto.randomUUID(),lost_report_id:lostId,found_report_id:found.report.id,evidence:"Fictional proof"});
    const c1=await createClaim(store,owner,make(a.report.id)),c2=await createClaim(store,other,make(b.report.id));
    const results=await Promise.allSettled([reviewClaim(store,staff,c1.claim.id,"approved",null,true),reviewClaim(store,staff,c2.claim.id,"approved",null,true)]);
    assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
    assert.equal((await store.one<{count:number}>("SELECT COUNT(*) AS count FROM claims WHERE status='approved'"))?.count,1);
    const loser=results[0].status==="rejected"?c1:c2;
    await reviewClaim(store,staff,loser.claim.id,"rejected","Different item.");
    await assert.rejects(handover(store,staff,loser.claim.id),{status:409});
  }finally{db.close();}
});
test("duplicate active claims are atomic and staff cannot approve or hand over their own claim",async()=>{
  const {db,d1}=database(),store=new Store(d1),claimant={id:"claimant-staff",staff:true};
  try{
    const lost=await createReport(store,claimant,lostReportRequest),found=await createReport(store,finder,foundReportRequest);
    const input={client_request_id:crypto.randomUUID(),lost_report_id:lost.report.id,found_report_id:found.report.id,evidence:"Fictional private proof"};
    const results=await Promise.allSettled([createClaim(store,claimant,input),createClaim(store,claimant,{...input,client_request_id:crypto.randomUUID()})]);
    assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
    const claim=results.find(result=>result.status==="fulfilled")!;
    assert.equal(claim.status,"fulfilled");if(claim.status!=="fulfilled")throw new Error("Expected a claim");
    const id=claim.value.claim.id;
    await assert.rejects(reviewClaim(store,claimant,id,"approved",null,true),{status:403});
    await assert.rejects(reviewClaim(store,staff,id,"approved",null),{status:422});
    assert.equal((await store.one<{count:number}>("SELECT COUNT(*) AS count FROM reservations"))?.count,0);
    const resources:Resources={db:d1,actor:staff,providers:{}};
    assert.equal((await handle(post("staff/claims/"+id+"/review",{decision:"approved",note:null}),resources)).status,422);
    assert.equal((await reviewClaim(store,staff,id,"approved",null,true)).status,"approved");
    await assert.rejects(handover(store,claimant,id),{status:403});
    assert.equal((await handover(store,staff,id)).status,"recovered");
    await assert.rejects(handover(store,claimant,id),{status:403});
  }finally{db.close();}
});
test("HTTP validation, missing identity, CSRF, wrong owner, and private media access",async()=>{
  const {db,d1}=database(),store=new Store(d1),images=bucket();
  const resources:Resources={db:d1,bucket:images.binding,actor:owner,providers:{}};
  try{
    assert.equal((await handle(post("reports",lostReportRequest),{...resources,actor:null})).status,401);
    assert.equal((await handle(post("reports",{...lostReportRequest,owner_id:"victim"}),resources)).status,422);
    const cross=post("reports",lostReportRequest);cross.headers.set("Origin","https://attacker.test");
    assert.equal((await handle(cross,resources)).status,403);
    const create=await handle(post("reports",lostReportRequest),resources);assert.equal(create.status,201);
    const lost=(await create.json() as Success<PublicReport>).data;
    assert.equal((await handle(new Request("https://foundit.test/api/v1/reports/"+lost.id+"/matches"),{...resources,actor:finder})).status,404);
    const intakeId=crypto.randomUUID();
    await store.run("INSERT INTO intakes(id,owner_id,object_key,content_type,suggestions,providers,created_at) VALUES (?,?,?,'image/png','{}','{}',?)",intakeId,owner.id,"private/test",new Date().toISOString());
    images.objects.set("private/test",new Uint8Array([137,80,78,71]));
    const mediaUrl="https://foundit.test/api/v1/media/"+intakeId;
    assert.equal((await handle(new Request(mediaUrl),{...resources,actor:finder})).status,404);
    const allowed=await handle(new Request(mediaUrl),resources);assert.equal(allowed.status,200);assert.equal(allowed.headers.get("Cache-Control"),"no-store");
    assert.equal((await handle(new Request(mediaUrl),{...resources,actor:staff})).status,200);
  }finally{db.close();}
});
test("approved item preview is visible to signed-in match viewers, while the original stays private",async()=>{
  const {db,d1}=database(),store=new Store(d1),images=bucket();
  const resources:Resources={db:d1,bucket:images.binding,actor:finder,providers:{}};
  try{
    const form=new FormData();form.set("kind","found");form.set("description","Fictional navy bag");
    const originalBytes=new Uint8Array(readFileSync(new URL("../../scripts/fixtures/fictional-bag.png",import.meta.url)));
    form.set("photo",new File([originalBytes],"original.png",{type:"image/png"}));
    const previewBytes=new Uint8Array(readFileSync(new URL("../fixtures/fictional-bag-preview.jpg",import.meta.url)));
    form.set("shared_preview",new File([previewBytes],"preview.jpg",{type:"image/jpeg"}));
    const intake=await handle(new Request("https://foundit.test/api/v1/intake",{method:"POST",body:form}),resources);
    assert.equal(intake.status,201);
    const intakeId=(await intake.json() as Success<{id:string}>).data.id;
    const found=await createReport(store,finder,{...foundReportRequest,client_request_id:crypto.randomUUID(),intake_id:intakeId});
    assert.equal(found.report.has_shared_preview,true);
    const reportUrl="https://foundit.test/api/v1/reports/"+found.report.id;
    const publicResponse=await handle(new Request(reportUrl),{...resources,actor:null});
    const publicBody=await publicResponse.json() as Success<PublicReport>;
    assert.equal(publicBody.data.has_shared_preview,true);
    assert.equal(JSON.stringify(publicBody).includes("private/"),false);
    assert.equal(JSON.stringify(publicBody).includes(intakeId),false);
    const previewUrl=reportUrl+"/preview";
    assert.equal((await handle(new Request(previewUrl),{...resources,actor:null})).status,401);
    const otherView=await handle(new Request(previewUrl),{...resources,actor:owner});
    assert.equal(otherView.status,200);assert.equal(otherView.headers.get("Content-Type"),"image/jpeg");
    assert.match(otherView.headers.get("Cache-Control")??"",/no-store/);
    assert.deepEqual(new Uint8Array(await otherView.arrayBuffer()),previewBytes);
    assert.equal((await handle(new Request("https://foundit.test/api/v1/media/"+intakeId),{...resources,actor:owner})).status,404);
    const lost=await createReport(store,owner,{...lostReportRequest,client_request_id:crypto.randomUUID()});
    const claim=await createClaim(store,owner,{client_request_id:crypto.randomUUID(),lost_report_id:lost.report.id,found_report_id:found.report.id,evidence:"Fictional triangle mark inside the pocket"});
    await reviewClaim(store,staff,claim.claim.id,"approved",null,true);
    await handover(store,staff,claim.claim.id);
    assert.equal((await handle(new Request(previewUrl),{...resources,actor:owner})).status,404);
    assert.equal((await handle(new Request(reportUrl),{...resources,actor:null}).then(r=>r.json()) as Success<PublicReport>).data.has_shared_preview,false);
  }finally{db.close();}
});
test("reporter can hide an approved preview and another attendee cannot change it",async()=>{
  const {db,d1}=database(),store=new Store(d1);
  try{
    const intakeId=crypto.randomUUID();
    await store.run("INSERT INTO intakes(id,owner_id,object_key,content_type,shared_preview_key,suggestions,providers,created_at) VALUES (?,?,?,'image/png',?,'{}','{}',?)",intakeId,finder.id,"private/"+intakeId,"shared-preview/"+intakeId,new Date().toISOString());
    const found=await createReport(store,finder,{...foundReportRequest,client_request_id:crypto.randomUUID(),intake_id:intakeId});
    assert.equal(found.report.has_shared_preview,true);
    const url="https://foundit.test/api/v1/reports/"+found.report.id+"/preview/hide";
    const request=()=>new Request(url,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    const resources:Resources={db:d1,actor:owner,providers:{}};
    assert.equal((await handle(request(),resources)).status,404);
    const hidden=await handle(request(),{...resources,actor:finder});
    assert.equal(hidden.status,200);
    assert.equal((await hidden.json() as Success<PublicReport>).data.has_shared_preview,false);
    assert.equal((await handle(request(),{...resources,actor:finder})).status,200);
    assert.equal((await handle(new Request(url.replace("/hide","")),resources)).status,404);
  }finally{db.close();}
});
test("assistance rate limit is persisted and crosses endpoint boundaries",async()=>{
  const {db,d1}=database();const resources:Resources={db:d1,actor:owner,providers:{}};
  try{
    for(let index=0;index<9;index++)assert.equal((await handle(post("recovery-guidance",{organization:"rapid_metro"}),resources)).status,200);
    const form=new FormData();form.set("kind","lost");form.set("description","Fictional bag");
    assert.equal((await handle(new Request("https://foundit.test/api/v1/intake",{method:"POST",body:form}),resources)).status,201);
    assert.equal((await handle(post("recovery-guidance",{organization:"rapid_metro"}),resources)).status,429);
  }finally{db.close();}
});
test("claim pagination reaches older records and the staff queue prioritizes pending work",async()=>{
  const {db,d1}=database(),store=new Store(d1);
  try{
    const lost=await createReport(store,owner,lostReportRequest),found=await createReport(store,finder,foundReportRequest);
    let pendingId="";
    for(let index=0;index<102;index++){
      const id=crypto.randomUUID(),time=new Date(Date.UTC(2026,0,1,0,index)).toISOString();
      if(index===0)pendingId=id;
      await store.run("INSERT INTO claims (id,owner_id,client_request_id,payload_hash,lost_report_id,found_report_id,evidence,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",id,owner.id,crypto.randomUUID(),"fixture",lost.report.id,found.report.id,"Synthetic pagination fixture",index===0?"pending":"rejected",time,time);
    }
    const first=await listClaims(store,owner),second=await listClaims(store,owner,100);
    assert.equal(first.length,100);assert.equal(second.length,2);
    assert.equal(new Set([...first,...second].map(claim=>claim.id)).size,102);
    const queue=await staffQueue(store,staff);assert.equal(queue.claims[0].id,pendingId);
    assert.equal(queue.counts.pending,1);assert.equal((await staffQueue(store,staff,100)).claims.length,2);
  }finally{db.close();}
});
