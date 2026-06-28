import { Camera, Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { analyzeAgriImage, describeAiError, testGeminiConnection } from "@/lib/geminiApi";
import { useLang } from "@/i18n/LanguageContext";
import { SOIL_TYPES } from "@/lib/demoResults";

export interface SoilAnalysis {
  soilType: string;
  soilTypeHindi: string;
  ph: number;
  nutrients: { N: string; P: string; K: string };
  imageDataUrl: string;
  confidence: number;
  detectedObject: string;
}

interface Props {
  onComplete: (s: SoilAnalysis) => void;
}

export function SoilAnalyzer({ onComplete }: Props) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [rawTest, setRawTest] = useState<string | null>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    console.info("[FarmSmartAI] image selected", { feature: "soil", name: f.name, type: f.type, size: f.size });
    setErr(null);
    setConfidence(null);
    setRawTest(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      console.info("[FarmSmartAI] image processed", { feature: "soil", dataUrlChars: dataUrl.length });
      setPreview(dataUrl);
    };
    reader.onerror = () => {
      console.error("[FarmSmartAI] failure reason", { feature: "soil", reason: "FileReader failed" });
      setErr("Invalid image: the selected file could not be read.");
    };
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!preview) return;
    setLoading(true);
    setErr(null);
    try {
      console.info("[FarmSmartAI] API request started", { feature: "soil-analysis" });
      const result = await analyzeAgriImage(preview, "soil");
      setConfidence(result.confidence);
      if (!result.is_agricultural) {
        setErr(
          result.diagnosis ||
            "This image does not appear to be a plant, crop, soil sample, or agricultural disease.",
        );
        return;
      }
      const ex = (result.extra ?? {}) as {
        soilType?: string;
        ph?: number;
        nutrients?: { N: string; P: string; K: string };
      };
      if (!ex.soilType) throw new Error("Invalid response: Gemini did not return soilType.");
      if (!Number.isFinite(Number(ex.ph))) throw new Error("Invalid response: Gemini did not return a numeric pH.");
      if (!ex.nutrients?.N || !ex.nutrients?.P || !ex.nutrients?.K) throw new Error("Invalid response: Gemini did not return N/P/K nutrients.");
      const found =
        SOIL_TYPES.find((x) => x.en.toLowerCase() === String(ex.soilType).toLowerCase());
      if (!found) throw new Error(`Invalid response: unsupported soil type "${String(ex.soilType)}".`);
      console.info("[FarmSmartAI] parsed result", { feature: "soil", result });
      onComplete({
        soilType: found.en,
        soilTypeHindi: found.hi,
        ph: Number(ex.ph) || 6.8,
        nutrients: ex.nutrients ?? { N: "medium", P: "medium", K: "medium" },
        imageDataUrl: preview,
        confidence: result.confidence,
        detectedObject: result.detected_object,
      });
    } catch (e) {
      const msg = describeAiError(e);
      console.error("[FarmSmartAI] failure reason", { feature: "soil", error: msg });
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!preview) return;
    setLoading(true);
    setErr(null);
    setRawTest(null);
    try {
      const res = await testGeminiConnection(preview);
      setRawTest(res.text || res.raw || "No text returned");
      console.info("[FarmSmartAI] parsed result", { feature: "gemini-test", raw: res.text });
    } catch (e) {
      const msg = describeAiError(e);
      console.error("[FarmSmartAI] failure reason", { feature: "gemini-test", error: msg });
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <h2 className="font-bold text-lg text-primary mb-1">{t("soilPhoto")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("takeOrUpload")}</p>

        {preview ? (
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3">
            <img src={preview} alt="soil" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-secondary/40 flex items-center justify-center text-6xl mb-3">
            🪴
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => camRef.current?.click()}
            className="min-touch gradient-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition shadow-md">
            <Camera className="w-5 h-5" />
            {t("takePhoto")}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="min-touch bg-secondary text-secondary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition">
            <Upload className="w-5 h-5" />
            {t("uploadPhoto")}
          </button>
        </div>

        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />

        {preview && (
          <div className="mt-3 grid gap-2">
            <button onClick={analyze} disabled={loading}
              className="w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {t("analyzeSoil")}
            </button>
            <button onClick={testConnection} disabled={loading}
              className="w-full min-touch bg-secondary text-secondary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              Test AI Connection
            </button>
          </div>
        )}
        {confidence !== null && !err && (
          <p className="text-xs text-muted-foreground mt-2">
            AI confidence: <b>{Math.round(confidence * 100)}%</b>
          </p>
        )}
        {err && <p className="text-destructive text-xs mt-2">{err}</p>}
        {rawTest && (
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-secondary/60 p-2 text-[10px] whitespace-pre-wrap break-words">
            {rawTest}
          </pre>
        )}
      </div>
    </div>
  );
}
