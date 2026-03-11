import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 30_000,
      maxRetries: 1,
    });
  }
  return client;
}

export interface CleanupResult {
  cleanedText: string;
  suggestedTitle: string;
}

export async function cleanupTranscription(
  rawTranscription: string
): Promise<CleanupResult> {
  const claude = getClient();
  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514";

  const systemPrompt = `אתה עוזר לניהול פרומפטים ל-AI. קיבלת תמלול גולמי מקלט קולי בעברית.
משימתך:
1. לנקות ולסדר את הטקסט — תקן שגיאות כתיב, הוסף פיסוק, הסר מילות מילוי ("אמ", "אה", וכדומה).
2. לשמור על המשמעות המקורית ועל כל ההנחיות שהמשתמש אמר.
3. להציע כותרת קצרה וממוקדת (עד 60 תווים) לפרומפט.

החזר תגובה **רק** בפורמט JSON הבא, ללא טקסט נוסף:
{
  "cleanedText": "...",
  "suggestedTitle": "..."
}`;

  const message = await claude.messages.create({
    model,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `תמלול גולמי:\n${rawTranscription}`,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  let parsed: CleanupResult;
  try {
    // Strip possible markdown code fences
    const raw = textContent.text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(raw) as CleanupResult;
  } catch {
    throw new Error("Claude returned invalid JSON: " + textContent.text.slice(0, 200));
  }

  if (!parsed.cleanedText || !parsed.suggestedTitle) {
    throw new Error("Claude response missing required fields");
  }

  return parsed;
}
