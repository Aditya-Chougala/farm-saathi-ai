// Groq text + vision (browser-side as user requested VITE_ keys)
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const KEY = (import.meta as any).env?.VITE_GROQ_API_KEY as string | undefined;

async function callGroq(body: any, retries = 3): Promise<any> {
  if (!KEY) throw new Error("missing_groq_key");
  let delay = 2000;
  for (let i = 0; i < retries; i++) {
    const r = await fetch(`${GROQ_URL}?t=${Date.now()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (r.ok) return r.json();
    if (r.status === 429 && i < retries - 1) {
      await new Promise((res) => setTimeout(res, delay));
      delay += 2000;
      continue;
    }
    const txt = await r.text().catch(() => "");
    throw new Error(`groq_${r.status}: ${txt.slice(0, 80)}`);
  }
}

function extractJson(text: string): any {
  // Strip ```json fences and find outermost JSON
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
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

export async function groqVision(base64NoPrefix: string, prompt: string): Promise<string> {
  let lastErr: any;
  for (const model of VISION_MODELS) {
    try {
      const j = await callGroq(
        {
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64NoPrefix}` },
                },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 512,
        },
        1,
      );
      return j.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("groq_vision_all_failed");
}
