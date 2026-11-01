import {test} from "node:test";
import assert from "node:assert/strict";
import {database,bucket} from "./helpers.ts";
import {handle,type Resources} from "../../lib/server/application.ts";
const actor={id:"uploader",staff:false};
function intake(photo?:File,extra?:[string,string]):Request {
  const form=new FormData();form.set("kind","found");form.set("description","Blue bag");
  if(photo)form.set("photo",photo);if(extra)form.set(...extra);
  return new Request("https://foundit.test/api/v1/intake",{method:"POST",body:form});
}
test("manual/degraded intake persists owned private photo without configured AI or fake suggestions",async()=>{
  const {db,d1}=database(),images=bucket();const resources:Resources={db:d1,bucket:images.binding,actor,providers:{}};
  try{
    const png=new File([new Uint8Array([137,80,78,71,13,10,26,10])],"test.png",{type:"image/png"});
    const response=await handle(intake(png),resources);assert.equal(response.status,201);
    const body=await response.json() as {data:{id:string;media_id:string;providers:{openai:string;cerebras:string};suggestions:{title:null}}};
    assert.equal(body.data.suggestions.title,null);assert.equal(body.data.providers.openai,"unavailable");assert.equal(images.objects.size,1);
    assert.equal(body.data.id,body.data.media_id);
    const read=await handle(new Request("https://foundit.test/api/v1/media/"+body.data.media_id),resources);
    assert.equal(read.status,200);assert.equal((await read.arrayBuffer()).byteLength,8);
  }finally{db.close();}
});
test("intake rejects private evidence fields, mismatched MIME, unauthenticated access and huge bodies",async()=>{
  const {db,d1}=database(),images=bucket();const resources:Resources={db:d1,bucket:images.binding,actor,providers:{}};
  try{
    assert.equal((await handle(intake(undefined,["private_clue","Do not send"]),resources)).status,422);
    assert.equal((await handle(intake(new File(["not a png"],"test.png",{type:"image/png"})),resources)).status,422);
    assert.equal((await handle(intake(),{...resources,actor:null})).status,401);
    const request=intake();request.headers.set("content-length",String(10*1024*1024));
    assert.equal((await handle(request,resources)).status,413);
    assert.equal(images.objects.size,0);
  }finally{db.close();}
});
