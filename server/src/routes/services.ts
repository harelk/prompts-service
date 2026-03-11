import type { FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { services } from "../db/schema/services.js";
import { eq } from "drizzle-orm";

const servicesRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/services
  fastify.get("/api/services", async (_request, reply) => {
    const rows = await db
      .select()
      .from(services)
      .orderBy(services.name);

    return reply.send(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  });

  // POST /api/services
  fastify.post<{ Body: { name: string } }>("/api/services", async (request, reply) => {
    const { name } = request.body ?? {};

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "name is required", statusCode: 400 },
      });
    }

    const [row] = await db
      .insert(services)
      .values({ name: name.trim() })
      .returning();

    return reply.status(201).send({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    });
  });

  // DELETE /api/services/:id
  fastify.delete<{ Params: { id: string } }>("/api/services/:id", async (request, reply) => {
    const { id } = request.params;

    const [deleted] = await db
      .delete(services)
      .where(eq(services.id, id))
      .returning({ id: services.id });

    if (!deleted) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Service not found", statusCode: 404 },
      });
    }

    return reply.status(204).send();
  });
};

export default servicesRoutes;
