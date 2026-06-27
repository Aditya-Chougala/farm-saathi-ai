// Server functions proxying Gemini and Groq so API keys stay server-side.
import { createServerFn } from "@tanstack/react-start";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const geminiVisionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { base64: string; prompt: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { text: "", error: "missing_gemini_key", status: 0 };
    const clean = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: data.prompt }, { inline_data: { mime_type: "image/jpeg", data: clean } }] },
          ],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        return { text: "", error: `gemini_${r.status}`, status: r.status, detail: t.slice(0, 200) };
      }
      const j = await r.json();
      return { text: (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string };
    } catch (e) {
      return { text: "", error: "gemini_network", status: 0, detail: String(e).slice(0, 200) };
    }
  });

export const geminiTextFn = createServerFn({ method: "POST" })
  .inputValidator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return { text: "", error: "missing_gemini_key" };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: data.prompt }] }] }),
      });
      if (!r.ok) return { text: "", error: `gemini_${r.status}` };
      const j = await r.json();
      return { text: (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "") as string };
    } catch (e) {
      return { text: "", error: "gemini_network", detail: String(e).slice(0, 200) };
    }
  });


export const groqChatFn = createServerFn({ method: "POST" })
  .inputValidator((d: { body: unknown }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) return { error: "missing_groq_key", status: 0 };
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
      return { error: `groq_${r.status}`, status: r.status, detail: txt.slice(0, 200) };
    }
    return { error: "groq_retries_exhausted", status: 0 };
  });
