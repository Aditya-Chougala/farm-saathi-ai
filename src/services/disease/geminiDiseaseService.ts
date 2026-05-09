import { geminiVision } from "@/lib/geminiApi";
import { PLANTVILLAGE_LABELS } from "@/constants/plantvillageLabels";

export interface VisionResult {
  label: string;
  confidence: number;
  diseaseName: string;
  severity: "mild" | "moderate" | "severe";
}

const PROMPT = `You are a plant pathology expert. Analyze this leaf image and identify any disease.
Respond ONLY with valid JSON, no markdown:
{
  "label": "<one PlantVillage style label like Tomato___Late_blight>",
  "diseaseName": "<short readable disease name>",
  "confidence": <0..1 number>,
  "severity": "mild" | "moderate" | "severe"
}
Allowed labels: ${PLANTVILLAGE_LABELS.join(", ")}`;

function parse(text: string): VisionResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no_json");
  const obj = JSON.parse(cleaned.slice(start, end + 1));
  return {
    label: String(obj.label || "Tomato___Early_blight"),
    confidence: Number(obj.confidence ?? 0.6),
    diseaseName: String(obj.diseaseName || obj.label || "Unknown"),
    severity: (obj.severity as VisionResult["severity"]) || "moderate",
  };
}

export async function geminiDetect(base64: string): Promise<VisionResult> {
  const text = await geminiVision(base64, PROMPT);
  return parse(text);
}
