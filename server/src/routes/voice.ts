import type { FastifyPluginAsync } from "fastify";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { validateMimeType, transcribeAudio } from "../services/whisper.js";
import { cleanupTranscription, applyVoiceEdit } from "../services/claude-cleanup.js";
import { db } from "../db/client.js";
import { services } from "../db/schema/services.js";
import { prompts } from "../db/schema/prompts.js";
import { promptServices } from "../db/schema/prompt-services.js";
import { eq } from "drizzle-orm";

const AUDIO_DIR = path.resolve(process.cwd(), "uploads", "audio");

// Ensure upload directory exists on startup
fs.mkdirSync(AUDIO_DIR, { recursive: true });

function mimeTypeToExt(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
  };
  return map[base] ?? "webm";
}

function extToMimeType(ext: string): string {
  const map: Record<string, string> = {
    webm: "audio/webm",
    mp4: "audio/mp4",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
  };
  return map[ext] ?? "audio/webm";
}

/** Returns { rawTranscription, cleanedText, suggestedTitle, suggestedServiceIds } */
async function runTranscriptionPipeline(
  audioBuffer: Buffer,
  mimeType: string,
  filename: string,
  fastify: { log: { error: (...args: unknown[]) => void } }
) {
  let rawTranscription: string;
  rawTranscription = await transcribeAudio(audioBuffer, mimeType, filename);

  const allServices = await db.select({ id: services.id, name: services.name }).from(services);
  const serviceNames = allServices.map((s) => s.name);

  let cleanedText = rawTranscription;
  let suggestedTitle = "";
  let suggestedServiceIds: string[] = [];

  try {
    const result = await cleanupTranscription(rawTranscription, serviceNames);
    cleanedText = result.cleanedText;
    suggestedTitle = result.suggestedTitle;

    if (result.suggestedServiceNames.length > 0) {
      const nameToId = new Map(allServices.map((s) => [s.name.toLowerCase(), s.id]));
      suggestedServiceIds = result.suggestedServiceNames
        .map((name) => nameToId.get(name.toLowerCase()))
        .filter((id): id is string => Boolean(id));
    }
  } catch (err) {
    fastify.log.error(err, "Claude cleanup failed — returning raw transcription");
    suggestedTitle = rawTranscription.split(" ").slice(0, 6).join(" ");
  }

  return { rawTranscription, cleanedText, suggestedTitle, suggestedServiceIds };
}

const voiceRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/voice/transcribe
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

    // Save audio to disk
    const ext = mimeTypeToExt(mimeType);
    const audioFilename = `${crypto.randomUUID()}.${ext}`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);
    await fs.promises.writeFile(audioPath, audioBuffer);

    // Run transcription pipeline
    let result: Awaited<ReturnType<typeof runTranscriptionPipeline>>;
    try {
      result = await runTranscriptionPipeline(audioBuffer, mimeType, data.filename ?? "recording", fastify);
    } catch (err) {
      fastify.log.error(err, "Whisper transcription failed");
      // Clean up the saved file since transcription failed
      fs.promises.unlink(audioPath).catch(() => undefined);
      return reply.status(502).send({
        error: {
          code: "TRANSCRIPTION_FAILED",
          message: "Audio transcription failed. Please try again.",
          statusCode: 502,
        },
      });
    }

    return reply.send({
      rawTranscription: result.rawTranscription,
      cleanedText: result.cleanedText,
      suggestedTitle: result.suggestedTitle,
      suggestedServiceIds: result.suggestedServiceIds,
      audioFilename,
    });
  });

  // GET /api/audio/:filename — serve saved audio files
  fastify.get<{ Params: { filename: string } }>("/api/audio/:filename", async (request, reply) => {
    const { filename } = request.params;

    // Validate filename to prevent path traversal
    if (!/^[\w\-]+\.\w{2,4}$/.test(filename)) {
      return reply.status(400).send({
        error: { code: "INVALID_FILENAME", message: "Invalid filename", statusCode: 400 },
      });
    }

    const filePath = path.join(AUDIO_DIR, filename);
    try {
      const buffer = await fs.promises.readFile(filePath);
      const ext = path.extname(filename).slice(1);
      const contentType = extToMimeType(ext);
      return reply
        .header("Content-Type", contentType)
        .header("Content-Length", buffer.length)
        .header("Cache-Control", "private, max-age=3600")
        .send(buffer);
    } catch {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Audio file not found", statusCode: 404 },
      });
    }
  });

  // POST /api/prompts/:id/voice-edit — record edit instructions and apply them to the prompt
  fastify.post<{ Params: { id: string } }>("/api/prompts/:id/voice-edit", async (request, reply) => {
    const { id } = request.params;

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

    // Load the current prompt
    const [promptRow] = await db.select().from(prompts).where(eq(prompts.id, id));
    if (!promptRow) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Prompt not found", statusCode: 404 },
      });
    }

    // Delete old audio file if one exists
    if (promptRow.audioFilename) {
      const oldPath = path.join(AUDIO_DIR, promptRow.audioFilename);
      fs.promises.unlink(oldPath).catch(() => undefined);
    }

    // Save new audio to disk
    const ext = mimeTypeToExt(mimeType);
    const audioFilename = `${crypto.randomUUID()}.${ext}`;
    const audioPath = path.join(AUDIO_DIR, audioFilename);
    await fs.promises.writeFile(audioPath, audioBuffer);

    // Transcribe the edit instructions
    let rawTranscription: string;
    try {
      rawTranscription = await transcribeAudio(audioBuffer, mimeType, data.filename ?? "recording");
    } catch (err) {
      fastify.log.error(err, "Whisper transcription failed");
      fs.promises.unlink(audioPath).catch(() => undefined);
      return reply.status(502).send({
        error: {
          code: "TRANSCRIPTION_FAILED",
          message: "Audio transcription failed. Please try again.",
          statusCode: 502,
        },
      });
    }

    // Load service names for the AI
    const allServices = await db.select({ id: services.id, name: services.name }).from(services);
    const serviceNames = allServices.map((s) => s.name);

    // Apply the voice edit via AI
    let result: import("../services/claude-cleanup.js").VoiceEditResult;
    try {
      result = await applyVoiceEdit(promptRow.title, promptRow.content, rawTranscription, serviceNames);
    } catch (err) {
      fastify.log.error(err, "Voice edit AI processing failed");
      return reply.status(502).send({
        error: {
          code: "AI_EDIT_FAILED",
          message: "Failed to apply voice edit. Please try again.",
          statusCode: 502,
        },
      });
    }

    // Resolve service IDs from suggested names
    let suggestedServiceIds: string[] = [];
    if (result.suggestedServiceNames.length > 0) {
      const nameToId = new Map(allServices.map((s) => [s.name.toLowerCase(), s.id]));
      suggestedServiceIds = result.suggestedServiceNames
        .map((name) => nameToId.get(name.toLowerCase()))
        .filter((sid): sid is string => Boolean(sid));
    }

    // Update prompt in DB (and optionally update service associations)
    await db.transaction(async (tx) => {
      await tx.update(prompts).set({
        content: result.updatedContent,
        title: result.updatedTitle,
        rawTranscription: rawTranscription,
        audioFilename: audioFilename,
        updatedAt: new Date(),
      }).where(eq(prompts.id, id));

      if (suggestedServiceIds.length > 0) {
        await tx.delete(promptServices).where(eq(promptServices.promptId, id));
        await tx.insert(promptServices).values(
          suggestedServiceIds.map((sid) => ({ promptId: id, serviceId: sid }))
        );
      }
    });

    return reply.send({
      updatedContent: result.updatedContent,
      updatedTitle: result.updatedTitle,
      suggestedServiceIds,
      rawTranscription,
      audioFilename,
    });
  });

  // POST /api/prompts/:id/retranscribe — re-run transcription from saved audio
  fastify.post<{ Params: { id: string } }>("/api/prompts/:id/retranscribe", async (request, reply) => {
    const { id } = request.params;

    const [promptRow] = await db.select().from(prompts).where(eq(prompts.id, id));
    if (!promptRow) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Prompt not found", statusCode: 404 },
      });
    }

    if (!promptRow.audioFilename) {
      return reply.status(400).send({
        error: { code: "NO_AUDIO", message: "No saved audio for this prompt", statusCode: 400 },
      });
    }

    const audioPath = path.join(AUDIO_DIR, promptRow.audioFilename);
    let audioBuffer: Buffer;
    try {
      audioBuffer = await fs.promises.readFile(audioPath);
    } catch {
      return reply.status(404).send({
        error: { code: "AUDIO_FILE_MISSING", message: "Audio file not found on disk", statusCode: 404 },
      });
    }

    const ext = path.extname(promptRow.audioFilename).slice(1);
    const mimeType = extToMimeType(ext);

    let result: Awaited<ReturnType<typeof runTranscriptionPipeline>>;
    try {
      result = await runTranscriptionPipeline(audioBuffer, mimeType, promptRow.audioFilename, fastify);
    } catch (err) {
      fastify.log.error(err, "Whisper re-transcription failed");
      return reply.status(502).send({
        error: {
          code: "TRANSCRIPTION_FAILED",
          message: "Re-transcription failed. Please try again.",
          statusCode: 502,
        },
      });
    }

    // Update the prompt in DB with new transcription results
    await db
      .update(prompts)
      .set({
        rawTranscription: result.rawTranscription,
        content: result.cleanedText,
        title: result.suggestedTitle || promptRow.title,
        updatedAt: new Date(),
      })
      .where(eq(prompts.id, id));

    return reply.send({
      rawTranscription: result.rawTranscription,
      cleanedText: result.cleanedText,
      suggestedTitle: result.suggestedTitle,
      suggestedServiceIds: result.suggestedServiceIds,
    });
  });
};

export default voiceRoutes;
