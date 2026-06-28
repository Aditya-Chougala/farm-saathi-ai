import { analyzeAgriImage } from "@/lib/geminiApi";
import { PLANTVILLAGE_LABELS } from "@/constants/plantvillageLabels";

export interface VisionResult {
  label: string;
  confidence: number;
  diseaseName: string;
  severity: "mild" | "moderate" | "severe";
}

export class NonAgriculturalImageError extends Error {
  detectedObject: string;
  constructor(detectedObject: string) {
    super("This image does not appear to be a plant, crop, soil sample, or agricultural disease.");
    this.name = "NonAgriculturalImageError";
    this.detectedObject = detectedObject;
  }
}

const ALLOWED = `Allowed PlantVillage labels (pick the closest): ${PLANTVILLAGE_LABELS.join(", ")}`;

export async function geminiDetect(base64DataUrl: string): Promise<VisionResult> {
  const result = await analyzeAgriImage(base64DataUrl, "disease", ALLOWED);
  if (!result.is_agricultural) {
    throw new NonAgriculturalImageError(result.detected_object);
  }
  const ex = (result.extra ?? {}) as {
    label?: string;
    diseaseName?: string;
    severity?: VisionResult["severity"];
  };
  const label = String(ex.label || "");
  const severity = ex.severity;
  if (!(PLANTVILLAGE_LABELS as readonly string[]).includes(label)) throw new Error(`gemini_invalid_disease_label: ${label || "missing"}`);
  if (severity !== "mild" && severity !== "moderate" && severity !== "severe") throw new Error(`gemini_invalid_severity: ${String(severity)}`);
  if (!Number.isFinite(result.confidence)) throw new Error("gemini_invalid_confidence");
  return {
    label,
    confidence: Math.max(0, Math.min(1, Number(result.confidence))),
    diseaseName: String(ex.diseaseName || result.diagnosis || label),
    severity,
  };
}
