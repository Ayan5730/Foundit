import { test } from "node:test";
import assert from "node:assert/strict";
import { checkProviders } from "../../scripts/check-providers.ts";
import { emptySuggestions } from "../../lib/server/providers.ts";

test("OpenAI and Cerebras can pass the demo check without an Exa key or call", async () => {
  const destinations: string[] = [];
  const report = await checkProviders({
    OPENAI_API_KEY: "fictional-openai-key",
    OPENAI_MODEL: "fictional-openai-model",
    CEREBRAS_API_KEY: "fictional-cerebras-key",
    CEREBRAS_MODEL: "fictional-cerebras-model",
  }, true, async url => {
    destinations.push(url);
    if (url === "https://api.openai.com/v1/responses") {
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(emptySuggestions()) }] }] });
    }
    if (url === "https://api.cerebras.ai/v1/chat/completions") {
      return Response.json({ choices: [{ message: { content: JSON.stringify(emptySuggestions()) } }] });
    }
    throw new Error("Unexpected provider call");
  });

  assert.equal(report.status, "passed");
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.required_providers, ["openai", "cerebras"]);
  assert.deepEqual(destinations, ["https://api.openai.com/v1/responses", "https://api.cerebras.ai/v1/chat/completions"]);
  assert.equal(report.configured.exa, false);
  assert.equal(JSON.stringify(report).includes("fictional-openai-key"), false);
});
