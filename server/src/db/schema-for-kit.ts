// Drizzle-kit compatible schema file — no .js extensions (CJS loader)
export * from "./schema/prompts";
export * from "./schema/services";
// Inline prompt-services to avoid .js import chain issue
import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { prompts } from "./schema/prompts";
import { services } from "./schema/services";

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
