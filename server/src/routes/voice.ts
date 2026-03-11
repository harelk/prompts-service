import type { FastifyPluginAsync } from "fastify";
import { validateMimeType, transcribeAudio } from "../services/whisper.js";
import { cleanupTranscription } from "../services/claude-cleanup.js";
import { db } from "../db/client.js";
import { services } from "../db/schema/services.js";

const voiceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/api/voice/transcribe", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "No audio file provided", statusCode: 400 },
      });
    }

    const mimeType = data.mimetype ?? "audio/webm";

    if (!validateMimeType(mimeType)) {
      return reply.status(400).send({
        error: {
          code: "INVALID_MIME_TYPE",
          message: `Unsupported audio format: ${mimeType}. Allowed: audio/webm, audio/mp4, audio/wav, audio/mpeg`,
          statusCode: 400,
        },
      });
    }

    // Collect the buffer
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    if (audioBuffer.length === 0) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Audio file is empty", statusCode: 400 },
      });
    }

    // Step 1: Transcribe with Whisper
    let rawTranscription: string;
    try {
      rawTranscription = await transcribeAudio(audioBuffer, mimeType, data.filename ?? "recording");
    } catch (err) {
      fastify.log.error(err, "Whisper transcription failed");
      return reply.status(502).send({
        error: {
          code: "TRANSCRIPTION_FAILED",
          message: "Audio transcription failed. Please try again.",
          statusCode: 502,
        },
      });
    }

    // Load service names so the cleanup AI won't "fix" them
    const allServices = await db.select({ id: services.id, name: services.name }).from(services);
    const serviceNames = allServices.map((s) => s.name);

    // Step 2: Cleanup with xAI (raw transcription is already captured above)
    let cleanedText = rawTranscription;
    let suggestedTitle = "";
    let suggestedServiceIds: string[] = [];

    try {
      const result = await cleanupTranscription(rawTranscription, serviceNames);
      cleanedText = result.cleanedText;
      suggestedTitle = result.suggestedTitle;

      // Map suggested service names to IDs
      if (result.suggestedServiceNames.length > 0) {
        const nameToId = new Map(allServices.map((s) => [s.name.toLowerCase(), s.id]));
        suggestedServiceIds = result.suggestedServiceNames
          .map((name) => nameToId.get(name.toLowerCase()))
          .filter((id): id is string => Boolean(id));
      }
    } catch (err) {
      fastify.log.error(err, "Claude cleanup failed — returning raw transcription");
      // Return raw transcription so user doesn't lose their content
      suggestedTitle = rawTranscription.split(" ").slice(0, 6).join(" ");
    }

    return reply.send({
      rawTranscription,
      cleanedText,
      suggestedTitle,
      suggestedServiceIds,
    });
  });
};

export default voiceRoutes;
