// Gemini Vision (browser-side, VITE_ key as requested)
const KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;

export function stripBase64Prefix(b64: string): string {
  return b64.includes(",") ? b64.split(",")[1] : b64;
}

export async function geminiVision(base64: string, prompt: string): Promise<string> {
  if (!KEY) throw new Error("missing_gemini_key");
  const clean = stripBase64Prefix(base64);
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${KEY}&t=${Date.now()}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: clean } },
          ],
        },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`gemini_${r.status}: ${t.slice(0, 80)}`);
  }
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
