// TensorFlow.js was removed from the ensemble — its bundle (>10MB) caused
// Cloudflare Workers build timeouts. Detection now uses Gemini + Groq Vision only.
import { geminiDetect, NonAgriculturalImageError, type VisionResult } from "./geminiDiseaseService";
import { groqVisionDetect } from "./groqVisionService";
import { stripBase64Prefix } from "@/lib/geminiApi";
import { formatDiseaseName, getCropFromLabel } from "@/constants/plantvillageLabels";

export interface AISource {
  name: "gemini" | "groq_vision";
  ok: boolean;
  result?: VisionResult;
  error?: string;
}

export interface EnsembleVerdict {
  label: string;
  diseaseName: string;
  diseaseNameFormatted: string;
  cropType: string;
  severity: "mild" | "moderate" | "severe";
  confidence: number;
  agreementCount: number;
  consensus: "very_high" | "high" | "moderate" | "uncertain";
  sources: AISource[];
}

const WEIGHTS = { gemini: 0.55, groq_vision: 0.45 };

export async function runEnsemble(base64DataUrl: string): Promise<EnsembleVerdict> {
  const clean = stripBase64Prefix(base64DataUrl);

  const [gemRes, groqRes] = await Promise.allSettled([
    geminiDetect(base64DataUrl),
    groqVisionDetect(clean),
  ]);

  // If either vision model explicitly flagged the image as non-agricultural, refuse to diagnose.
  if (gemRes.status === "rejected" && gemRes.reason instanceof NonAgriculturalImageError) {
    throw gemRes.reason;
  }
  if (groqRes.status === "rejected" && groqRes.reason instanceof NonAgriculturalImageError) throw groqRes.reason;


  const sources: AISource[] = [
    { name: "gemini", ok: gemRes.status === "fulfilled", result: gemRes.status === "fulfilled" ? gemRes.value : undefined, error: gemRes.status === "rejected" ? String(gemRes.reason) : undefined },
    { name: "groq_vision", ok: groqRes.status === "fulfilled", result: groqRes.status === "fulfilled" ? groqRes.value : undefined, error: groqRes.status === "rejected" ? String(groqRes.reason) : undefined },
  ];

  const tally = new Map<string, number>();
  for (const s of sources) {
    if (s.ok && s.result) {
      tally.set(s.result.label, (tally.get(s.result.label) ?? 0) + WEIGHTS[s.name] * s.result.confidence);
    }
  }

  let topLabel = "";
  let topScore = 0;
  for (const [k, v] of tally) {
    if (v > topScore) { topScore = v; topLabel = k; }
  }

  if (!topLabel) {
    throw new Error(`No AI diagnosis returned. Gemini: ${sources[0].error || "no result"}; Groq: ${sources[1].error || "no result"}`);
  }

  const okSources = sources.filter((s) => s.ok && s.result);
  const agreementCount = okSources.filter((s) => s.result!.label === topLabel).length;

  let consensus: EnsembleVerdict["consensus"];
  if (agreementCount >= 2) consensus = "high";
  else if (okSources.length === 1) consensus = "moderate";
  else consensus = "uncertain";

  const agreeing = okSources.filter((s) => s.result!.label === topLabel);
  const avgConf = agreeing.reduce((a, s) => a + s.result!.confidence, 0) / Math.max(1, agreeing.length);
  const finalConfidence = Math.round(avgConf * 100);

  const sevCounts: Record<string, number> = {};
  agreeing.forEach((s) => (sevCounts[s.result!.severity] = (sevCounts[s.result!.severity] ?? 0) + 1));
  const severity = (Object.entries(sevCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "moderate") as "mild" | "moderate" | "severe";

  return {
    label: topLabel,
    diseaseName: agreeing[0]?.result?.diseaseName || formatDiseaseName(topLabel),
    diseaseNameFormatted: formatDiseaseName(topLabel),
    cropType: getCropFromLabel(topLabel),
    severity, confidence: finalConfidence, agreementCount, consensus, sources,
  };
}
