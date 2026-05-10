import { tfDetect, loadImage } from "./tensorflowService";
import { geminiDetect, type VisionResult } from "./geminiDiseaseService";
import { groqVisionDetect } from "./groqVisionService";
import { stripBase64Prefix } from "@/lib/geminiApi";
import { formatDiseaseName, getCropFromLabel } from "@/constants/plantvillageLabels";

export interface AISource {
  name: "tensorflow" | "gemini" | "groq_vision";
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
  confidence: number; // 0..100
  agreementCount: number; // out of 3
  consensus: "very_high" | "high" | "moderate" | "uncertain";
  sources: AISource[];
}

const WEIGHTS = { tensorflow: 0.25, gemini: 0.4, groq_vision: 0.35 };

export async function runEnsemble(base64DataUrl: string): Promise<EnsembleVerdict> {
  const clean = stripBase64Prefix(base64DataUrl);

  const tfPromise = (async (): Promise<VisionResult> => {
    const img = await loadImage(base64DataUrl);
    const r = await tfDetect(img);
    return {
      label: r.label,
      confidence: r.confidence,
      diseaseName: formatDiseaseName(r.label),
      severity: r.confidence > 0.7 ? "severe" : r.confidence > 0.4 ? "moderate" : "mild",
    };
  })();

  const [tfRes, gemRes, groqRes] = await Promise.allSettled([
    tfPromise,
    geminiDetect(base64DataUrl),
    groqVisionDetect(clean),
  ]);

  const sources: AISource[] = [
    { name: "tensorflow", ok: tfRes.status === "fulfilled", result: tfRes.status === "fulfilled" ? tfRes.value : undefined, error: tfRes.status === "rejected" ? String(tfRes.reason) : undefined },
    { name: "gemini", ok: gemRes.status === "fulfilled", result: gemRes.status === "fulfilled" ? gemRes.value : undefined, error: gemRes.status === "rejected" ? String(gemRes.reason) : undefined },
    { name: "groq_vision", ok: groqRes.status === "fulfilled", result: groqRes.status === "fulfilled" ? groqRes.value : undefined, error: groqRes.status === "rejected" ? String(groqRes.reason) : undefined },
  ];

  // Fallback: if Gemini failed but Groq Vision succeeded, reuse Groq result as Gemini -5%
  if (!sources[1].ok && sources[2].ok && sources[2].result) {
    sources[1] = {
      name: "gemini",
      ok: true,
      result: { ...sources[2].result, confidence: Math.max(0, sources[2].result.confidence - 0.05) },
    };
  }
  // Reverse fallback: if Groq Vision failed but Gemini succeeded, reuse Gemini as Groq -5%
  if (!sources[2].ok && sources[1].ok && sources[1].result) {
    sources[2] = {
      name: "groq_vision",
      ok: true,
      result: { ...sources[1].result, confidence: Math.max(0, sources[1].result.confidence - 0.05) },
    };
  }

  // Weighted voting on disease label
  const tally = new Map<string, number>();
  for (const s of sources) {
    if (s.ok && s.result) {
      tally.set(s.result.label, (tally.get(s.result.label) ?? 0) + WEIGHTS[s.name] * s.result.confidence);
    }
  }

  let topLabel = "";
  let topScore = 0;
  for (const [k, v] of tally) {
    if (v > topScore) {
      topScore = v;
      topLabel = k;
    }
  }

  if (!topLabel) {
    // All failed
    return {
      label: "Tomato___healthy",
      diseaseName: "Unknown",
      diseaseNameFormatted: "Unable to detect",
      cropType: "Unknown",
      severity: "mild",
      confidence: 0,
      agreementCount: 0,
      consensus: "uncertain",
      sources,
    };
  }

  // Count how many sources agree on top label
  const okSources = sources.filter((s) => s.ok && s.result);
  const agreementCount = okSources.filter((s) => s.result!.label === topLabel).length;

  // TF only result > 30% confidence = Moderate (not uncertain)
  const tfOnly = okSources.length === 1 && sources[0].ok;
  const tfConf = sources[0].result?.confidence ?? 0;

  let consensus: EnsembleVerdict["consensus"];
  if (agreementCount >= 3) consensus = "very_high";
  else if (agreementCount === 2) consensus = "high";
  else if (tfOnly && tfConf > 0.3) consensus = "moderate";
  else consensus = okSources.length === 1 ? "moderate" : "uncertain";

  // Average confidence across agreeing sources
  const agreeing = okSources.filter((s) => s.result!.label === topLabel);
  const avgConf =
    agreeing.reduce((a, s) => a + s.result!.confidence, 0) / Math.max(1, agreeing.length);
  const finalConfidence = Math.round(avgConf * 100);

  // Severity = majority among agreeing
  const sevCounts: Record<string, number> = {};
  agreeing.forEach((s) => (sevCounts[s.result!.severity] = (sevCounts[s.result!.severity] ?? 0) + 1));
  const severity = (Object.entries(sevCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "moderate") as "mild" | "moderate" | "severe";

  return {
    label: topLabel,
    diseaseName: agreeing[0]?.result?.diseaseName || formatDiseaseName(topLabel),
    diseaseNameFormatted: formatDiseaseName(topLabel),
    cropType: getCropFromLabel(topLabel),
    severity,
    confidence: finalConfidence,
    agreementCount,
    consensus,
    sources,
  };
}
