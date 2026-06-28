// Server functions proxying Gemini and Groq so API keys stay server-side.
import { createServerFn } from "@tanstack/react-start";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

type AiEnvStatus = {
  ok: boolean;
  gemini: boolean;
  groq: boolean;
  required: string[];
  missing: string[];
  models: { gemini: string; groqVision: string[]; groqText: string };
};

function redactDetail(text: string): string {
  return text.replace(/key=[^\s&"]+/gi, "key=[redacted]").slice(0, 600);
}

function parseDataUrl(input: string): { mimeType: string; data: string } | null {
  const trimmed = input.trim();
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(trimmed);
  if (match) return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
  if (/^[a-z0-9+/=\s]+$/i.test(trimmed) && trimmed.replace(/\s/g, "").length > 40) {
    return { mimeType: "image/jpeg", data: trimmed.replace(/\s/g, "") };
  }
  return null;
}

function validateAiEnvironment(): AiEnvStatus {
  const gemini = Boolean(process.env.GEMINI_API_KEY);
  const groq = Boolean(process.env.GROQ_API_KEY);
  const missing = [
    ...(!gemini ? ["GEMINI_API_KEY"] : []),
    ...(!groq ? ["GROQ_API_KEY"] : []),
  ];
  return {
    ok: missing.length === 0,
    gemini,
    groq,
    required: ["GEMINI_API_KEY", "GROQ_API_KEY"],
    missing,
    models: {
      gemini: GEMINI_MODEL,
      groqVision: ["meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-4-maverick-17b-128e-instruct"],
      groqText: "llama-3.3-70b-versatile",
    },
  };
}

export const validateAiEnvironmentFn = createServerFn({ method: "GET" }).handler(async () => {
  const status = validateAiEnvironment();
  console.info("[FarmSmartAI] startup environment validation", {
    ok: status.ok,
    geminiConfigured: status.gemini,
    groqConfigured: status.groq,
    missing: status.missing,
    models: status.models,
  });
  return status;
});

export const geminiVisionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string; prompt: string }) => d)
  .handler(async ({ data }) => {
    console.info("[FarmSmartAI] Gemini vision request started", {
      model: GEMINI_MODEL,
      hasImage: Boolean(data.base64),
      promptChars: data.prompt?.length ?? 0,
    });
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error("[FarmSmartAI] Gemini vision failure", { reason: "missing API key" });
      return { text: "", error: "missing_gemini_key", status: 0, detail: "GEMINI_API_KEY is not configured." };
    }
    const image = parseDataUrl(data.base64);
    if (!image) {
      console.error("[FarmSmartAI] Gemini vision failure", { reason: "invalid image data" });
      return { text: "", error: "invalid_image", status: 0, detail: "Uploaded file is not a valid base64 image." };
    }
    try {
      const r = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: data.prompt }, { inline_data: { mime_type: image.mimeType, data: image.data } }] },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      });
      console.info("[FarmSmartAI] Gemini vision response received", { status: r.status, ok: r.ok, model: GEMINI_MODEL });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        const code = r.status === 429 ? "gemini_quota_exceeded" : r.status === 400 ? "gemini_model_error" : `gemini_${r.status}`;
        console.error("[FarmSmartAI] Gemini vision failure", { status: r.status, reason: redactDetail(t) });
        return { text: "", error: code, status: r.status, detail: redactDetail(t) };
      }
      const j = await r.json();
      const candidate = j.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const text = (candidate?.content?.parts ?? [])
        .map((part: { text?: string }) => part.text ?? "")
        .join("")
        .trim();
      if (finishReason === "MAX_TOKENS") {
        return { text, error: "gemini_truncated", status: 200, detail: "Gemini response was truncated before valid JSON completed." };
      }
      if (!text) {
        console.error("[FarmSmartAI] Gemini vision failure", { reason: "empty response", finishReason });
        return { text: "", error: "gemini_empty_response", status: 200, detail: `Gemini returned no text. finishReason=${finishReason ?? "unknown"}` };
      }
      console.info("[FarmSmartAI] Gemini vision text received", { chars: text.length, finishReason });
      return { text, model: GEMINI_MODEL, raw: JSON.stringify(j).slice(0, 2000) };
    } catch (e) {
      console.error("[FarmSmartAI] Gemini vision failure", { reason: "network failure", detail: String(e) });
      return { text: "", error: "gemini_network", status: 0, detail: redactDetail(String(e)) };
    }
  });

export const geminiTextFn = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    console.info("[FarmSmartAI] Gemini text request started", { model: GEMINI_MODEL, promptChars: data.prompt?.length ?? 0 });
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { text: "", error: "missing_gemini_key", status: 0, detail: "GEMINI_API_KEY is not configured." };
    try {
      const r = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: data.prompt }] }] }),
      });
      console.info("[FarmSmartAI] Gemini text response received", { status: r.status, ok: r.ok });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return { text: "", error: r.status === 429 ? "gemini_quota_exceeded" : `gemini_${r.status}`, status: r.status, detail: redactDetail(t) };
      }
      const j = await r.json();
      return { text: (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string, model: GEMINI_MODEL };
    } catch (e) {
      return { text: "", error: "gemini_network", status: 0, detail: redactDetail(String(e)) };
    }
  });

export const testGeminiConnectionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string }) => d)
  .handler(async ({ data }) => {
    const prompt = `Return ONLY JSON: {"ok":true,"detected_object":"short description","is_agricultural":true|false,"confidence":0..1}. Analyze this uploaded image briefly.`;
    const result = await geminiVisionFn({ data: { base64: data.base64, prompt } });
    console.info("[FarmSmartAI] Gemini connection test completed", {
      ok: !("error" in result && result.error),
      error: "error" in result ? result.error : undefined,
    });
    return result;
  });


export const groqChatFn = createServerFn({ method: "POST" })
  .inputValidator((d: { body: unknown }) => d)
  .handler(async ({ data }) => {
    const model = typeof data.body === "object" && data.body != null && "model" in data.body ? (data.body as { model?: unknown }).model : undefined;
    console.info("[FarmSmartAI] Groq request started", { model });
    const key = process.env.GROQ_API_KEY;
    if (!key) return { error: "missing_groq_key", status: 0, detail: "GROQ_API_KEY is not configured." };
    let delay = 2000;
    for (let i = 0; i < 3; i++) {
      try {
        const r = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify(data.body),
        });
        console.info("[FarmSmartAI] Groq response received", { status: r.status, ok: r.ok, model, attempt: i + 1 });
        if (r.ok) return await r.json();
        if (r.status === 429 && i < 2) {
          await new Promise((res) => setTimeout(res, delay));
          delay += 2000;
          continue;
        }
        const txt = await r.text().catch(() => "");
        const code = r.status === 401 ? "groq_invalid_api_key" : r.status === 429 ? "groq_quota_exceeded" : r.status === 400 ? "groq_model_error" : `groq_${r.status}`;
        console.error("[FarmSmartAI] Groq failure", { status: r.status, reason: redactDetail(txt), model });
        return { error: code, status: r.status, detail: redactDetail(txt) };
      } catch (e) {
        if (i < 2) continue;
        console.error("[FarmSmartAI] Groq failure", { reason: "network failure", detail: String(e), model });
        return { error: "groq_network", status: 0, detail: redactDetail(String(e)) };
      }
    }
    return { error: "groq_retries_exhausted", status: 0 };
  });
