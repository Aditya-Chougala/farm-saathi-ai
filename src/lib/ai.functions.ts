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

export const debugGeminiLiveFn = createServerFn({ method: "POST" })
  .inputValidator((d: { base64?: string; prompt?: string }) => d)
  .handler(async ({ data }) => {
    const env = validateAiEnvironment();
    const model = GEMINI_MODEL;
    const result = {
      env: { geminiKeyLoaded: env.gemini, groqKeyLoaded: env.groq },
      model,
      request: { url: "", payloadBytes: 0, promptChars: 0, imageBytes: 0, mimeType: "" },
      response: { sent: false, received: false, httpStatus: 0, ok: false, rawBody: "", durationMs: 0 },
      parsed: { json: null as string | null, parseError: null as string | null },
      validator: { accepted: false, reason: "not_run", detectedObject: "", isAgricultural: false, confidence: 0 },
      groq: { sent: false, httpStatus: 0, ok: false, durationMs: 0, parsed: null as string | null, error: null as string | null },
      exception: null as { message: string; stack: string } | null,
    };

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      result.validator.reason = "missing_gemini_key";
      console.error("[FarmSmartAI][debug] missing GEMINI_API_KEY");
      return result;
    }

    const prompt =
      data.prompt ??
      `Return ONLY JSON: {"detected_object":"short","is_agricultural":true|false,"confidence":0..1,"note":"brief"}.`;
    result.request.promptChars = prompt.length;
    result.request.url = `${GEMINI_URL}?key=[redacted]`;

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (data.base64) {
      const img = parseDataUrl(data.base64);
      if (!img) {
        result.validator.reason = "invalid_image";
        console.error("[FarmSmartAI][debug] invalid image data");
        return result;
      }
      result.request.imageBytes = img.data.length;
      result.request.mimeType = img.mimeType;
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    } else {
      result.request.mimeType = "(text-only ping)";
    }

    const body = JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512, responseMimeType: "application/json" },
    });
    result.request.payloadBytes = body.length;

    const t0 = Date.now();
    try {
      console.info("[FarmSmartAI][debug] sending Gemini request", { model, payloadBytes: body.length, hasImage: Boolean(data.base64) });
      result.response.sent = true;
      const r = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      result.response.received = true;
      result.response.httpStatus = r.status;
      result.response.ok = r.ok;
      const raw = await r.text().catch(() => "");
      result.response.rawBody = redactDetail(raw).slice(0, 4000);
      result.response.durationMs = Date.now() - t0;
      console.info("[FarmSmartAI][debug] Gemini status", { status: r.status, ok: r.ok, durationMs: result.response.durationMs });

      if (r.ok) {
        try {
          const j = JSON.parse(raw);
          const text = (j.candidates?.[0]?.content?.parts ?? [])
            .map((p: { text?: string }) => p.text ?? "")
            .join("")
            .trim();
          if (text) {
            try {
              const cleaned = text.replace(/```json\s*|```/gi, "").trim();
              const start = cleaned.indexOf("{");
              const end = cleaned.lastIndexOf("}");
              const obj = start >= 0 && end > start ? JSON.parse(cleaned.slice(start, end + 1)) : null;
              result.parsed.json = JSON.stringify(obj ?? { text }, null, 2);
              if (obj && typeof obj === "object") {
                result.validator.detectedObject = String(obj.detected_object ?? "");
                result.validator.isAgricultural = Boolean(obj.is_agricultural);
                result.validator.confidence = Number(obj.confidence ?? 0) || 0;
                result.validator.accepted = result.validator.isAgricultural;
                result.validator.reason = result.validator.accepted
                  ? "is_agricultural=true"
                  : "model classified image as non-agricultural";
              } else {
                result.validator.reason = "no_json_object_in_text";
              }
            } catch (pe) {
              result.parsed.parseError = String(pe);
              result.validator.reason = "json_parse_failed";
            }
          } else {
            result.validator.reason = "empty_text_in_response";
          }
        } catch (pe) {
          result.parsed.parseError = String(pe);
          result.validator.reason = "response_not_json";
        }
      } else {
        result.validator.reason = `http_${r.status}`;
      }
    } catch (e) {
      result.exception = { message: String((e as Error)?.message ?? e), stack: String((e as Error)?.stack ?? "") };
      result.validator.reason = "network_exception";
      console.error("[FarmSmartAI][debug] exception", result.exception);
    }

    // Groq probe
    const gKey = process.env.GROQ_API_KEY;
    if (!gKey) {
      result.groq.error = "missing_groq_key";
    } else {
      const t1 = Date.now();
      try {
        result.groq.sent = true;
        const gr = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${gKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: "Return only JSON." },
              { role: "user", content: 'Reply with {"ok":true,"provider":"groq"}.' },
            ],
            max_tokens: 64,
          }),
        });
        result.groq.httpStatus = gr.status;
        result.groq.ok = gr.ok;
        result.groq.durationMs = Date.now() - t1;
        const gtxt = await gr.text().catch(() => "");
        if (gr.ok) {
          try {
            const gj = JSON.parse(gtxt);
            const content = gj.choices?.[0]?.message?.content ?? "";
            result.groq.parsed = typeof content === "string" ? content : JSON.stringify(content);
          } catch (pe) {
            result.groq.error = `parse_failed: ${String(pe)}`;
          }
        } else {
          result.groq.error = redactDetail(gtxt).slice(0, 500);
        }
        console.info("[FarmSmartAI][debug] Groq status", { status: gr.status, ok: gr.ok });
      } catch (e) {
        result.groq.error = `network: ${String(e)}`;
      }
    }

    return result;
  });
