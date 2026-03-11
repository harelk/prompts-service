import OpenAI, { toFile } from "openai";

const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
  "audio/ogg",
]);

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
      maxRetries: 1,
    });
  }
  return client;
}

export function validateMimeType(mimeType: string): boolean {
  // Strip codec params like "audio/webm; codecs=opus"
  const base = mimeType.split(";")[0].trim().toLowerCase();
  return ALLOWED_MIME_TYPES.has(base);
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const openai = getClient();

  // Map MIME type to file extension for the OpenAI SDK
  const ext = mimeTypeToExt(mimeType);

  // Use OpenAI's toFile helper for Node 18 compatibility (no global File)
  const file = await toFile(audioBuffer, `${filename}.${ext}`, {
    type: mimeType,
  });

  const response = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "he",
    response_format: "text",
  });

  return typeof response === "string" ? response : (response as { text: string }).text;
}

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
