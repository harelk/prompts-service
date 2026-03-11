import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import crypto from "crypto";

// JWT secret — derived from AUTH_PASSWORD or set separately
const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_PASSWORD || "";
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET or AUTH_PASSWORD must be set. Exiting.");
  process.exit(1);
}

// Hardcoded user (single-user personal tool)
const USERS = [
  {
    email: "kaplanharel@gmail.com",
    // Store as bcrypt-style hash: we'll use HMAC for simplicity
    passwordHash: hmacHash("jkhdfiekjeh38jd@hdj"),
  },
];

function hmacHash(value: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(value).digest("hex");
}

// === Simple JWT implementation using HMAC-SHA256 ===

function base64url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data) : data;
  return buf.toString("base64url");
}

export function signJwt(payload: Record<string, unknown>, expiresInSeconds = 7 * 24 * 3600): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds }));
  const signature = base64url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expectedSig = base64url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );

  // Constant-time comparison
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function authenticateUser(email: string, password: string): { email: string } | null {
  const user = USERS.find((u) => u.email === email.toLowerCase().trim());
  if (!user) return null;

  const inputHash = hmacHash(password);
  const hashBuf = Buffer.from(inputHash);
  const storedBuf = Buffer.from(user.passwordHash);
  if (hashBuf.length !== storedBuf.length || !crypto.timingSafeEqual(hashBuf, storedBuf)) {
    return null;
  }

  return { email: user.email };
}

// === Fastify Plugin ===

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Login route — no auth required
  fastify.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Email and password are required", statusCode: 400 },
      });
    }

    const user = authenticateUser(email, password);
    if (!user) {
      return reply.status(401).send({
        error: { code: "INVALID_CREDENTIALS", message: "אימייל או סיסמה שגויים", statusCode: 401 },
      });
    }

    const token = signJwt({ email: user.email });
    return reply.send({ token, email: user.email });
  });

  // Auth hook for all other routes
  fastify.addHook("onRequest", async (request, reply) => {
    // Skip health and login endpoints
    if (request.url === "/api/health" || request.url === "/api/auth/login") return;

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header", statusCode: 401 },
      });
    }

    const token = authHeader.slice(7);
    const payload = verifyJwt(token);

    if (!payload) {
      return reply.status(401).send({
        error: { code: "TOKEN_EXPIRED", message: "Token is invalid or expired", statusCode: 401 },
      });
    }

    // Attach user to request for downstream use
    (request as any).user = payload;
  });
};

export default fp(authPlugin, { name: "auth" });
