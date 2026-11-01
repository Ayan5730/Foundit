import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Fetcher, ProviderConfig } from "../lib/server/providers.ts";

export function isMain(url: string): boolean {
  return Boolean(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === url);
}

export function providerConfig(): ProviderConfig {
  const names = ["OPENAI_API_KEY", "OPENAI_MODEL", "CEREBRAS_API_KEY", "CEREBRAS_MODEL", "EXA_API_KEY"] as const;
  return Object.fromEntries(names.map(name => [name, process.env[name]?.trim() || undefined]));
}

export function configuration(config: ProviderConfig) {
  return {
    openai: Boolean(config.OPENAI_API_KEY && config.OPENAI_MODEL),
    cerebras: Boolean(config.CEREBRAS_API_KEY && config.CEREBRAS_MODEL),
    exa: Boolean(config.EXA_API_KEY),
  };
}

type Metric = {
  provider: "openai" | "cerebras" | "exa";
  status: number | null;
  duration_ms: number;
  usage: Record<string, number>;
};

// Only numeric usage counters are retained. Never retain headers, prompts,
// response text, model identifiers, cookies or provider error diagnostics.
export function measuredFetcher(upstream: Fetcher = fetch) {
  const requests: Metric[] = [];
  const fetcher: Fetcher = async (input, init) => {
    const host = new URL(input).hostname;
    const provider = host === "api.openai.com" ? "openai"
      : host === "api.cerebras.ai" ? "cerebras"
        : host === "api.exa.ai" ? "exa" : null;
    if (!provider) throw new Error("Unexpected provider destination.");
    const start = performance.now();
    const metric: Metric = { provider, status: null, duration_ms: 0, usage: {} };
    try {
      const response = await upstream(input, init);
      metric.status = response.status;
      try {
        const body = await response.clone().json() as Record<string, unknown>;
        const usage = body.usage;
        if (usage && typeof usage === "object") {
          const counters = usage as Record<string, unknown>;
          for (const name of ["input_tokens", "output_tokens", "total_tokens", "prompt_tokens", "completion_tokens"]) {
            const value = counters[name];
            if (typeof value === "number" && Number.isFinite(value) && value >= 0) metric.usage[name] = value;
          }
        }
        const cost = body.costDollars;
        if (cost && typeof cost === "object" && "total" in cost &&
            typeof cost.total === "number" && Number.isFinite(cost.total) && cost.total >= 0) {
          metric.usage.reported_cost_usd = cost.total;
        }
      } catch { /* A malformed provider body is handled by the existing adapter. */ }
      return response;
    } finally {
      metric.duration_ms = Math.round(performance.now() - start);
      requests.push(metric);
    }
  };
  return { fetcher, requests };
}

export async function saveReport(name: string, report: unknown) {
  const text = JSON.stringify(report, null, 2) + "\n";
  await mkdir(new URL("../outputs/", import.meta.url), { recursive: true });
  await writeFile(new URL("../outputs/" + name, import.meta.url), text);
  console.log(text);
}
