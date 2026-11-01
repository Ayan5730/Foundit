import type { Matches } from "../../shared/api.ts";
import { Store } from "./store.ts";
import { publicReport, type ReportRow } from "./reports.ts";
import { rankMatches } from "./matching.ts";

/** Scan bounded pages so an older valid match is not hidden by the newest 500 rows. */
export async function retrieveMatches(store:Store,source:ReportRow):Promise<Matches> {
  const report=publicReport(source);
  let result=rankMatches(report,[]),cursor="";
  if(source.status!=="active")return {...result,retrieval_complete:true};
  for(let page=0;page<20;page++){
    const rows=await store.all<ReportRow>("SELECT * FROM reports WHERE event_id=? AND category=? AND kind=? AND status='active' AND id>? ORDER BY id LIMIT 500",source.event_id,source.category,source.kind==="lost"?"found":"lost",cursor);
    result=rankMatches(report,[...result.candidates.map(match=>match.candidate),...rows.map(publicReport)]);
    if(rows.length<500)return {...result,retrieval_complete:true};
    cursor=rows[rows.length-1].id;
  }
  return {...result,retrieval_complete:false};
}
