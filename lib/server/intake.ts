import { Buffer } from "node:buffer";
import { LIMITS, type Intake } from "../../shared/api.ts";
import { ApiError } from "./http.ts";
import { assist,type ProviderConfig,type Fetcher } from "./providers.ts";
import { Store,type Actor } from "./store.ts";
export async function boundedBody(request:Request,maxBytes:number):Promise<ArrayBuffer>{
  if(Number(request.headers.get("content-length"))>maxBytes)throw new ApiError(413,"body_too_large","The request is too large.");
  const reader=request.body?.getReader();if(!reader)return new ArrayBuffer(0);
  const chunks:Uint8Array[]=[];let total=0;
  try{while(true){const next=await reader.read();if(next.done)break;total+=next.value.byteLength;
    if(total>maxBytes){await reader.cancel();throw new ApiError(413,"body_too_large","The request is too large.");}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes.buffer;
}
export function imageType(bytes:Uint8Array):string|null {
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
  if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return "image/png";
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "image/webp";
  return null;
}
// Canvas encoders can add standard JFIF/ICC/Adobe segments after re-encoding.
// Remove those segments from the shared copy; reject EXIF, comments and
// unfamiliar application segments instead of storing their private metadata.
export function sanitizedSharedPreview(bytes:Uint8Array):Uint8Array|null {
  if(bytes.length<16||bytes.length>LIMITS.shared_preview_bytes||bytes[0]!==255||bytes[1]!==216)return null;
  const parts:Uint8Array[]=[bytes.subarray(0,2)];
  let offset=2,hasDimensions=false,hasScan=false;
  while(offset<bytes.length){
    const markerStart=offset;
    if(bytes[offset++]!==255)return null;
    while(bytes[offset]===255)offset++;
    if(offset>=bytes.length)return null;
    const marker=bytes[offset++];
    if(marker===217){
      if(!hasDimensions||!hasScan||offset!==bytes.length)return null;
      parts.push(bytes.subarray(markerStart,offset));
      const size=parts.reduce((sum,part)=>sum+part.length,0);
      const safe=new Uint8Array(size);let write=0;
      for(const part of parts){safe.set(part,write);write+=part.length;}
      return safe;
    }
    if(![192,193,194,196,218,219,221,224,226,238].includes(marker)||offset+2>bytes.length)return null;
    const length=bytes[offset]*256+bytes[offset+1];
    if(length<2||offset+length>bytes.length)return null;
    const payload=offset+2,end=offset+length;
    if(marker===224&&!(length>=7&&[74,70,73,70,0].every((value,index)=>bytes[payload+index]===value)))return null;
    if(marker===226&&!(length>=16&&[73,67,67,95,80,82,79,70,73,76,69,0].every((value,index)=>bytes[payload+index]===value)))return null;
    if(marker===238&&!(length>=7&&[65,100,111,98,101].every((value,index)=>bytes[payload+index]===value)))return null;
    if(marker===192||marker===193||marker===194){
      if(hasDimensions||length<11||bytes[payload]!==8)return null;
      const height=bytes[payload+1]*256+bytes[payload+2],width=bytes[payload+3]*256+bytes[payload+4];
      const components=bytes[payload+5];
      if(width<1||height<1||width>720||height>720||components<1||components>4||length!==8+3*components)return null;
      hasDimensions=true;
    }
    if(marker===218){
      if(!hasDimensions||length<8||length!==6+2*bytes[payload])return null;
      hasScan=true;
    }
    if(marker!==224&&marker!==226&&marker!==238)parts.push(bytes.subarray(markerStart,end));
    offset=end;
    if(marker===218){
      const scanStart=offset;
      while(offset+1<bytes.length){
        if(bytes[offset]!==255){offset++;continue;}
        const next=bytes[offset+1];
        if(next===0||next>=208&&next<=215){offset+=2;continue;}
        if(next===255){offset++;continue;}
        break;
      }
      parts.push(bytes.subarray(scanStart,offset));
    }
  }
  return null;
}
export function validSharedPreview(bytes:Uint8Array):boolean {
  return sanitizedSharedPreview(bytes)!==null;
}
export async function rateLimit(store:Store,actor:Actor,now=Date.now()) {
  const key=actor.id+":"+Math.floor(now/60000),expires=new Date(now+120000).toISOString();
  await store.run("DELETE FROM rate_limits WHERE expires_at < ?",new Date(now).toISOString());
  const result=await store.one<{count:number}>("INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",key,expires);
  if(!result || result.count>10)throw new ApiError(429,"rate_limited","Too many assistance requests. Try again in a minute.");
}
export async function createIntake(request:Request,store:Store,bucket:R2Bucket|undefined,actor:Actor,config:ProviderConfig,fetcher?:Fetcher):Promise<Intake>{
  if(!(request.headers.get("content-type")??"").startsWith("multipart/form-data"))throw new ApiError(422,"invalid_body","Use multipart form data for intake.");
  let form:FormData;
  try{form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:await boundedBody(request,LIMITS.image_bytes+LIMITS.shared_preview_bytes+65536)}).formData();}
  catch(error){if(error instanceof ApiError)throw error;throw new ApiError(422,"invalid_body","The form data could not be read.");}
  const allowed=new Set(["kind","description","photo","shared_preview"]);
  for(const key of form.keys()){if(!allowed.has(key)||form.getAll(key).length!==1)throw new ApiError(422,"invalid_field","Intake accepts kind, description, a photo and an optional shared preview.");}
  const kind=form.get("kind"),description=form.get("description"),photo=form.get("photo"),preview=form.get("shared_preview");
  if(!["lost","found"].includes(String(kind))||typeof description!=="string"||description.length>2000)
    throw new ApiError(422,"invalid_intake","Provide kind and a description of up to 2,000 characters.");
  if(!description.trim()&&!photo)throw new ApiError(422,"invalid_intake","Provide a description or photo.");
  let bytes:Uint8Array|undefined,previewBytes:Uint8Array|undefined,contentType:string|null=null;
  if(photo!==null){
    if(typeof photo==="string"||!photo.size||photo.size>LIMITS.image_bytes)throw new ApiError(422,"invalid_photo","Choose an image up to 4 MB.");
    bytes=new Uint8Array(await photo.arrayBuffer());contentType=imageType(bytes);
    if(!contentType||photo.type!==contentType)throw new ApiError(422,"invalid_photo","Choose a JPG, PNG or WebP image with matching content.");
    if(!bucket)throw new ApiError(503,"storage_unavailable","Image storage is not configured.");
  }
  if(preview!==null){
    if(!bytes||typeof preview==="string"||!preview.size||preview.size>LIMITS.shared_preview_bytes||preview.type!=="image/jpeg")
      throw new ApiError(422,"invalid_preview","Share a JPG item preview no larger than 512 KB with its private photo.");
    previewBytes=sanitizedSharedPreview(new Uint8Array(await preview.arrayBuffer()))??undefined;
    if(!previewBytes)throw new ApiError(422,"invalid_preview","The shared preview must be a small JPG without private metadata. Keep the photo private or choose another.");
  }
  await rateLimit(store,actor);
  const id=crypto.randomUUID(),objectKey=bytes?"private/"+id:null,previewKey=previewBytes?"shared-preview/"+id:null;
  try{
    if(bytes&&bucket&&objectKey)await bucket.put(objectKey,bytes,{httpMetadata:{contentType:contentType!}});
    if(previewBytes&&bucket&&previewKey)await bucket.put(previewKey,previewBytes,{httpMetadata:{contentType:"image/jpeg"}});
    const result=await assist(config,description,bytes?"data:"+contentType+";base64,"+Buffer.from(bytes).toString("base64"):undefined,fetcher);
    await store.run("INSERT INTO intakes (id,owner_id,object_key,content_type,shared_preview_key,suggestions,providers,created_at) VALUES (?,?,?,?,?,?,?,?)",
      id,actor.id,objectKey,contentType,previewKey,JSON.stringify(result.suggestions),JSON.stringify(result.providers),new Date().toISOString());
    return {id,media_id:objectKey?id:null,...result};
  }catch(error){
    if(objectKey&&bucket)await bucket.delete(objectKey).catch(()=>{});
    if(previewKey&&bucket)await bucket.delete(previewKey).catch(()=>{});
    throw error;
  }
}
