import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
      timeout: 30_000,
      maxRetries: 1,
    });
  }
  return client;
}

export interface CleanupResult {
  cleanedText: string;
  suggestedTitle: string;
  suggestedServiceNames: string[];
}

export async function cleanupTranscription(
  rawTranscription: string,
  serviceNames: string[] = []
): Promise<CleanupResult> {
  const xai = getClient();
  const model = process.env.XAI_MODEL ?? "grok-3";

  const serviceNamesBlock = serviceNames.length > 0
    ? `\n\nשמות סרוויסים מוכרים (אל תתקן אותם, שמור אותם כפי שהם):\n${serviceNames.join(", ")}`
    : "";

  const systemPrompt = `אתה עוזר לניהול פרומפטים ל-AI. קיבלת תמלול גולמי מקלט קולי בעברית.
משימתך:
1. לנקות ולסדר את הטקסט — תקן שגיאות כתיב, הוסף פיסוק, הסר מילות מילוי ("אמ", "אה", וכדומה).
2. לשמור על המשמעות המקורית ועל כל ההנחיות שהמשתמש אמר.
3. להציע כותרת קצרה וממוקדת (עד 60 תווים) לפרומפט.
4. אם מוזכר שם סרוויס מוכר — אל תשנה אותו, גם אם הוא נשמע כמו שגיאת כתיב.
5. אם מוזכרים סרוויסים מהרשימה (במפורש או במשתמע) — החזר את שמותיהם המדויקים ב-suggestedServiceNames. החזר מערך ריק אם לא מוזכר אף סרוויס.${serviceNamesBlock}

החזר תגובה **רק** בפורמט JSON הבא, ללא טקסט נוסף:
{
  "cleanedText": "...",
  "suggestedTitle": "...",
  "suggestedServiceNames": ["..."]
}`;

  const response = await xai.chat.completions.create({
    model,
    max_tokens: 2048,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `תמלול גולמי:\n${rawTranscription}` },
    ],
  });

  const textContent = response.choices[0]?.message?.content;
  if (!textContent) {
    throw new Error("No text content in xAI response");
  }

  let parsed: CleanupResult;
  try {
    // Strip possible markdown code fences
    const raw = textContent.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(raw) as CleanupResult;
  } catch {
    throw new Error("xAI returned invalid JSON");
  }

  if (!parsed.cleanedText || !parsed.suggestedTitle) {
    throw new Error("xAI response missing required fields");
  }

  if (!Array.isArray(parsed.suggestedServiceNames)) {
    parsed.suggestedServiceNames = [];
  }

  return parsed;
}
