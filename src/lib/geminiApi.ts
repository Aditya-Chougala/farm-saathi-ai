// Gemini Vision via server function (key stays on the server).
import { geminiVisionFn, testGeminiConnectionFn } from "./ai.functions";

export class GeminiError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
    this.status = status;
  }
}

export function describeAiError(e: unknown): string {
  if (e instanceof GeminiError) {
    if (e.code === "missing_gemini_key") return "Missing API key: GEMINI_API_KEY is not configured.";
    if (e.code === "invalid_image") return "Invalid image: upload a valid JPG, PNG, or WebP image.";
    if (e.code === "gemini_quota_exceeded" || e.status === 429) return `Quota exceeded: ${e.message}`;
    if (e.code === "gemini_network") return `Network failure: ${e.message}`;
    if (e.code === "gemini_model_error") return `Model error: ${e.message}`;
    if (e.code === "gemini_invalid_response" || e.code === "gemini_no_json" || e.code === "gemini_truncated") return `Invalid response: ${e.message}`;
    return `${e.code}: ${e.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}

export function stripBase64Prefix(b64: string): string {
  return b64.includes(",") ? b64.split(",")[1] : b64;
}

export async function geminiVision(base64: string, prompt: string): Promise<string> {
  console.info("[FarmSmartAI] API request started", { provider: "Gemini", imageBytesApprox: stripBase64Prefix(base64).length });
  const res = (await geminiVisionFn({ data: { base64, prompt } })) as {
    text: string;
    error?: string;
    status?: number;
    detail?: string;
    model?: string;
    raw?: string;
  };
  console.info("[FarmSmartAI] API response received", { provider: "Gemini", model: res.model, error: res.error, textChars: res.text?.length ?? 0 });
  if (res.error) throw new GeminiError(res.error, res.status ?? 0, res.detail);
  return res.text;
}

export async function testGeminiConnection(base64: string) {
  console.info("[FarmSmartAI] API request started", { provider: "Gemini", purpose: "connection-test" });
  const res = (await testGeminiConnectionFn({ data: { base64 } })) as {
    text: string;
    error?: string;
    status?: number;
    detail?: string;
    model?: string;
    raw?: string;
  };
  console.info("[FarmSmartAI] API response received", { provider: "Gemini", purpose: "connection-test", error: res.error, textChars: res.text?.length ?? 0 });
  if (res.error) throw new GeminiError(res.error, res.status ?? 0, res.detail);
  return res;
}

export function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*|```/gi, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new GeminiError("gemini_no_json", 0, text.slice(0, 300));
  const candidate = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(candidate);
  } catch (e) {
    throw new GeminiError("gemini_invalid_response", 0, `${String(e)} | ${candidate.slice(0, 300)}`);
  }
}

// Structured agricultural-image analyzer. Asks Gemini to first classify the
// image and refuse non-agricultural input.
export interface AgriAnalysis {
  detected_object: string;
  is_agricultural: boolean;
  confidence: number; // 0..1
  diagnosis: string;
  recommendations: string[];
  // task-specific optional fields the caller can read
  extra?: Record<string, unknown>;
}

export async function analyzeAgriImage(
  base64: string,
  task: "soil" | "disease" | "crop" | "pest",
  extraInstructions = "",
): Promise<AgriAnalysis> {
  const taskHint = {
    soil: "Classify the soil (Red soil, Black soil, Sandy soil, Loamy soil, or Clay soil), estimate pH (5.5-8.5), and N/P/K levels (low|medium|high). Put these in `extra` as {soilType,ph,nutrients:{N,P,K}}.",
    disease: "Identify the crop and any disease using a PlantVillage-style label (e.g. Tomato___Late_blight). Put it in `extra` as {label,diseaseName,severity:'mild'|'moderate'|'severe'}.",
    crop: "Identify the crop species and growth stage. Put it in `extra` as {crop,stage}.",
    pest: "Identify the pest species. Put it in `extra` as {pest,scientificName}.",
  }[task];

  const prompt = `You are an agricultural vision assistant. Look at the image.

STEP 1 — Identify what is actually in the image (a leaf, soil, a crop, a pest, OR something unrelated like a car, person, building, food, screenshot, etc.).
STEP 2 — Decide if the image is agricultural and relevant to the task: "${task}".
STEP 3 — If NOT agricultural/relevant, set is_agricultural=false and diagnosis="This image does not appear to be a plant, crop, soil sample, or agricultural disease." Leave recommendations empty and extra={}.
STEP 4 — If agricultural, perform the task. ${taskHint}
${extraInstructions}

Reply ONLY with raw JSON matching this exact schema, no markdown:
{
  "detected_object": "<what you see>",
  "is_agricultural": true|false,
  "confidence": <0..1>,
  "diagnosis": "<one short sentence>",
  "recommendations": ["..", "..", ".."],
  "extra": { ... }
}`;

  const text = await geminiVision(base64, prompt);
  const obj = extractJsonObject(text) as Record<string, unknown>;
  console.info("[FarmSmartAI] parsed result", { task, result: obj });
  return {
    detected_object: String(obj.detected_object ?? "unknown"),
    is_agricultural: Boolean(obj.is_agricultural),
    confidence: Number(obj.confidence ?? 0),
    diagnosis: String(obj.diagnosis ?? ""),
    recommendations: Array.isArray(obj.recommendations) ? obj.recommendations.map(String) : [],
    extra: obj.extra ?? {},
  };
}
