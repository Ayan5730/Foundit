import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {database,bucket} from "./helpers.ts";
import {handle,type Resources} from "../../lib/server/application.ts";
import {sanitizedSharedPreview,validSharedPreview} from "../../lib/server/intake.ts";
import {validImage} from "../../lib/server/image-validation.ts";
const actor={id:"uploader",staff:false};
const previewBytes=new Uint8Array(readFileSync(new URL("../fixtures/fictional-bag-preview.jpg",import.meta.url)));
const canvasPreviewBytes=new Uint8Array(readFileSync(new URL("../fixtures/browser-canvas-preview.jpg",import.meta.url)));
const progressivePreviewBytes=new Uint8Array(readFileSync(new URL("../fixtures/progressive-preview.jpg",import.meta.url)));
const pngBytes=new Uint8Array(readFileSync(new URL("../../scripts/fixtures/fictional-bag.png",import.meta.url)));
function intake(photo?:File,extra?:[string,string],sharedPreview?:File):Request {
  const form=new FormData();form.set("kind","found");form.set("description","Blue bag");
  if(photo)form.set("photo",photo);if(extra)form.set(...extra);if(sharedPreview)form.set("shared_preview",sharedPreview);
  return new Request("https://foundit.test/api/v1/intake",{method:"POST",body:form});
}
test("manual/degraded intake persists owned private photo without configured AI or fake suggestions",async()=>{
  const {db,d1}=database(),images=bucket();const resources:Resources={db:d1,bucket:images.binding,actor,providers:{}};
  try{
    const png=new File([pngBytes],"test.png",{type:"image/png"});
    const response=await handle(intake(png),resources);assert.equal(response.status,201);
    const body=await response.json() as {data:{id:string;media_id:string;providers:{openai:string;cerebras:string};suggestions:{title:null}}};
    assert.equal(body.data.suggestions.title,null);assert.equal(body.data.providers.openai,"not_requested");assert.equal(images.objects.size,1);
    assert.equal(body.data.id,body.data.media_id);
    const read=await handle(new Request("https://foundit.test/api/v1/media/"+body.data.media_id),resources);
    assert.equal(read.status,200);assert.equal((await read.arrayBuffer()).byteLength,pngBytes.length);
  }finally{db.close();}
});
test("provider requests require explicit assistance consent even when credentials exist",async()=>{
  const {db,d1}=database(),images=bucket();let calls=0;
  const resources:Resources={db:d1,bucket:images.binding,actor,providers:{CEREBRAS_API_KEY:"mock",CEREBRAS_MODEL:"mock"},fetcher:async()=>{calls++;throw new Error("mock unavailable");}};
  try {
    const photo=new File([pngBytes],"test.png",{type:"image/png"});
    const preview=new File([canvasPreviewBytes],"preview.jpg",{type:"image/jpeg"});
    assert.equal((await handle(intake(photo,undefined,preview),resources)).status,201);
    assert.equal(calls,0);
    assert.equal((await handle(intake(undefined,["assist","false"]),resources)).status,201);
    assert.equal(calls,0);
    assert.equal((await handle(intake(photo,["assist","true"],preview),resources)).status,201);
    assert.equal(calls,1);
    assert.equal((await handle(intake(undefined,["assist","yes"]),resources)).status,422);
  }finally{db.close();}
});
test("intake rejects signature-only, truncated and excessive-dimension images",async()=>{
  const {db,d1}=database(),images=bucket();const resources:Resources={db:d1,bucket:images.binding,actor,providers:{}};
  try {
    const oversized=pngBytes.slice();new DataView(oversized.buffer).setUint32(16,20000);
    for(const bytes of [pngBytes.slice(0,8),pngBytes.slice(0,-1),oversized]) {
      assert.equal((await handle(intake(new File([bytes],"test.png",{type:"image/png"})),resources)).status,422);
    }
    assert.equal(images.objects.size,0);
  }finally{db.close();}
});
test("shared preview requires a private photo and is stored as a separate object",async()=>{
  const {db,d1}=database(),images=bucket();const resources:Resources={db:d1,bucket:images.binding,actor,providers:{}};
  try{
    const original=new File([pngBytes],"private.png",{type:"image/png"});
    const preview=new File([canvasPreviewBytes],"preview.jpg",{type:"image/jpeg"});
    assert.equal((await handle(intake(undefined,undefined,preview),resources)).status,422);
    assert.equal((await handle(intake(original,undefined,new File(["bad"],"preview.jpg",{type:"image/jpeg"})),resources)).status,422);
    const response=await handle(intake(original,undefined,preview),resources);assert.equal(response.status,201);
    const body=await response.json() as {data:{id:string}};
    assert.deepEqual([...images.objects.keys()].sort(),["private/"+body.data.id,"shared-preview/"+body.data.id].sort());
    assert.notDeepEqual(images.objects.get("private/"+body.data.id),images.objects.get("shared-preview/"+body.data.id));
    const stored=images.objects.get("shared-preview/"+body.data.id);
    assert.deepEqual(stored,sanitizedSharedPreview(canvasPreviewBytes));
    assert.equal(Buffer.from(stored!).includes(Buffer.from("ICC_PROFILE")),false);
    assert.deepEqual([...stored!.subarray(0,4)],[255,216,255,219]);
  }finally{db.close();}
});
test("browser canvas color profile is removed and multi-scan JPEG is accepted",()=>{
  for(const bytes of [previewBytes,canvasPreviewBytes,progressivePreviewBytes])assert.equal(validImage(bytes,"image/jpeg"),true);
  assert.equal(Buffer.from(canvasPreviewBytes).includes(Buffer.from("ICC_PROFILE")),true);
  assert.equal(validSharedPreview(canvasPreviewBytes),true);
  assert.ok(progressivePreviewBytes.reduce((count,byte,index)=>count+(byte===255&&progressivePreviewBytes[index+1]===218?1:0),0)>1);
  assert.equal(validSharedPreview(progressivePreviewBytes),true);
  assert.equal(validSharedPreview(sanitizedSharedPreview(canvasPreviewBytes)!),true);
});
test("shared previews reject embedded metadata and oversized dimensions",()=>{
  assert.equal(validSharedPreview(previewBytes),true);
  const withExif=new Uint8Array(previewBytes.length+8);
  withExif.set(previewBytes.slice(0,2));withExif.set([255,225,0,6,69,120,105,102],2);withExif.set(previewBytes.slice(2),10);
  assert.equal(validSharedPreview(withExif),false);
  const withComment=new Uint8Array(previewBytes.length+6);
  withComment.set(previewBytes.slice(0,2));withComment.set([255,254,0,4,65,66],2);withComment.set(previewBytes.slice(2),8);
  assert.equal(validSharedPreview(withComment),false);
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
