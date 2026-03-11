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

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    note: text("note"),
    rawTranscription: text("raw_transcription"),
    status: promptStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("prompts_status_idx").on(table.status),
    createdAtIdx: index("prompts_created_at_idx").on(table.createdAt),
  })
);

export type PromptRow = typeof prompts.$inferSelect;
export type NewPromptRow = typeof prompts.$inferInsert;
