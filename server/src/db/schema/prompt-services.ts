import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { prompts } from "./prompts.js";
import { services } from "./services.js";

export const promptServices = pgTable(
  "prompt_services",
  {
    promptId: uuid("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.promptId, table.serviceId] }),
  })
);

export type PromptServiceRow = typeof promptServices.$inferSelect;
