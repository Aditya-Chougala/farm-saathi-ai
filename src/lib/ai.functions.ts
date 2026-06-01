// Server functions proxying Gemini and Groq so API keys stay server-side.
import { createServerFn } from "@tanstack/react-start";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const geminiVisionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string; prompt: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("missing_gemini_key");
    const clean = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: data.prompt }, { inline_data: { mime_type: "image/jpeg", data: clean } }] },
        ],
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`gemini_${r.status}: ${t.slice(0, 80)}`);
    }
    const j = await r.json();
    return { text: (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string };
  });

export const geminiTextFn = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("missing_gemini_key");
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: data.prompt }] }] }),
    });
    if (!r.ok) return { text: "" };
    const j = await r.json();
    return { text: (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string };
  });

export const groqChatFn = createServerFn({ method: "POST" })
  .inputValidator((d: { body: unknown }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("missing_groq_key");
    let delay = 2000;
    for (let i = 0; i < 3; i++) {
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(data.body),
      });
      if (r.ok) return await r.json();
      if (r.status === 429 && i < 2) {
        await new Promise((res) => setTimeout(res, delay));
        delay += 2000;
        continue;
      }
      const txt = await r.text().catch(() => "");
      throw new Error(`groq_${r.status}: ${txt.slice(0, 80)}`);
    }
    throw new Error("groq_retries_exhausted");
  });
