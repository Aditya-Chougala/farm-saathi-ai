import { groqVision } from "@/lib/groqApi";
import { PLANTVILLAGE_LABELS } from "@/constants/plantvillageLabels";
import type { VisionResult } from "./geminiDiseaseService";

const PROMPT = `Identify plant disease in this leaf image. Reply ONLY with raw JSON, no markdown:
{"label":"<PlantVillage label>","diseaseName":"<short name>","confidence":<0..1>,"severity":"mild"|"moderate"|"severe"}
Allowed labels: ${PLANTVILLAGE_LABELS.slice(0, 30).join(", ")}`;

export async function groqVisionDetect(base64NoPrefix: string): Promise<VisionResult> {
  const text = await groqVision(base64NoPrefix, PROMPT);
  const cleaned = text.replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("groq_vision_no_json");
  const obj = JSON.parse(cleaned.slice(s, e + 1));
  return {
    label: String(obj.label || "Tomato___Early_blight"),
    confidence: Number(obj.confidence ?? 0.55),
    diseaseName: String(obj.diseaseName || "Unknown"),
    severity: (obj.severity as VisionResult["severity"]) || "moderate",
  };
}
