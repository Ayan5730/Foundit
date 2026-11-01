import {test} from "node:test";
import assert from "node:assert/strict";
import {CreateReportSchema,CreateClaimSchema} from "../../shared/api.ts";
import {lostReportRequest,foundReportRequest,claimRequest} from "../../shared/examples.ts";
import {makeBootstrap,isStaff} from "../../lib/server/bootstrap.ts";
import {failure,ApiError,ok} from "../../lib/server/http.ts";

test("examples follow strict schemas; clients cannot set owners or recovery status",()=>{
  assert.ok(CreateReportSchema.safeParse(lostReportRequest).success);
  assert.ok(CreateReportSchema.safeParse(foundReportRequest).success);
  assert.ok(CreateClaimSchema.safeParse(claimRequest).success);
  assert.equal(CreateReportSchema.safeParse({...lostReportRequest,owner_id:"other"}).success,false);
  assert.equal(CreateReportSchema.safeParse({...lostReportRequest,status:"recovered"}).success,false);
  assert.equal(CreateReportSchema.safeParse({...foundReportRequest,private_clue:null}).success,false);
  assert.equal(CreateReportSchema.safeParse({...lostReportRequest,occurred_at:"2026-11-01T10:15"}).success,false);
});
test("anonymous bootstrap never grants capabilities; staff role uses exact server ID",()=>{
  assert.deepEqual(makeBootstrap(null,"staff").capabilities,{can_report:false,can_review:false});
  const user={userId:"staff",displayName:"Reviewer"};
  assert.equal(isStaff(user," staff, other "),true);
  assert.equal(isStaff({...user,userId:"staf"},"staff"),false);
  assert.equal(isStaff(user,undefined),false);
  assert.equal(makeBootstrap(user,"staff").capabilities.can_review,true);
});
test("HTTP envelopes are private/noncacheable and unknown errors do not leak details",async()=>{
  const res=ok({status:"ok"});
  assert.equal(res.headers.get("Cache-Control"),"no-store");
  assert.deepEqual(await res.json(),{data:{status:"ok"}});
  const err=failure(new Error("secret diagnostic"));
  assert.equal(err.status,500);
  assert.equal((await err.text()).includes("secret diagnostic"),false);
  assert.equal(failure(new ApiError(403,"forbidden","Staff required.")).status,403);
});
