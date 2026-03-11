import "dotenv/config";
import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 4300);
const HOST = "0.0.0.0";

async function start() {
  const app = buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
