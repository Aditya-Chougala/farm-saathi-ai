import { groqVision } from "@/lib/groqApi";
import { PLANTVILLAGE_LABELS } from "@/constants/plantvillageLabels";
import { NonAgriculturalImageError, type VisionResult } from "./geminiDiseaseService";

const PROMPT = `Identify plant disease in this image. First decide if it is a plant/crop/leaf image. Healthy crop leaves are valid. Reply ONLY with raw JSON, no markdown:
{"detected_object":"<what you see>","is_agricultural":true|false,"label":"<PlantVillage label>","diseaseName":"<short name>","confidence":<0..1>,"severity":"mild"|"moderate"|"severe"}
Allowed labels: ${PLANTVILLAGE_LABELS.slice(0, 30).join(", ")}`;

export async function groqVisionDetect(base64NoPrefix: string): Promise<VisionResult> {
  const text = await groqVision(base64NoPrefix, PROMPT);
  const cleaned = text.replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("groq_vision_no_json");
  const obj = JSON.parse(cleaned.slice(s, e + 1));
  if (obj.is_agricultural === false) throw new NonAgriculturalImageError(String(obj.detected_object || "unknown"));
  const label = String(obj.label || "");
  const severity = obj.severity as VisionResult["severity"];
  if (!PLANTVILLAGE_LABELS.includes(label)) throw new Error(`groq_invalid_disease_label: ${label || "missing"}`);
  if (severity !== "mild" && severity !== "moderate" && severity !== "severe") throw new Error(`groq_invalid_severity: ${String(severity)}`);
  return {
    label,
    confidence: Math.max(0, Math.min(1, Number(obj.confidence))),
    diseaseName: String(obj.diseaseName || label),
    severity,
  };
}
