import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {readFileSync,readdirSync} from "node:fs";
class Statement {
  private values:SQLInputValue[]=[];
  readonly db:DatabaseSync;
  readonly sql:string;
  constructor(db:DatabaseSync,sql:string){this.db=db;this.sql=sql;}
  bind(...values:unknown[]){this.values=values as SQLInputValue[];return this;}
  async first<T>():Promise<T|null>{return (this.db.prepare(this.sql).get(...this.values) as T|undefined)??null;}
  async all<T>(){return {results:this.db.prepare(this.sql).all(...this.values) as T[],success:true,meta:{changes:0}};}
  execute(){const result=this.db.prepare(this.sql).run(...this.values);return {success:true,results:[],meta:{changes:Number(result.changes)}};}
  async run(){return this.execute();}
}
export function database() {
  const db=new DatabaseSync(":memory:");db.exec("PRAGMA foreign_keys=ON");
  const dir=new URL("../../drizzle/",import.meta.url);
  for(const file of readdirSync(dir).filter(name=>name.endsWith(".sql")).sort())db.exec(readFileSync(new URL(file,dir),"utf8"));
  const d1={
    prepare(sql:string){return new Statement(db,sql);},
    async batch(statements:Statement[]){
      db.exec("BEGIN");try{const results=statements.map(stmt=>stmt.execute());db.exec("COMMIT");return results;}catch(error){db.exec("ROLLBACK");throw error;}
    },
  } as unknown as D1Database;
  return {db,d1};
}
export function bucket() {
  const objects=new Map<string,Uint8Array>();
  const binding={
    async put(key:string,value:Uint8Array){objects.set(key,new Uint8Array(value));},
    async get(key:string){const value=objects.get(key);return value?{body:new Response(new Uint8Array(value).buffer).body}:null;},
    async delete(key:string){objects.delete(key);},
  } as unknown as R2Bucket;
  return {binding,objects};
}
