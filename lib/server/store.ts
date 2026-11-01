import { ApiError } from "./http.ts";
export class Store {
  readonly db:D1Database;
  constructor(db:D1Database) { this.db=db; }
  statement(sql:string,...args:unknown[]) { return this.db.prepare(sql).bind(...args); }
  one<T>(sql:string,...args:unknown[]):Promise<T|null> { return this.statement(sql,...args).first<T>(); }
  async all<T>(sql:string,...args:unknown[]):Promise<T[]> { return (await this.statement(sql,...args).all<T>()).results; }
  run(sql:string,...args:unknown[]) { return this.statement(sql,...args).run(); }
  batch(items:Array<[string,...unknown[]]>) { return this.db.batch(items.map(([sql,...args])=>this.statement(sql,...args))); }
}
export type Actor = { id:string; staff:boolean };
export function requireActor(actor:Actor|null):Actor { if(!actor) throw new ApiError(401,"sign_in_required","Sign in to continue."); return actor; }
export function requireStaff(actor:Actor|null):Actor { const user=requireActor(actor); if(!user.staff) throw new ApiError(403,"staff_required","Staff access is required."); return user; }
export function requireOwner(ownerId:string,actor:Actor) { if(ownerId!==actor.id && !actor.staff) throw new ApiError(404,"not_found","Record not found."); }
export async function payloadHash(value:unknown):Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value))))).map(n=>n.toString(16).padStart(2,"0")).join("");
}
export function constraint(error:unknown):boolean { return error instanceof Error && /unique constraint|constraint failed/i.test(error.message); }
