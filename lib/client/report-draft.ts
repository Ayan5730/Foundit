import {
  CATEGORIES,
  LOCATIONS,
  CreateReportSchema,
  type CreateReport,
} from "../../shared/api.ts";
// UI state is mapped explicitly to the agreed wire contract before submission.
export const categories = CATEGORIES;
export const locations = LOCATIONS;
export type ReportKind = "lost" | "found";
export type Draft = {
  title: string;
  category: string;
  color: string;
  description: string;
  location: string;
  occurredAt: string;
  privateClue: string;
};
export type DraftErrors = Partial<Record<keyof Draft, string>>;
export const emptyDraft: Draft = {
  title: "",
  category: "",
  color: "",
  description: "",
  location: "",
  occurredAt: "",
  privateClue: "",
};
function validLocalDateTime(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!parts) return false;
  const [year, month, day, hour, minute] = parts.slice(1, 6).map(Number);
  const second = Number(parts[6] ?? 0);
  const date = new Date(value + "Z");
  return (
    year >= 1 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}
export function validateDraft(draft: Draft, kind: ReportKind): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = "Give the item a short name.";
  else if (draft.title.trim().length > 120)
    errors.title = "Keep the item name to 120 characters.";
  if (!categories.some((value) => value === draft.category))
    errors.category = "Choose an item category.";
  if (!draft.description.trim())
    errors.description = "Add a few visible details.";
  else if (draft.description.trim().length > 2000)
    errors.description = "Keep the description to 2,000 characters.";
  if (!locations.some((value) => value === draft.location))
    errors.location = "Choose an event location.";
  if (!validLocalDateTime(draft.occurredAt))
    errors.occurredAt = "Add a valid approximate date and time.";
  if (kind === "found") {
    if (!draft.privateClue.trim())
      errors.privateClue = "Keep one identifying clue for staff to check.";
    else if (draft.privateClue.trim().length > 2000)
      errors.privateClue = "Keep the private clue to 2,000 characters.";
  }
  return errors;
}
export function validatePhoto(
  file: Pick<File, "size" | "type">,
): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPG, PNG, or WebP image.";
  if (file.size > 4 * 1024 * 1024)
    return "Choose an image no larger than 4 MB.";
  if (file.size === 0) return "This file is empty. Choose another image.";
  return null;
}
export function toEventTimestamp(value: string): string {
  if (!validLocalDateTime(value))
    throw new Error("Add a valid event date and time.");
  return new Date(value + "+05:30").toISOString();
}
export function toCreateReport(
  draft: Draft,
  kind: ReportKind,
  requestId: string,
  intakeId: string | null,
  features: string[],
): CreateReport {
  return CreateReportSchema.parse({
    client_request_id: requestId,
    kind,
    title: draft.title.trim(),
    category: draft.category,
    color: draft.color.trim() || null,
    description: draft.description.trim(),
    visible_features: features,
    location: draft.location,
    occurred_at: toEventTimestamp(draft.occurredAt),
    intake_id: intakeId,
    private_clue: kind === "found" ? draft.privateClue.trim() : null,
  });
}
