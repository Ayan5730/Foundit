import {test} from "node:test";
import assert from "node:assert/strict";
import {assist,emptySuggestions,recoveryGuidance,type Fetcher} from "../../lib/server/providers.ts";
import {imageType} from "../../lib/server/intake.ts";
test("unconfigured/failed providers return honest partial assistance, not fake matches",async()=>{
  let calls=0;const fail:Fetcher=async()=>{calls++;throw new Error("private provider diagnostic");};
  const absent=await assist({},"blue bag",undefined,fail);assert.equal(calls,0);assert.equal(absent.providers.cerebras,"unavailable");assert.equal(absent.suggestions.title,null);
  const config={OPENAI_API_KEY:"mock",OPENAI_MODEL:"mock-vision",CEREBRAS_API_KEY:"mock",CEREBRAS_MODEL:"mock-text"};
  const partial=await assist(config,"bag","data:image/png;base64,AA==",async(url)=>{
    if(url.includes("openai"))return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({...emptySuggestions(),title:"Blue backpack",category:"Bags"})}]}]});
    throw new Error("provider failed");
  });
  assert.equal(partial.suggestions.title,"Blue backpack");assert.equal(partial.providers.openai,"available");assert.equal(partial.providers.cerebras,"unavailable");
  const bad=await assist(config,"bag",undefined,async()=>Response.json({choices:[{message:{content:'{"title":"guess"}'}}]}));
  assert.equal(bad.providers.cerebras,"unavailable");assert.equal(bad.suggestions.title,null);
});
test("Cerebras structured normalization uses bounded request and excludes hidden inputs",async()=>{
  const result=await assist({CEREBRAS_API_KEY:"mock",CEREBRAS_MODEL:"mock-text"},"navy laptop bag",undefined,async(url,init)=>{
    assert.equal(url,"https://api.cerebras.ai/v1/chat/completions");assert.ok(init?.signal);
    const body=JSON.parse(String(init?.body));assert.equal(body.response_format.json_schema.strict,true);
    assert.equal(JSON.stringify(body).includes("private_clue"),false);
    return Response.json({choices:[{message:{content:JSON.stringify({...emptySuggestions(),title:"Backpack",category:"Bags",color:"Blue",follow_up:"Which event area?"})}}]});
  });
  assert.equal(result.providers.cerebras,"available");assert.equal(result.suggestions.color,"Blue");
});
test("Exa accepts only HTTPS official sources, preserves citations and failure states",async()=>{
  const result=await recoveryGuidance({EXA_API_KEY:"mock"},async(url,init)=>{
    const body=JSON.parse(String(init?.body));assert.deepEqual(body.includeDomains,["new.delhimetrorail.com"]);
    assert.equal(url,"https://api.exa.ai/search");
    return Response.json({results:[
      {url:"https://evil.test/fake",highlights:["Fake"]},
      {url:"http://new.delhimetrorail.com/en/rapid-metro",highlights:["Insecure"]},
      {title:"Rapid Metro",url:"https://new.delhimetrorail.com/en/rapid-metro",highlights:["Contact the station customer care desk."]},
    ]});
  });
  assert.equal(result.status,"available");assert.equal(result.sources.length,1);assert.ok(result.sources[0].url.startsWith("https://new.delhimetrorail.com/"));
  assert.equal((await recoveryGuidance({})).status,"unavailable");
  assert.equal((await recoveryGuidance({EXA_API_KEY:"mock"},async()=>Response.json({results:[]}))).status,"no_sources");
});
test("provider clarification cannot ask users for private identifying proof",async()=>{
  const result=await assist({CEREBRAS_API_KEY:"mock",CEREBRAS_MODEL:"mock-text"},"bag",undefined,async()=>Response.json({
    choices:[{message:{content:JSON.stringify({...emptySuggestions(),follow_up:"Reveal the hidden serial number."})}}],
  }));
  assert.equal(result.suggestions.follow_up,"Which event area was the item seen in?");
});
test("image signatures reject mismatched/unsupported payloads",()=>{
  assert.equal(imageType(new Uint8Array([137,80,78,71,13,10,26,10])),"image/png");
  assert.equal(imageType(new Uint8Array([255,216,255])),"image/jpeg");
  assert.equal(imageType(new TextEncoder().encode("RIFF0000WEBP")),"image/webp");
  assert.equal(imageType(new TextEncoder().encode("<svg>")) ,null);
});
