// Groq text + vision via server function (key stays on the server).
import { groqChatFn } from "./ai.functions";

async function callGroq(body: unknown): Promise<any> {
  const result = await groqChatFn({ data: { body } });
  if (result && typeof result === "object" && "error" in result) {
    const err = new Error(`${String(result.error)}${"detail" in result && result.detail ? `: ${String(result.detail)}` : ""}`);
    err.name = String(result.error);
    throw err;
  }
  return result;
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json\s*|```/g, "").trim();
  const start = cleaned.search(/[\[{]/);
  if (start < 0) throw new Error("no_json");
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    else if (cleaned[i] === close) {
      depth--;
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error("incomplete_json");
}

export async function groqText(systemPrompt: string, userPrompt: string): Promise<any> {
  const j = await callGroq({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });
  const content = j.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return extractJson(content);
  }
}

const VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

export async function groqVision(base64NoPrefix: string, prompt: string): Promise<string> {
  let lastErr: any;
  for (const model of VISION_MODELS) {
    try {
      const j = await callGroq({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64NoPrefix}` } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 512,
      });
      const content = j.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("groq_empty_response");
      return content;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("groq_vision_all_failed");
}
