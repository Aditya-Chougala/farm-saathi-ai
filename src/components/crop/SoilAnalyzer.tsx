import { Camera, Upload, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { geminiVision } from "@/lib/geminiApi";
import { Bi, useLang } from "@/i18n/LanguageContext";
import { SOIL_TYPES } from "@/lib/demoResults";

export interface SoilAnalysis {
  soilType: string;
  soilTypeHindi: string;
  ph: number;
  nutrients: { N: string; P: string; K: string };
  imageDataUrl: string;
}

interface Props {
  onComplete: (s: SoilAnalysis) => void;
}

const PROMPT = `Analyze this soil photo. Reply ONLY raw JSON:
{"soilType":"<one of: Red soil, Black soil, Sandy soil, Loamy soil, Clay soil>","ph":<number 5.5..8.5>,"nutrients":{"N":"low|medium|high","P":"low|medium|high","K":"low|medium|high"}}`;

export function SoilAnalyzer({ onComplete }: Props) {
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!preview) return;
    setLoading(true);
    setErr(null);
    try {
      const text = await geminiVision(preview, PROMPT);
      const cleaned = text.replace(/```json|```/g, "").trim();
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      const obj = JSON.parse(cleaned.slice(s, e + 1));
      const found = SOIL_TYPES.find((x) => x.en.toLowerCase() === String(obj.soilType).toLowerCase()) ?? SOIL_TYPES[3];
      onComplete({
        soilType: found.en,
        soilTypeHindi: found.hi,
        ph: Number(obj.ph) || 6.8,
        nutrients: obj.nutrients ?? { N: "medium", P: "medium", K: "medium" },
        imageDataUrl: preview,
      });
    } catch {
      // fallback demo
      onComplete({
        soilType: "Loamy soil",
        soilTypeHindi: "दोमट मिट्टी",
        ph: 6.8,
        nutrients: { N: "medium", P: "medium", K: "medium" },
        imageDataUrl: preview,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <h2 className="font-bold text-lg text-primary mb-1">मिट्टी की फोटो</h2>
        <p className="text-xs text-muted-foreground mb-4">Take or upload a clear soil photo</p>

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
          <button
            onClick={() => camRef.current?.click()}
            className="min-touch gradient-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition shadow-md"
          >
            <Camera className="w-5 h-5" />
            {t("takePhoto")}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="min-touch bg-secondary text-secondary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Upload className="w-5 h-5" />
            {t("uploadPhoto")}
          </button>
        </div>

        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />

        {preview && (
          <button
            onClick={analyze}
            disabled={loading}
            className="mt-3 w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            <Bi k="analyzeSoil" />
          </button>
        )}
        {err && <p className="text-destructive text-xs mt-2">{err}</p>}
      </div>
    </div>
  );
}
