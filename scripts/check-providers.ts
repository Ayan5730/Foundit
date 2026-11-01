import { readFile } from "node:fs/promises";
import { assist, recoveryGuidance, type Fetcher, type ProviderConfig } from "../lib/server/providers.ts";
import { configuration, isMain, measuredFetcher, providerConfig, saveReport } from "./provider-tools.ts";

export async function checkProviders(config: ProviderConfig, live = false, upstream?: Fetcher) {
  const configured = configuration(config);
  const required = ["openai", "cerebras"] as const;
  const measured = measuredFetcher(upstream);
  const results: Record<string, { status: string; source_count?: number }> = {};
  if (live) {
    if (configured.openai) {
      const photo = await readFile(new URL("./fixtures/fictional-bag.png", import.meta.url));
      const result = await assist({ OPENAI_API_KEY: config.OPENAI_API_KEY, OPENAI_MODEL: config.OPENAI_MODEL },
        "FICTIONAL TEST: describe only visible attributes of this illustrated item.",
        "data:image/png;base64," + photo.toString("base64"), measured.fetcher);
      results.openai = { status: result.providers.openai };
    }
    if (configured.cerebras) {
      const result = await assist({ CEREBRAS_API_KEY: config.CEREBRAS_API_KEY, CEREBRAS_MODEL: config.CEREBRAS_MODEL },
        "FICTIONAL TEST: navy canvas backpack with a silver zip, seen in Main Hall.", undefined, measured.fetcher);
      results.cerebras = { status: result.providers.cerebras };
    }
    if (configured.exa) {
      const result = await recoveryGuidance({ EXA_API_KEY: config.EXA_API_KEY }, measured.fetcher);
      results.exa = { status: result.status, source_count: result.sources.length };
    }
  }
  const missing = required.filter(name => !configured[name]);
  return {
    checked_at: new Date().toISOString(),
    mode: live ? "live_synthetic_connection_checks" : "configuration_only_no_calls",
    required_providers: required,
    optional_providers: ["exa"],
    status: !live ? "not_run" : missing.length ? "blocked_missing_configuration"
      : Object.values(results).every(result => result.status === "available") ? "passed" : "failed",
    configured, missing, results, requests: measured.requests,
    limits: "Connection/schema checks with fictional input; not extraction accuracy. Cost is reported only when supplied by a provider. No private report data is used.",
  };
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--live")) throw new Error("Usage: npm run providers:check -- [--live]");
  const report = await checkProviders(providerConfig(), args.includes("--live"));
  await saveReport("provider-check.json", report);
  if (args.includes("--live") && report.status !== "passed") process.exitCode = report.status.startsWith("blocked") ? 2 : 1;
}
