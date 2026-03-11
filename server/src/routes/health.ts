import type { FastifyPluginAsync } from "fastify";

const health: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/health", async (_request, reply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });
};

export default health;
