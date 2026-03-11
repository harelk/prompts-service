import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as promptsSchema from "./schema/prompts.js";
import * as servicesSchema from "./schema/services.js";
import * as promptServicesSchema from "./schema/prompt-services.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, {
  schema: {
    ...promptsSchema,
    ...servicesSchema,
    ...promptServicesSchema,
  },
});

export type Db = typeof db;
