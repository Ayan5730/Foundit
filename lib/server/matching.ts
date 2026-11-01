import type { Match, Matches, PublicReport, MatchReason } from "../../shared/api.ts";
const stop=new Set("a an the and or with near outside last seen lost found at in on of to it has bag bags backpack laptop navy blue dark main hall registration silver".split(" "));
// Silver is retained as a material clue below; colors are otherwise scored separately.
stop.delete("silver");
export function canonicalColor(value:string|null):string|null {
  if(!value?.trim()) return null;
  const text=value.toLowerCase().replace(/[-_]/g," ").trim();
  if(/navy|dark blue|blue/.test(text))return "blue";
  if(/grey|gray/.test(text))return "gray";
  return text;
}
export function featureTokens(report:Pick<PublicReport,"title"|"description"|"visible_features">):Set<string> {
  const text=[report.title,report.description,...report.visible_features].join(" ").toLowerCase()
    .replace(/metallic/g,"silver").replace(/\b(?:zippered|zippers?|zips?)\b/g,"zipper");
  return new Set((text.match(/[a-z0-9]+/g)??[]).filter(word=>!stop.has(word)));
}
// A broad category such as Electronics can contain unrelated objects. Only use
// an explicit, unambiguous item type from each title to rule out a candidate;
// generic or mixed titles keep the existing similarity calculation.
const electronicTypes = [
  /\b(?:smartphones?|iphones?|cellphones?|cell phones?|mobile phones?|phones?)\b/i,
  /\b(?:headphones?|headsets?|earbuds?|earphones?|airpods?|air pods)\b/i,
  /\b(?:laptops?|macbooks?|chromebooks?|notebook computers?)\b/i,
  /\b(?:tablets?|ipads?)\b/i,
  /\b(?:cameras?|dslrs?)\b/i,
  /\b(?:smartwatches?|watches?)\b/i,
  /\b(?:chargers?|power ?banks?)\b/i,
] as const;
function explicitElectronicType(title:string):number|null {
  const matches=electronicTypes.flatMap((pattern,index)=>pattern.test(title)?[index]:[]);
  return matches.length===1?matches[0]:null;
}
export function scorePair(source:PublicReport,candidate:PublicReport):Match|null {
  if(source.id===candidate.id || source.kind===candidate.kind || source.category!==candidate.category ||
    source.event_id!==candidate.event_id || source.status!=="active" || candidate.status!=="active")return null;
  if(source.category==="Electronics"){
    const sourceType=explicitElectronicType(source.title),candidateType=explicitElectronicType(candidate.title);
    if(sourceType!==null && candidateType!==null && sourceType!==candidateType)return null;
  }
  const reasons:MatchReason[]=[{factor:"category",assessment:"supports",text:"Same item category."}];
  let score=25;
  const left=canonicalColor(source.color),right=canonicalColor(candidate.color);
  if(left && right && left===right){score+=15;reasons.push({factor:"color",assessment:"supports",text:"Colors belong to the same color family."});}
  else if(left && right){score-=20;reasons.push({factor:"color",assessment:"conflicts",text:"Reported colors differ."});}
  else reasons.push({factor:"color",assessment:"unknown",text:"Color information is incomplete."});
  const a=featureTokens(source),b=featureTokens(candidate);
  const overlap=[...a].filter(word=>b.has(word)).length;
  const similarity=a.size && b.size ? overlap/new Set([...a,...b]).size : 0;
  score+=25*similarity;
  reasons.push({factor:"features",assessment:similarity>0?"supports":"unknown",text:similarity>0?"Descriptions share normalized visible details.":"No shared visible details were identified."});
  if(source.location===candidate.location){score+=20;reasons.push({factor:"location",assessment:"supports",text:"Both reports name the same event area."});}
  else reasons.push({factor:"location",assessment:"conflicts",text:"Different event areas were reported."});
  const lost=source.kind==="lost"?source:candidate,found=source.kind==="found"?source:candidate;
  const diff=Date.parse(found.occurred_at)-Date.parse(lost.occurred_at);
  if(Number.isFinite(diff)){
    score+=15*Math.max(0,1-Math.abs(diff)/86400000);
    if(diff < -7200000) score=Math.min(score,40);
    reasons.push({factor:"time",assessment:diff < -7200000 || Math.abs(diff)>=86400000?"conflicts":"supports",
      text:diff < -7200000?"The found time predates the loss by more than two hours.":Math.abs(diff)>=86400000?"Reported times are at least a day apart.":"Reported times are within a day."});
  }else reasons.push({factor:"time",assessment:"unknown",text:"Time information is incomplete."});
  score=Math.max(0,Math.min(100,Math.round(score)));
  if(score<55 || !(left && right && left===right || overlap>0))return null;
  return {candidate,score,reasons};
}
export function rankMatches(source:PublicReport,candidates:PublicReport[]):Matches {
  return {report_id:source.id,candidates:candidates.map(row=>scorePair(source,row)).filter((row):row is Match=>row!==null)
    .sort((a,b)=>b.score-a.score || a.candidate.id.localeCompare(b.candidate.id)).slice(0,3),
    score_label:"Heuristic similarity score; not a probability or proof of ownership."};
}
