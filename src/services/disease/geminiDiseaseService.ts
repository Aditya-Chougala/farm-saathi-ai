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
  return {
    label: String(ex.label || "Tomato___Early_blight"),
    confidence: Number(result.confidence ?? 0.6),
    diseaseName: String(ex.diseaseName || result.diagnosis || "Unknown"),
    severity: (ex.severity as VisionResult["severity"]) || "moderate",
  };
}
