import { handle } from "@/lib/server/application";
import { bindings,identity } from "@/lib/server/runtime";
import { isStaff } from "@/lib/server/bootstrap";
import { failure } from "@/lib/server/http";
export const dynamic="force-dynamic";
async function dispatch(request:Request){
  try{
    const config=bindings(),user=await identity();
    return await handle(request,{db:config.DB,bucket:config.BUCKET,
      actor:user?{id:user.userId,staff:isStaff(user,config.STAFF_USER_IDS)}:null,providers:config});
  }catch(error){return failure(error);}
}
export const GET=dispatch;
export const POST=dispatch;
