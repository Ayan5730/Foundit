import { performance } from "node:perf_hooks";
import { rankMatches } from "../lib/server/matching.ts";
import type { PublicReport } from "../shared/api.ts";
import { isMain, saveReport } from "./provider-tools.ts";

// Offline, fictional reports. No database, HTTP requests, provider calls or secrets.
export const base: PublicReport = {
  id: "query",
  event_id: "foundit-hackathon",
  kind: "lost",
  title: "Navy backpack",
  category: "Bags",
  color: "navy",
  description: "Silver zipper canvas",
  visible_features: ["silver zipper", "canvas"],
  location: "Main Hall",
  occurred_at: "2026-11-01T04:30:00Z",
  status: "active",
  created_at: "2026-11-01T05:00:00Z",
};
type Patch = Partial<PublicReport>;
export type Scenario = {
  name: string;
  query?: Patch;
  candidate?: Patch;
  relevant: boolean;
  distractors?: Patch[];
};
export const cases: Scenario[] = [
  { name: "Exact visible attributes", relevant: true },
  {
    name: "Navy / dark blue wording",
    candidate: { color: "dark blue", title: "Dark blue laptop bag" },
    relevant: true,
  },
  {
    name: "Metallic zip synonym",
    candidate: {
      description: "Canvas metallic zip",
      visible_features: ["metallic zip", "canvas"],
    },
    relevant: true,
  },
  {
    name: "Grey / gray wording",
    query: { color: "grey" },
    candidate: { color: "gray" },
    relevant: true,
  },
  {
    name: "Missing color but shared features",
    query: { color: null },
    candidate: { color: null },
    relevant: true,
  },
  {
    name: "Different event area, rich features",
    candidate: { location: "Registration" },
    relevant: true,
  },
  {
    name: "Found two hours after loss",
    candidate: { occurred_at: "2026-11-01T06:30:00Z" },
    relevant: true,
  },
  {
    name: "Distractors in other category and event",
    distractors: [{ category: "Keys" }, { event_id: "another-event" }],
    relevant: true,
  },
  {
    name: "Wrong category",
    candidate: { category: "Electronics" },
    relevant: false,
  },
  {
    name: "Wrong event",
    candidate: { event_id: "another-event" },
    relevant: false,
  },
  { name: "Same report kind", candidate: { kind: "lost" }, relevant: false },
  {
    name: "Reserved candidate",
    candidate: { status: "reserved" },
    relevant: false,
  },
  {
    name: "Recovered candidate",
    candidate: { status: "recovered" },
    relevant: false,
  },
  {
    name: "Found three hours before loss",
    candidate: { occurred_at: "2026-11-01T01:30:00Z" },
    relevant: false,
  },
  {
    name: "Unknown color and no visible overlap",
    query: {
      title: "Item",
      description: "",
      visible_features: [],
      color: null,
    },
    candidate: {
      title: "Object",
      description: "",
      visible_features: [],
      color: null,
    },
    relevant: false,
  },
  {
    name: "Similar unrelated blue bag at same place/time",
    candidate: {
      title: "Blue satchel",
      description: "Plain nylon",
      visible_features: ["nylon"],
    },
    relevant: false,
  },
  // Held-out cases fixed before running; no weights/thresholds tuned from results.
  { name: "Uppercase color", candidate: { color: "BLUE" }, relevant: true },
  {
    name: "Hyphenated dark-blue",
    candidate: { color: "dark-blue" },
    relevant: true,
  },
  {
    name: "Found one hour before estimated loss",
    candidate: { occurred_at: "2026-11-01T03:30:00Z" },
    relevant: true,
  },
  {
    name: "True candidate among three distractors",
    distractors: [
      { color: "red", description: "Nylon", visible_features: [] },
      { category: "Keys" },
      { status: "reserved" },
    ],
    relevant: true,
  },
  { name: "Inactive query", query: { status: "recovered" }, relevant: false },
  {
    name: "Conflicting color but otherwise indistinguishable",
    candidate: { color: "red" },
    relevant: false,
  },
  {
    name: "Five days apart, otherwise identical",
    candidate: { occurred_at: "2026-11-06T04:30:00Z" },
    relevant: false,
  },
  {
    name: "New item wording with missing color",
    query: {
      title: "Rucksack",
      description: "Buckled waxed cloth",
      visible_features: [],
      color: null,
    },
    candidate: {
      title: "Backpack",
      description: "Fastened treated fabric",
      visible_features: [],
      color: null,
    },
    relevant: true,
  },
];
export function scenarioReports(item: Scenario) {
  const query = { ...base, ...item.query };
  const candidate = {
    ...base,
    id: "candidate",
    kind: "found" as const,
    ...item.candidate,
  };
  const distractors = (item.distractors ?? []).map((patch, i) => ({
    ...candidate,
    ...patch,
    id: "distractor-" + i,
  }));
  return { query, candidates: [candidate, ...distractors] };
}
export function evaluateScenario(item: Scenario, index: number, query: PublicReport, candidates: PublicReport[]) {
  const start = performance.now();
  const result = rankMatches(query, candidates);
  return {
    case: index + 1,
    split: index < 16 ? "development" : "held_out",
    name: item.name,
    relevant: item.relevant,
    returned: result.candidates.map((row) => ({
      id: row.candidate.id,
      score: row.score,
    })),
    retrieved:
      item.relevant &&
      result.candidates.some((row) => row.candidate.id === "candidate"),
    false_suggestions: result.candidates.filter(
      (row) => row.candidate.id !== "candidate" || !item.relevant,
    ).length,
    matcher_ms: Number((performance.now() - start).toFixed(3)),
  };
}
export function baselineRows() {
  return cases.map((item, index) => {
    const { query, candidates } = scenarioReports(item);
    return evaluateScenario(item, index, query, candidates);
  });
}
export function summarize(subset: ReturnType<typeof baselineRows>) {
  const positives = subset.filter((row) => row.relevant).length;
  return {
    scenarios: subset.length,
    positive_queries: positives,
    top3_hits: subset.filter((row) => row.retrieved).length,
    negative_queries: subset.length - positives,
    negative_queries_with_suggestions: subset.filter(
      (row) => !row.relevant && row.returned.length,
    ).length,
    false_suggestions: subset.reduce((n, row) => n + row.false_suggestions, 0),
  };
}
if (isMain(import.meta.url)) {
  const rows = baselineRows();
  await saveReport("matching-evaluation.json", {
      scope:
        "24 synthetic offline scenarios; not real-world accuracy. Fixed heuristic, no AI calls.",
      provider_comparison:
        "Not measured: credentials and live normalization outputs unavailable.",
      total: summarize(rows),
      development: summarize(rows.slice(0, 16)),
      held_out: summarize(rows.slice(16)),
      provider_calls: 0,
      rows,
  });
}
