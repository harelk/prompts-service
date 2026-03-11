import "dotenv/config";
import { db } from "./client.js";
import { services } from "./schema/services.js";

const DEFAULT_SERVICES = [
  // AI Services
  "Claude",
  "GPT",
  "Gemini",
  "Grok",
  "Midjourney",
  "Cursor",
  // GitHub repos / projects (updated in last year)
  "better_agents",
  "prompts-service",
  "claude-scheduler",
  "torohr-backend",
  "torohr-admin",
  "employer-outreach",
  "rebase_server",
  "torohr-marketing-website",
  "torohr-portal",
  "v_admin",
  "conversation-analyzer",
  "booster",
  "puppeteer",
  "provider_login_service",
  "job-board-integrations",
  "shuffle_service",
  "deployment_app",
  "ai-hr",
  "jira_frontend",
  "jira_backend",
  "files_server",
  "monday_frontend",
  "monday_backend",
  "stargate_panel",
  "company_panel",
  "accounting_service",
  "stargate",
  "publications",
  "accounting_panel",
  "suitup_applicants_frontend",
  "nuxt_seo",
  "rebase_web",
  "stargate_filter",
  "studio",
  "x-monitor",
];

async function seed() {
  console.log("Seeding services...");

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
