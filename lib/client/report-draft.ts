// Frontend-only form state, not Ayan's eventual API wire contract.
export const categories = ["Bags", "Electronics", "Keys", "Clothing", "Books", "Accessories", "Drinkware", "Other"] as const;
export const locations = ["Registration", "Main Hall", "Workshop Rooms", "Cafeteria", "Entrance", "Other"] as const;
export type ReportKind = "lost" | "found";
export type Draft = { title: string; category: string; color: string; description: string; location: string; occurredAt: string; privateClue: string };
export type DraftErrors = Partial<Record<keyof Draft, string>>;
export const emptyDraft: Draft = { title: "", category: "", color: "", description: "", location: "", occurredAt: "", privateClue: "" };
function validLocalDateTime(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!parts) return false;
  const [year, month, day, hour, minute] = parts.slice(1, 6).map(Number);
  const second = Number(parts[6] ?? 0);
  const date = new Date(value);
  return year >= 1 && date.getFullYear() === year && date.getMonth() === month - 1
    && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute
    && date.getSeconds() === second;
}
export function validateDraft(draft: Draft, kind: ReportKind): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = "Give the item a short name.";
  else if (draft.title.trim().length > 120) errors.title = "Keep the item name to 120 characters.";
  if (!categories.some(value => value === draft.category)) errors.category = "Choose an item category.";
  if (!draft.description.trim()) errors.description = "Add a few visible details.";
  else if (draft.description.trim().length > 2000) errors.description = "Keep the description to 2,000 characters.";
  if (!locations.some(value => value === draft.location)) errors.location = "Choose an event location.";
  if (!validLocalDateTime(draft.occurredAt)) errors.occurredAt = "Add a valid approximate date and time.";
  if (kind === "found") {
    if (!draft.privateClue.trim()) errors.privateClue = "Keep one identifying clue for staff to check.";
    else if (draft.privateClue.trim().length > 2000) errors.privateClue = "Keep the private clue to 2,000 characters.";
  }
  return errors;
}
export function validatePhoto(file: Pick<File, "size" | "type">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Choose a JPG, PNG, or WebP image.";
  if (file.size > 4 * 1024 * 1024) return "Choose an image no larger than 4 MB.";
  if (file.size === 0) return "This file is empty. Choose another image.";
  return null;
}
