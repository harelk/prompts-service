import Fastify from "fastify";
import fp from "fastify-plugin";

// Plugins
import corsPlugin from "./plugins/cors.js";
import authPlugin from "./plugins/auth.js";
import errorHandler from "./plugins/error-handler.js";
import multipartPlugin from "./plugins/multipart.js";

// Routes
import healthRoute from "./routes/health.js";
import servicesRoutes from "./routes/services.js";
import promptsRoutes from "./routes/prompts.js";
import voiceRoutes from "./routes/voice.js";

export function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Register plugins
  fastify.register(errorHandler);
  fastify.register(corsPlugin);
  fastify.register(authPlugin);
  fastify.register(multipartPlugin);

  // Register routes
  fastify.register(fp(healthRoute));
  fastify.register(fp(servicesRoutes));
  fastify.register(fp(promptsRoutes));
  fastify.register(fp(voiceRoutes));

  return fastify;
}
