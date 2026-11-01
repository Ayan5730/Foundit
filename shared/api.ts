import { z } from "zod";

export const API_VERSION = "v1" as const;
export const EVENT = { id: "foundit-hackathon", name: "FoundIt Hackathon Help Desk" } as const;
export const CATEGORIES = ["Bags", "Electronics", "Keys", "Clothing", "Books", "Accessories", "Drinkware", "Other"] as const;
export const LOCATIONS = ["Registration", "Main Hall", "Workshop Rooms", "Cafeteria", "Entrance", "Other"] as const;
export const LIMITS = { title: 120, description: 2000, evidence: 2000, image_bytes: 4 * 1024 * 1024 } as const;
export const ReportKindSchema = z.enum(["lost", "found"]);
export const ReportStatusSchema = z.enum(["active", "reserved", "recovered"]);
export const ClaimStatusSchema = z.enum(["pending", "approved", "rejected", "recovered"]);
export type ReportKind = z.infer<typeof ReportKindSchema>;
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;
export type Success<T> = { data: T };
export type Failure = { error: { code: string; message: string; field_errors?: Record<string, string[]> } };
export type ApiResult<T> = Success<T> | Failure;
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
const reportFields = {
  kind: ReportKindSchema,
  title: z.string().trim().min(1).max(LIMITS.title),
  category: z.enum(CATEGORIES),
  color: optionalText(80),
  description: z.string().trim().min(1).max(LIMITS.description),
  visible_features: z.array(z.string().trim().min(1).max(80)).max(10),
  location: z.enum(LOCATIONS),
  occurred_at: z.string().datetime({ offset: true }),
};
export const CreateReportSchema = z.object({
  ...reportFields,
  client_request_id: z.string().uuid(),
  intake_id: z.string().uuid().nullable(),
  private_clue: optionalText(LIMITS.evidence),
}).strict().superRefine((value, ctx) => {
  if (value.kind === "found" && !value.private_clue) ctx.addIssue({code:"custom",path:["private_clue"],message:"A found item needs a private identifying clue."});
  if (value.kind === "lost" && value.private_clue !== null) ctx.addIssue({code:"custom",path:["private_clue"],message:"Lost reports do not include a finder reference clue."});
});
export type CreateReport = z.infer<typeof CreateReportSchema>;
export type PublicReport = {
  id: string; event_id: string; kind: ReportKind; title: string; category: typeof CATEGORIES[number];
  color: string | null; description: string; visible_features: string[];
  location: typeof LOCATIONS[number]; occurred_at: string;
  status: z.infer<typeof ReportStatusSchema>; created_at: string;
};
export const CreateClaimSchema = z.object({
  client_request_id: z.string().uuid(), lost_report_id: z.string().uuid(),
  found_report_id: z.string().uuid(), evidence: z.string().trim().min(1).max(LIMITS.evidence),
}).strict();
export type CreateClaim = z.infer<typeof CreateClaimSchema>;
export const ReviewSchema = z.object({
  decision: z.enum(["approved","rejected"]), note: optionalText(2000),
}).strict();
export const GuidanceRequestSchema = z.object({ organization: z.literal("rapid_metro") }).strict();
export type Claim = {
  id: string; lost_report_id: string; found_report_id: string; evidence: string;
  status: ClaimStatus; created_at: string; updated_at: string;
};
export type ClaimSummary = Omit<Claim, "evidence">;
export type MatchReason = { factor: "category"|"color"|"features"|"location"|"time"; assessment: "supports"|"conflicts"|"unknown"; text: string };
export type Match = { candidate: PublicReport; score: number; reasons: MatchReason[] };
export type Matches = { report_id: string; candidates: Match[]; score_label: string };
export type Suggestion = {
  title: string | null; category: typeof CATEGORIES[number] | null; color: string | null;
  visible_features: string[]; location: typeof LOCATIONS[number] | null; follow_up: string | null;
};
export type ProviderStatus = "available" | "unavailable" | "not_requested";
export type Intake = { id: string; media_id: string | null; suggestions: Suggestion; providers: { openai: ProviderStatus; cerebras: ProviderStatus } };
export type Guidance = {
  organization: "rapid_metro"; status: "available"|"no_sources"|"unavailable";
  retrieved_at: string; sources: { title: string; url: string; excerpt: string }[];
};
export type Bootstrap = {
  api_version: typeof API_VERSION; event: typeof EVENT;
  user: { id: string; display_name: string } | null;
  capabilities: { can_report: boolean; can_review: boolean };
  choices: { categories: readonly string[]; locations: readonly string[] };
  limits: typeof LIMITS; recovery_organizations: { id:"rapid_metro"; name:string }[];
};
export type StaffClaim = Claim & {
  lost_report: PublicReport; found_report: PublicReport; private_clue: string;
  media_ids: string[];
};
