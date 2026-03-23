import type { FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { prompts } from "../db/schema/prompts.js";
import { services } from "../db/schema/services.js";
import { promptServices } from "../db/schema/prompt-services.js";
import { eq, inArray, sql, and, or, ilike } from "drizzle-orm";
type PromptStatus = "draft" | "active" | "in_progress" | "done" | "archived";

type PromptsQuery = {
  status?: string;
  search?: string;
  serviceId?: string;
};

type CreateBody = {
  title: string;
  content: string;
  note?: string;
  status?: PromptStatus;
  serviceIds?: string[];
  rawTranscription?: string;
  audioFilename?: string;
};

type UpdateBody = {
  title?: string;
  content?: string;
  note?: string;
  status?: PromptStatus;
  serviceIds?: string[];
};

const VALID_STATUSES = new Set(["draft", "active", "in_progress", "done", "archived"]);

async function getPromptWithServices(promptId: string) {
  const [promptRow] = await db.select().from(prompts).where(eq(prompts.id, promptId));
  if (!promptRow) return null;

  const serviceRows = await db
    .select({ id: services.id, name: services.name, createdAt: services.createdAt })
    .from(promptServices)
    .innerJoin(services, eq(promptServices.serviceId, services.id))
    .where(eq(promptServices.promptId, promptId));

  return {
    id: promptRow.id,
    title: promptRow.title,
    content: promptRow.content,
    note: promptRow.note,
    rawTranscription: promptRow.rawTranscription,
    audioFilename: promptRow.audioFilename ?? null,
    status: promptRow.status,
    createdAt: promptRow.createdAt.toISOString(),
    updatedAt: promptRow.updatedAt.toISOString(),
    services: serviceRows.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

const promptsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/prompts
  fastify.get<{ Querystring: PromptsQuery }>("/api/prompts", async (request, reply) => {
    const { status, search, serviceId } = request.query;

    // Build conditions
    const conditions = [];

    if (status) {
      const statuses = status.split(",").filter((s) => VALID_STATUSES.has(s)) as PromptStatus[];
      if (statuses.length > 0) {
        conditions.push(inArray(prompts.status, statuses));
      }
    }

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(ilike(prompts.title, term), ilike(prompts.content, term))
      );
    }

    // Filter by service: find prompt IDs linked to this service
    let servicePromptIds: string[] | null = null;
    if (serviceId && serviceId.trim().length > 0) {
      const linked = await db
        .select({ promptId: promptServices.promptId })
        .from(promptServices)
        .where(eq(promptServices.serviceId, serviceId.trim()));
      servicePromptIds = linked.map((r) => r.promptId);
      if (servicePromptIds.length === 0) {
        return reply.send([]);
      }
      conditions.push(inArray(prompts.id, servicePromptIds));
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(prompts)
            .where(and(...conditions))
            .orderBy(sql`${prompts.createdAt} DESC`)
        : await db
            .select()
            .from(prompts)
            .orderBy(sql`${prompts.createdAt} DESC`);

    if (rows.length === 0) {
      return reply.send([]);
    }

    const promptIds = rows.map((r) => r.id);
    const serviceRows = await db
      .select({
        promptId: promptServices.promptId,
        serviceId: services.id,
        serviceName: services.name,
        serviceCreatedAt: services.createdAt,
      })
      .from(promptServices)
      .innerJoin(services, eq(promptServices.serviceId, services.id))
      .where(inArray(promptServices.promptId, promptIds));

    const servicesByPrompt = new Map<string, typeof serviceRows>();
    for (const sr of serviceRows) {
      if (!servicesByPrompt.has(sr.promptId)) {
        servicesByPrompt.set(sr.promptId, []);
      }
      servicesByPrompt.get(sr.promptId)!.push(sr);
    }

    const result = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      note: r.note,
      rawTranscription: r.rawTranscription,
      audioFilename: r.audioFilename ?? null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      services: (servicesByPrompt.get(r.id) ?? []).map((s) => ({
        id: s.serviceId,
        name: s.serviceName,
        createdAt: s.serviceCreatedAt.toISOString(),
      })),
    }));

    return reply.send(result);
  });

  // GET /api/prompts/:id
  fastify.get<{ Params: { id: string } }>("/api/prompts/:id", async (request, reply) => {
    const prompt = await getPromptWithServices(request.params.id);
    if (!prompt) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Prompt not found", statusCode: 404 },
      });
    }
    return reply.send(prompt);
  });

  // POST /api/prompts
  fastify.post<{ Body: CreateBody }>("/api/prompts", async (request, reply) => {
    const { title, content, note, status, serviceIds, rawTranscription, audioFilename } = request.body ?? {};

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "title is required", statusCode: 400 },
      });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "content is required", statusCode: 400 },
      });
    }
    if (status && !VALID_STATUSES.has(status)) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "invalid status", statusCode: 400 },
      });
    }

    const row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(prompts)
        .values({
          title: title.trim(),
          content: content.trim(),
          note: note?.trim() ?? null,
          status: status ?? "draft",
          rawTranscription: rawTranscription ?? null,
          audioFilename: audioFilename ?? null,
        })
        .returning();

      if (serviceIds && serviceIds.length > 0) {
        await tx.insert(promptServices).values(
          serviceIds.map((sid) => ({ promptId: inserted.id, serviceId: sid }))
        );
      }

      return inserted;
    });

    const prompt = await getPromptWithServices(row.id);
    return reply.status(201).send(prompt);
  });

  // PATCH /api/prompts/:id
  fastify.patch<{ Params: { id: string }; Body: UpdateBody }>(
    "/api/prompts/:id",
    async (request, reply) => {
      const { id } = request.params;
      const { title, content, note, status, serviceIds } = request.body ?? {};

      const existing = await db.select().from(prompts).where(eq(prompts.id, id));
      if (existing.length === 0) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Prompt not found", statusCode: 404 },
        });
      }

      if (status && !VALID_STATUSES.has(status)) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: "invalid status", statusCode: 400 },
        });
      }

      const updates: Partial<typeof prompts.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (title !== undefined) updates.title = title.trim();
      if (content !== undefined) updates.content = content.trim();
      if (note !== undefined) updates.note = note?.trim() ?? null;
      if (status !== undefined) updates.status = status;

      await db.transaction(async (tx) => {
        await tx.update(prompts).set(updates).where(eq(prompts.id, id));

        if (serviceIds !== undefined) {
          await tx.delete(promptServices).where(eq(promptServices.promptId, id));
          if (serviceIds.length > 0) {
            await tx.insert(promptServices).values(
              serviceIds.map((sid) => ({ promptId: id, serviceId: sid }))
            );
          }
        }
      });

      const prompt = await getPromptWithServices(id);
      return reply.send(prompt);
    }
  );

  // DELETE /api/prompts/:id
  fastify.delete<{ Params: { id: string } }>("/api/prompts/:id", async (request, reply) => {
    const { id } = request.params;

    const [deleted] = await db
      .delete(prompts)
      .where(eq(prompts.id, id))
      .returning({ id: prompts.id });

    if (!deleted) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Prompt not found", statusCode: 404 },
      });
    }

    return reply.status(204).send();
  });
};

export default promptsRoutes;
