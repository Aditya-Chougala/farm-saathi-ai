// Gemini Vision via server function (key stays on the server).
import { geminiVisionFn } from "./ai.functions";

export class GeminiError extends Error {
  status: number;
  code: string;
  constructor(code: string, status: number, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
    this.status = status;
  }
}

export function stripBase64Prefix(b64: string): string {
  return b64.includes(",") ? b64.split(",")[1] : b64;
}

export async function geminiVision(base64: string, prompt: string): Promise<string> {
  const res = (await geminiVisionFn({ data: { base64, prompt } })) as {
    text: string;
    error?: string;
    status?: number;
    detail?: string;
  };
  if (res.error) throw new GeminiError(res.error, res.status ?? 0, res.detail);
  return res.text;
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
  const cleaned = text.replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e < 0) throw new GeminiError("gemini_no_json", 0, text.slice(0, 200));
  const obj = JSON.parse(cleaned.slice(s, e + 1));
  return {
    detected_object: String(obj.detected_object ?? "unknown"),
    is_agricultural: Boolean(obj.is_agricultural),
    confidence: Number(obj.confidence ?? 0),
    diagnosis: String(obj.diagnosis ?? ""),
    recommendations: Array.isArray(obj.recommendations) ? obj.recommendations.map(String) : [],
    extra: obj.extra ?? {},
  };
}
