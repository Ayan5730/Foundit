import { assist, type Fetcher, type ProviderConfig } from "../lib/server/providers.ts";
import type { PublicReport, Suggestion } from "../shared/api.ts";
import { baselineRows, cases, evaluateScenario, scenarioReports, summarize } from "./evaluate-matching.ts";
import { configuration, isMain, measuredFetcher, providerConfig, saveReport } from "./provider-tools.ts";

export function publicNormalizationInput(report: PublicReport): string {
  return JSON.stringify({ title: report.title, category: report.category, color: report.color,
    description: report.description, visible_features: report.visible_features, location: report.location });
}

export function applyNormalization(report: PublicReport, suggestion: Suggestion | null): PublicReport {
  if (!suggestion) return report;
  return { ...report, title: suggestion.title ?? report.title, category: suggestion.category ?? report.category,
    color: suggestion.color ?? report.color, location: suggestion.location ?? report.location,
    visible_features: suggestion.visible_features.length ? suggestion.visible_features : report.visible_features };
}

export async function evaluateProviders(config: ProviderConfig, live = false, upstream?: Fetcher) {
  const raw = baselineRows();
  const ready = configuration(config).cerebras;
  const measured = measuredFetcher(upstream);
  const cache = new Map<string, Suggestion | null>();
  let failures = 0;
  async function normalize(report: PublicReport) {
    const input = publicNormalizationInput(report);
    if (!cache.has(input)) {
      const result = await assist({ CEREBRAS_API_KEY: config.CEREBRAS_API_KEY, CEREBRAS_MODEL: config.CEREBRAS_MODEL },
        input, undefined, measured.fetcher);
      const available = result.providers.cerebras === "available";
      if (!available) failures++;
      cache.set(input, available ? result.suggestions : null);
    }
    return applyNormalization(report, cache.get(input) ?? null);
  }
  const normalized: typeof raw = [];
  if (live && ready) {
    // Sequential, bounded calls; repeated public inputs reuse the same output.
    // Both arms use identical scoring, inventory and the fixed 16/8 split.
    for (const [index, item] of cases.entries()) {
      const reports = scenarioReports(item);
      const query = await normalize(reports.query);
      const candidates: PublicReport[] = [];
      for (const candidate of reports.candidates) candidates.push(await normalize(candidate));
      normalized.push(evaluateScenario(item, index, query, candidates));
    }
  }
  const split = (rows: typeof raw) => ({ total: summarize(rows), development: summarize(rows.slice(0, 16)), held_out: summarize(rows.slice(16)) });
  return {
    checked_at: new Date().toISOString(),
    status: !live ? "not_run" : !ready ? "blocked_missing_configuration" : failures ? "partial_provider_failures" : "completed",
    scope: "Paired evaluation on the same 24 fictional cases; fixed matcher, no tuning or database writes. Synthetic evaluation applies editable suggestions automatically; product users still confirm them.",
    raw: split(raw), normalized: normalized.length ? split(normalized) : null,
    failed_normalizations: failures, requests: measured.requests,
    rows: raw.map((row, i) => ({ raw: row, normalized: normalized[i] ?? null })),
    limits: "Small developer-authored pools. Previously viewed held-out cases are not a fresh benchmark. Text-only Cerebras normalization; no photo-quality or real-world recovery claim. Failed calls retain raw fields and are explicitly counted. Token counters are actual returned usage; costs are not estimated.",
  };
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--live")) throw new Error("Usage: npm run evaluate:providers -- [--live]");
  const report = await evaluateProviders(providerConfig(), args.includes("--live"));
  await saveReport("provider-evaluation.json", report);
  if (args.includes("--live") && report.status !== "completed") process.exitCode = report.status.startsWith("blocked") ? 2 : 1;
}
