import {test} from "node:test";
import assert from "node:assert/strict";
import {database} from "./helpers.ts";
import {Store} from "../../lib/server/store.ts";
import {createReport,reportRow} from "../../lib/server/reports.ts";
import {retrieveMatches} from "../../lib/server/retrieval.ts";
import {handle} from "../../lib/server/application.ts";
import {lostReportRequest,foundReportRequest} from "../../shared/examples.ts";

test("retrieval finds a matching item after 500 incompatible candidates",async()=>{
  const {db,d1}=database(),store=new Store(d1),owner={id:"retrieval-owner",staff:false};
  try{
    const lost=await createReport(store,owner,lostReportRequest),found=await createReport(store,owner,foundReportRequest);
    for(let index=0;index<500;index++){
      const id="00000000-0000-4000-8000-"+String(index).padStart(12,"0");
      await store.run("INSERT INTO reports (id,owner_id,client_request_id,payload_hash,event_id,kind,title,category,color,description,visible_features,location,occurred_at,status,created_at) SELECT ?,owner_id,?,payload_hash,event_id,kind,title,category,'red',description,visible_features,location,occurred_at,status,created_at FROM reports WHERE id=?",id,id,found.report.id);
    }
    const result=await retrieveMatches(store,await reportRow(store,lost.report.id));
    assert.equal(result.retrieval_complete,true);
    assert.equal(result.candidates[0]?.candidate.id,found.report.id);
    const response=await handle(new Request("https://foundit.test/api/v1/me/reports?offset=500"),{db:d1,actor:owner,providers:{}});
    assert.equal(response.status,200);
    assert.equal((await response.json() as {data:unknown[]}).data.length,2);
    const invalid=await handle(new Request("https://foundit.test/api/v1/me/reports?offset=-1"),{db:d1,actor:owner,providers:{}});
    assert.equal(invalid.status,422);
  }finally{db.close();}
});
