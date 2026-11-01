import type { Match, Matches, PublicReport, MatchReason } from "../../shared/api.ts";
const stop=new Set("a an the and or with near outside last seen lost found at in on of to it has is was have bag bags backpack backpacks rucksack satchel laptop laptops item items object objects device devices electronic electronics phone phones smartphone smartphones iphone mobile cell headphones headphone earbuds airpods case cover shell plain plastic navy blue dark light pale bright main hall registration silver gray grey black white red green yellow orange pink purple brown beige gold maroon teal no not without lacks missing".split(" "));
for(const word of "key keys clothing clothes shirt shirts book books accessory accessories drinkware bottle bottles cup cups mug mugs wallet wallets purse purses watch watches camera cameras tablet tablets ipad charger chargers".split(" "))stop.add(word);
export function canonicalColor(value:string|null):string|null {
  if(!value?.trim()) return null;
  const text=value.toLowerCase().replace(/[-_]/g," ").replace(/\s+/g," ").trim();
  // Only an explicit single color is evidence. Negations, multiple colors and
  // uncertain prose must never silently become an affirmative color match.
  const match=/^(?:(?:dark|light|pale|bright) )?(navy(?: blue)?|blue|grey|gray|black|white|red|green|yellow|orange|pink|purple|brown|beige|silver|gold|maroon|teal)$/.exec(text);
  if(!match)return null;
  if(match[1].startsWith("navy"))return "blue";
  return match[1]==="grey"?"gray":match[1];
}
function featureEvidence(report:Pick<PublicReport,"title"|"description"|"visible_features">):{positive:Set<string>;negative:Set<string>} {
  const positive=new Set<string>(),negative=new Set<string>();
  for(const field of [report.title,report.description,...report.visible_features]){
    const text=field.toLowerCase().replace(/\bmac\s?books?\b/g,"apple laptop")
      .replace(/\bmetallic\b/g,"silver")
      .replace(/\b(?:zippered|zippers?|zips?)\b/g,"zipper");
    for(const clause of text.split(/[.,;!?\n]|\bbut\b/)){
      let negated=false;
      for(const word of clause.match(/[\p{L}\p{N}]+/gu)??[]){
        if(["no","not","without","lacks","missing"].includes(word)){negated=true;continue;}
        if(!stop.has(word))(negated?negative:positive).add(word);
      }
    }
  }
  // Inconsistent user wording is not positive evidence either.
  for(const word of negative)positive.delete(word);
  return {positive,negative};
}
export function featureTokens(report:Pick<PublicReport,"title"|"description"|"visible_features">):Set<string> {
  return featureEvidence(report).positive;
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
  else if(left && right){return null;}
  else reasons.push({factor:"color",assessment:"unknown",text:"Color information is incomplete."});
  const sourceEvidence=featureEvidence(source),candidateEvidence=featureEvidence(candidate);
  const a=sourceEvidence.positive,b=candidateEvidence.positive;
  if([...a].some(word=>candidateEvidence.negative.has(word)) || [...b].some(word=>sourceEvidence.negative.has(word)))return null;
  const overlap=[...a].filter(word=>b.has(word)).length;
  const similarity=a.size && b.size ? overlap/new Set([...a,...b]).size : 0;
  score+=25*similarity;
  reasons.push({factor:"features",assessment:similarity>0?"supports":"unknown",text:similarity>0?"Reports share normalized public item details.":"No shared public item details were identified."});
  if(source.location==="Other" || candidate.location==="Other")reasons.push({factor:"location",assessment:"unknown",text:"A specific event area is missing."});
  else if(source.location===candidate.location){score+=20;reasons.push({factor:"location",assessment:"supports",text:"Both reports name the same event area."});}
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
  // Color, category and a busy event area alone cannot identify an item.
  if(score<55 || overlap===0)return null;
  return {candidate,score,reasons};
}
export function rankMatches(source:PublicReport,candidates:PublicReport[]):Matches {
  const seen=new Set<string>();
  return {report_id:source.id,candidates:candidates.map(row=>scorePair(source,row)).filter((row):row is Match=>row!==null)
    .sort((a,b)=>b.score-a.score || a.candidate.id.localeCompare(b.candidate.id))
    .filter(row=>{if(seen.has(row.candidate.id))return false;seen.add(row.candidate.id);return true;}).slice(0,3),
    score_label:"Heuristic similarity score; not a probability or proof of ownership."};
}
