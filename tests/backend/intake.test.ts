import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {database,bucket} from "./helpers.ts";
import {handle,type Resources} from "../../lib/server/application.ts";
import {validSharedPreview} from "../../lib/server/intake.ts";
const actor={id:"uploader",staff:false};
const previewBytes=new Uint8Array(readFileSync(new URL("../fixtures/fictional-bag-preview.jpg",import.meta.url)));
function intake(photo?:File,extra?:[string,string],sharedPreview?:File):Request {
  const form=new FormData();form.set("kind","found");form.set("description","Blue bag");
  if(photo)form.set("photo",photo);if(extra)form.set(...extra);if(sharedPreview)form.set("shared_preview",sharedPreview);
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
test("shared preview requires a private photo and is stored as a separate object",async()=>{
  const {db,d1}=database(),images=bucket();const resources:Resources={db:d1,bucket:images.binding,actor,providers:{}};
  try{
    const original=new File([new Uint8Array([137,80,78,71,13,10,26,10])],"private.png",{type:"image/png"});
    const preview=new File([previewBytes],"preview.jpg",{type:"image/jpeg"});
    assert.equal((await handle(intake(undefined,undefined,preview),resources)).status,422);
    assert.equal((await handle(intake(original,undefined,new File(["bad"],"preview.jpg",{type:"image/jpeg"})),resources)).status,422);
    const response=await handle(intake(original,undefined,preview),resources);assert.equal(response.status,201);
    const body=await response.json() as {data:{id:string}};
    assert.deepEqual([...images.objects.keys()].sort(),["private/"+body.data.id,"shared-preview/"+body.data.id].sort());
    assert.notDeepEqual(images.objects.get("private/"+body.data.id),images.objects.get("shared-preview/"+body.data.id));
  }finally{db.close();}
});
test("shared previews reject embedded metadata and oversized dimensions",()=>{
  assert.equal(validSharedPreview(previewBytes),true);
  const withExif=new Uint8Array(previewBytes.length+8);
  withExif.set(previewBytes.slice(0,2));withExif.set([255,225,0,6,69,120,105,102],2);withExif.set(previewBytes.slice(2),10);
  assert.equal(validSharedPreview(withExif),false);
  const oversized=new Uint8Array(previewBytes);
  const sof=oversized.findIndex((value,index)=>value===255&&oversized[index+1]===192);
  assert.ok(sof>0);oversized[sof+7]=3;oversized[sof+8]=0;
  assert.equal(validSharedPreview(oversized),false);
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
