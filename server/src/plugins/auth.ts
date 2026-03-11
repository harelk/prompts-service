import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import crypto from "crypto";

// Startup guard: AUTH_PASSWORD must be set and non-empty.
const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "";
if (!AUTH_PASSWORD) {
  console.error("FATAL: AUTH_PASSWORD environment variable is not set or is empty. Exiting.");
  process.exit(1);
}

// HMAC secret used to equalize token lengths before comparison, preventing
// timing side-channel leaks based on differing buffer lengths.
const HMAC_SECRET = crypto.randomBytes(32);

function hmac(value: string): Buffer {
  return crypto.createHmac("sha256", HMAC_SECRET).update(value).digest();
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (request, reply) => {
    // Skip health endpoint
    if (request.url === "/api/health") return;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid authorization header",
          statusCode: 401,
        },
      });
    }

    const token = authHeader.slice(7);

    // Hash both sides with HMAC-SHA256 so buffers are always equal length,
    // eliminating the timing side-channel from the length short-circuit.
    let isValid = false;
    try {
      const tokenHash = hmac(token);
      const passwordHash = hmac(AUTH_PASSWORD);
      isValid = crypto.timingSafeEqual(tokenHash, passwordHash);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return reply.status(401).send({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
          statusCode: 401,
        },
      });
    }
  });
};

export default fp(authPlugin, { name: "auth" });
