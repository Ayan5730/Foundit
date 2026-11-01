import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const reports = sqliteTable("reports", {
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),clientRequestId:text("client_request_id").notNull(),
  payloadHash:text("payload_hash").notNull(),eventId:text("event_id").notNull(),kind:text("kind").notNull(),
  title:text("title").notNull(),category:text("category").notNull(),color:text("color"),
  description:text("description").notNull(),visibleFeatures:text("visible_features").notNull(),
  location:text("location").notNull(),occurredAt:text("occurred_at").notNull(),status:text("status").notNull(),
  createdAt:text("created_at").notNull(),hasSharedPreview:integer("has_shared_preview").notNull().default(0),
},t=>[uniqueIndex("reports_owner_request").on(t.ownerId,t.clientRequestId),index("reports_match_lookup").on(t.eventId,t.kind,t.category,t.status,t.createdAt,t.id),index("reports_owner_created").on(t.ownerId,t.createdAt,t.id)]);
export const intakes = sqliteTable("intakes",{
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),objectKey:text("object_key"),
  contentType:text("content_type"),sharedPreviewKey:text("shared_preview_key"),suggestions:text("suggestions").notNull(),providers:text("providers").notNull(),createdAt:text("created_at").notNull(),
});
export const privateReports = sqliteTable("private_reports",{
  reportId:text("report_id").primaryKey().references(()=>reports.id),privateClue:text("private_clue"),
  intakeId:text("intake_id").references(()=>intakes.id),
});
export const claims = sqliteTable("claims",{
  id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),clientRequestId:text("client_request_id").notNull(),
  payloadHash:text("payload_hash").notNull(),lostReportId:text("lost_report_id").notNull().references(()=>reports.id),
  foundReportId:text("found_report_id").notNull().references(()=>reports.id),evidence:text("evidence").notNull(),
  status:text("status").notNull(),createdAt:text("created_at").notNull(),updatedAt:text("updated_at").notNull(),
},t=>[uniqueIndex("claims_owner_request").on(t.ownerId,t.clientRequestId),index("claims_active_pair").on(t.ownerId,t.lostReportId,t.foundReportId,t.status),index("claims_status_created").on(t.status,t.createdAt,t.id),index("claims_owner_created").on(t.ownerId,t.createdAt,t.id)]);
export const reservations = sqliteTable("reservations",{
  reportId:text("report_id").primaryKey().references(()=>reports.id),claimId:text("claim_id").notNull().references(()=>claims.id),
},t=>[index("reservations_claim").on(t.claimId)]);
export const reviewEvents = sqliteTable("review_events",{
  id:text("id").primaryKey(),claimId:text("claim_id").notNull().references(()=>claims.id),
  actorId:text("actor_id").notNull(),action:text("action").notNull(),note:text("note"),createdAt:text("created_at").notNull(),
},t=>[uniqueIndex("review_once").on(t.claimId,t.action)]);
export const rateLimits = sqliteTable("rate_limits",{key:text("key").primaryKey(),count:integer("count").notNull(),expiresAt:text("expires_at").notNull()});
export const guidanceCache = sqliteTable("guidance_cache",{key:text("key").primaryKey(),payload:text("payload").notNull(),expiresAt:text("expires_at").notNull()});
