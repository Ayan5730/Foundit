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
export async function rateLimit(store:Store,actor:Actor,now=Date.now()) {
  const key=actor.id+":"+Math.floor(now/60000),expires=new Date(now+120000).toISOString();
  await store.run("DELETE FROM rate_limits WHERE expires_at < ?",new Date(now).toISOString());
  const result=await store.one<{count:number}>("INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",key,expires);
  if(!result || result.count>10)throw new ApiError(429,"rate_limited","Too many assistance requests. Try again in a minute.");
}
export async function createIntake(request:Request,store:Store,bucket:R2Bucket|undefined,actor:Actor,config:ProviderConfig,fetcher?:Fetcher):Promise<Intake>{
  if(!(request.headers.get("content-type")??"").startsWith("multipart/form-data"))throw new ApiError(422,"invalid_body","Use multipart form data for intake.");
  let form:FormData;
  try{form=await new Request(request.url,{method:"POST",headers:{"Content-Type":request.headers.get("content-type")!},body:await boundedBody(request,LIMITS.image_bytes+65536)}).formData();}
  catch(error){if(error instanceof ApiError)throw error;throw new ApiError(422,"invalid_body","The form data could not be read.");}
  const allowed=new Set(["kind","description","photo"]);
  for(const key of form.keys()){if(!allowed.has(key)||form.getAll(key).length!==1)throw new ApiError(422,"invalid_field","Intake accepts only kind, description and an optional photo.");}
  const kind=form.get("kind"),description=form.get("description"),photo=form.get("photo");
  if(!["lost","found"].includes(String(kind))||typeof description!=="string"||description.length>2000)
    throw new ApiError(422,"invalid_intake","Provide kind and a description of up to 2,000 characters.");
  if(!description.trim()&&!photo)throw new ApiError(422,"invalid_intake","Provide a description or photo.");
  let bytes:Uint8Array|undefined,contentType:string|null=null;
  if(photo!==null){
    if(typeof photo==="string"||!photo.size||photo.size>LIMITS.image_bytes)throw new ApiError(422,"invalid_photo","Choose an image up to 4 MB.");
    bytes=new Uint8Array(await photo.arrayBuffer());contentType=imageType(bytes);
    if(!contentType||photo.type!==contentType)throw new ApiError(422,"invalid_photo","Choose a JPG, PNG or WebP image with matching content.");
    if(!bucket)throw new ApiError(503,"storage_unavailable","Image storage is not configured.");
  }
  await rateLimit(store,actor);
  const id=crypto.randomUUID(),objectKey=bytes?"private/"+id:null;
  if(bytes&&bucket&&objectKey)await bucket.put(objectKey,bytes,{httpMetadata:{contentType:contentType!}});
  try{
    const result=await assist(config,description,bytes?"data:"+contentType+";base64,"+Buffer.from(bytes).toString("base64"):undefined,fetcher);
    await store.run("INSERT INTO intakes (id,owner_id,object_key,content_type,suggestions,providers,created_at) VALUES (?,?,?,?,?,?,?)",
      id,actor.id,objectKey,contentType,JSON.stringify(result.suggestions),JSON.stringify(result.providers),new Date().toISOString());
    return {id,media_id:objectKey?id:null,...result};
  }catch(error){if(objectKey&&bucket)await bucket.delete(objectKey).catch(()=>{});throw error;}
}
