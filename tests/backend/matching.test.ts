import {test} from "node:test";
import assert from "node:assert/strict";
import {canonicalColor,rankMatches,scorePair,featureTokens} from "../../lib/server/matching.ts";
import {publicReportResponse} from "../../shared/examples.ts";
import type {PublicReport} from "../../shared/api.ts";
const lost=publicReportResponse.data;
const found:PublicReport={...lost,id:crypto.randomUUID(),kind:"found",title:"Navy laptop bag",color:"navy",description:"Metallic zips",visible_features:["metallic zips"],occurred_at:"2026-11-01T11:05:00+05:30"};
test("synonym matching computes score independent of report ordering",()=>{
  assert.equal(canonicalColor("dark-blue"),canonicalColor("navy"));
  assert.ok(featureTokens({...found,description:"zippered"}).has("zipper"));
  assert.equal(scorePair(lost,found)?.score,scorePair(found,lost)?.score);
  assert.ok((scorePair(lost,found)?.score??0)>=80);
});
test("unrelated, recovered, reserved, same-kind and cross-event candidates are excluded",()=>{
  for(const change of [{category:"Drinkware"},{status:"recovered"},{status:"reserved"},{kind:"lost"},{event_id:"other-event"}] as Partial<PublicReport>[]){
    assert.equal(scorePair(lost,{...found,...change}),null);
  }
});
test("weaker place/time/color lower scores; impossible timeline is excluded",()=>{
  const base=scorePair(lost,found)!.score;
  assert.ok((scorePair(lost,{...found,location:"Entrance"})?.score??0)<base);
  assert.ok((scorePair(lost,{...found,occurred_at:"2026-11-03T11:05:00+05:30"})?.score??0)<base);
  assert.ok((scorePair(lost,{...found,color:"red"})?.score??0)<base);
  assert.equal(scorePair(lost,{...found,occurred_at:"2026-10-31T10:00:00+05:30"}),null);
});
test("missing appearance clues never manufacture a match; ordering and top-three limit are stable",()=>{
  const generic={...lost,title:"Bag",description:"Bag",color:null,visible_features:[]};
  assert.equal(scorePair(generic,{...generic,id:found.id,kind:"found"}),null);
  const candidates=Array.from({length:6},()=>({...found,id:crypto.randomUUID()}));
  const a=rankMatches(lost,candidates),b=rankMatches(lost,[...candidates].reverse());
  assert.equal(a.candidates.length,3);assert.deepEqual(a,b);
  assert.ok(a.score_label.includes("not a probability"));
});

test("an explicit phone cannot match headphones just because color, place and time agree",()=>{
  const phone:PublicReport={...lost,id:"phone",category:"Electronics",kind:"lost",title:"Black smartphone",
    color:"black",description:"Clear case with a cracked corner",visible_features:["clear case","cracked corner"]};
  const headphones:PublicReport={...phone,id:"headphones",kind:"found",title:"Black headphones",
    description:"Padded earcups and a folding headband",visible_features:["padded earcups","folding headband"]};
  assert.equal(scorePair(phone,headphones),null);
  assert.ok(scorePair(phone,{...headphones,title:"Mobile phone",description:"Clear case and cracked corner"}));
  assert.ok(scorePair({...phone,title:"Earbuds"},{...phone,id:"earbuds",kind:"found",title:"AirPods"}));
  // Unknown or mixed titles require actual shared visible details.
  assert.equal(scorePair(phone,{...headphones,title:"Electronic item"}),null);
  assert.equal(scorePair(phone,{...headphones,title:"Phone with headphones"}),null);
  assert.ok(scorePair(phone,{...phone,id:"generic",kind:"found",title:"Electronic item"}));
});

test("negated, mixed and uncertain color text is never reduced to a single color",()=>{
  for(const color of ["not blue","blue-green","blue and red","maybe navy","unknown","bluetooth"])
    assert.equal(canonicalColor(color),null,color);
  assert.equal(canonicalColor(" Navy blue "),"blue");
  assert.equal(canonicalColor("light-grey"),"gray");
});

test("unknown areas, generic words and color alone do not manufacture support",()=>{
  const unknown=scorePair({...lost,location:"Other"},{...found,location:"Other"});
  assert.equal(unknown?.reasons.find(reason=>reason.factor==="location")?.assessment,"unknown");
  const source={...lost,title:"Black phone",category:"Electronics" as const,color:"black",description:"Black plastic case",visible_features:[]};
  assert.equal(scorePair(source,{...source,id:"generic",kind:"found"}),null);
  const keys={...source,title:"Keys",category:"Keys" as const,description:"Keys",color:null};
  assert.equal(scorePair(keys,{...keys,id:"generic-keys",kind:"found"}),null);
  assert.equal(scorePair(lost,{...found,title:"Blue satchel",description:"Plain nylon",visible_features:["nylon"]}),null);
});

test("explicitly denied features and conflicting known colors cannot support a match",()=>{
  const source={...lost,description:"Canvas silver zipper",visible_features:["canvas","silver zipper"]};
  const denied={...found,description:"Not canvas, no silver zipper",visible_features:[]};
  assert.equal(scorePair(source,denied),null);
  assert.equal(scorePair(denied,source),null);
  assert.equal(scorePair(lost,{...found,color:"red"}),null);
  assert.ok(!featureTokens({...found,description:"No zipper",visible_features:[]}).has("zipper"));
});

test("duplicate report IDs cannot crowd out distinct candidates",()=>{
  const second={...found,id:"second"},third={...found,id:"third"};
  const result=rankMatches(lost,[found,found,found,second,third]);
  assert.equal(result.candidates.length,3);
  assert.equal(new Set(result.candidates.map(match=>match.candidate.id)).size,3);
});
