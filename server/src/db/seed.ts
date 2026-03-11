import "dotenv/config";
import { db } from "./client.js";
import { services } from "./schema/services.js";

const DEFAULT_SERVICES = ["Claude", "GPT", "Gemini", "Midjourney", "Cursor"];

async function seed() {
  console.log("Seeding default services...");

  for (const name of DEFAULT_SERVICES) {
    await db
      .insert(services)
      .values({ name })
      .onConflictDoNothing({ target: services.name });
    console.log(`  - ${name}`);
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
