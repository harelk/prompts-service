import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

export const promptStatusEnum = pgEnum("prompt_status", [
  "draft",
  "active",
  "in_progress",
  "done",
  "archived",
]);

export const promptOwnerEnum = pgEnum("prompt_owner", ["raout", "harel", "dvora", "claude"]);

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    note: text("note"),
    rawTranscription: text("raw_transcription"),
    audioFilename: varchar("audio_filename", { length: 255 }),
    status: promptStatusEnum("status").notNull().default("draft"),
    owner: promptOwnerEnum("owner").notNull().default("claude"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("prompts_status_idx").on(table.status),
    ownerIdx: index("prompts_owner_idx").on(table.owner),
    createdAtIdx: index("prompts_created_at_idx").on(table.createdAt),
  })
);

export type PromptRow = typeof prompts.$inferSelect;
export type NewPromptRow = typeof prompts.$inferInsert;
