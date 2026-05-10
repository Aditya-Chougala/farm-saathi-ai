import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Loader2, Share2, MapPin, Bell, RotateCw, X } from "lucide-react";
import { runEnsemble, type EnsembleVerdict } from "@/services/disease/ensembleEngine";
import { getTreatment, type Treatment } from "@/services/disease/groqTreatmentService";
import { diseaseHindi } from "@/constants/diseaseTranslations";
import { saveData, getData } from "@/lib/db";
import { Bi } from "@/i18n/LanguageContext";

export const Route = createFileRoute("/disease")({
  head: () => ({
    meta: [
      { title: "Disease Detection — FarmSmart AI" },
      { name: "description", content: "Scan a crop leaf with 3-AI ensemble (TensorFlow + Gemini + Groq Vision) for accurate diagnosis." },
    ],
  }),
  component: DiseaseDetection,
});

interface HistoryItem {
  id: string;
  date: number;
  imageThumb: string;
  cropType: string;
  diseaseName: string;
  severity: string;
  confidence: number;
}

function fileToResizedDataUrl(file: File, size = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no_canvas_ctx"));
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function DiseaseDetection() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<EnsembleVerdict | null>(null);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const [camOpen, setCamOpen] = useState(false);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) await loadFile(file);
    };
    input.click();
  };

  const handleCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      handleUpload();
      return;
    }
    try {
      // probe permission by opening modal which will request stream
      setCamOpen(true);
    } catch {
      handleUpload();
    }
  };

  const loadFile = async (file: File) => {
    try {
      const dataUrl = await fileToResizedDataUrl(file, 512);
      console.log("Image base64 length:", dataUrl.split(",")[1].length);
      setPreview(dataUrl);
      setVerdict(null);
      setTreatment(null);
    } catch (e) {
      console.error("loadFile failed", e);
    }
  };

  const scan = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const v = await runEnsemble(preview);
      console.log("Ensemble verdict:", v);
      setVerdict(v);
      const hist = (getData<HistoryItem[]>("farmsmart_disease_history") ?? []) as HistoryItem[];
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        date: Date.now(),
        imageThumb: preview.slice(0, 200000),
        cropType: v.cropType,
        diseaseName: v.diseaseNameFormatted,
        severity: v.severity,
        confidence: v.confidence,
      };
      saveData("farmsmart_disease_history", [item, ...hist].slice(0, 5));
      const t = await getTreatment(v.label, v.severity);
      setTreatment(t);
    } finally {
      setLoading(false);
    }
  };

  const shareWA = () => {
    if (!verdict) return;
    const txt = `🌿 FarmSmart AI - फसल रोग रिपोर्ट
━━━━━━━━━━━━━━━
🌾 फसल: ${verdict.cropType}
🦠 रोग: ${diseaseHindi(verdict.label)}
📊 विश्वास: ${verdict.confidence}%
⚠️ गंभीरता: ${verdict.severity}
━━━━━━━━━━━━━━━
💊 उपचार: ${treatment?.organicTreatment.steps[0] ?? "उपचार जल्द"}
━━━━━━━━━━━━━━━
🤖 ${verdict.agreementCount}/3 AI सहमत
📱 FarmSmart AI द्वारा`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };

  const findDealer = () => {
    const q = encodeURIComponent("agricultural pesticide dealer near me");
    window.open(`https://www.google.com/maps/search/${q}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4">
        <h2 className="font-bold text-primary text-lg mb-1">रोग पहचान</h2>
        <p className="text-xs text-muted-foreground mb-3">3 AI एक साथ — TensorFlow + Gemini + Groq</p>

        {preview ? (
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-3">
            <img src={preview} alt="leaf" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-square rounded-xl border-2 border-dashed border-primary/40 bg-secondary/40 flex flex-col items-center justify-center mb-3 text-center px-4">
            <div className="text-6xl">🍃</div>
            <p className="text-xs text-muted-foreground mt-2">रोगी पत्ती की साफ़ फोटो लें</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={handleCamera} className="min-touch gradient-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md active:scale-95 transition">
            <Camera className="w-5 h-5" /> कैमरा
          </button>
          <button type="button" onClick={handleUpload} className="min-touch bg-secondary rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition">
            <Upload className="w-5 h-5" /> अपलोड
          </button>
        </div>

        {preview && !verdict && (
          <button onClick={scan} disabled={loading} className="mt-3 w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> पहचान हो रही है...</> : <><RotateCw className="w-5 h-5" /> स्कैन करें / Scan</>}
          </button>
        )}
      </div>

      {verdict && <VerdictCard verdict={verdict} />}
      {treatment && <TreatmentCard treatment={treatment} />}

      {verdict && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={shareWA} className="min-touch bg-success text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md">
            <Share2 className="w-5 h-5" /> WhatsApp
          </button>
          <button onClick={findDealer} className="min-touch bg-earth text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md">
            <MapPin className="w-5 h-5" /> डीलर
          </button>
        </div>
      )}

      {camOpen && (
        <CameraModal
          onClose={() => setCamOpen(false)}
          onCapture={async (file) => {
            setCamOpen(false);
            await loadFile(file);
          }}
          onDeny={() => {
            setCamOpen(false);
            handleUpload();
          }}
        />
      )}
    </div>
  );
}

function CameraModal({ onClose, onCapture, onDeny }: { onClose: () => void; onCapture: (f: File) => void; onDeny: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        console.error("camera denied", e);
        setErr("Camera denied");
        setTimeout(onDeny, 600);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 512;
    canvas.height = v.videoHeight || 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `leaf_${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <span className="font-bold">पत्ती की फोटो लें</span>
        <button onClick={onClose}><X className="w-6 h-6" /></button>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {err ? (
          <p className="text-white">{err} — opening file picker...</p>
        ) : (
          <video ref={videoRef} playsInline muted className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <div className="p-6 flex justify-center">
        <button onClick={capture} className="w-20 h-20 rounded-full bg-white border-4 border-primary active:scale-95 transition" />
      </div>
    </div>
  );
}

const consensusBadge = {
  very_high: { color: "bg-success text-primary-foreground", label: "🟢 बहुत उच्च विश्वास / Very High" },
  high: { color: "bg-warning text-foreground", label: "🟡 उच्च विश्वास / High" },
  moderate: { color: "bg-accent text-accent-foreground", label: "🟡 मध्यम विश्वास / Moderate" },
  uncertain: { color: "bg-destructive text-primary-foreground", label: "🔴 अनिश्चित / Uncertain" },
};

function VerdictCard({ verdict }: { verdict: EnsembleVerdict }) {
  const cb = consensusBadge[verdict.consensus];
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">{verdict.cropType}</p>
        <h3 className="text-xl font-bold text-primary">{diseaseHindi(verdict.label)}</h3>
        <p className="text-sm text-muted-foreground">{verdict.diseaseNameFormatted}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${cb.color}`}>{cb.label}</span>
        <span className="text-2xl font-extrabold text-primary">{verdict.confidence}%</span>
      </div>
      <div className="border-t pt-3">
        <p className="text-xs font-semibold mb-2">{verdict.agreementCount}/3 AI सहमत</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {verdict.sources.map((s) => (
            <div key={s.name} className={`rounded-lg p-2 text-[10px] ${s.ok ? "bg-success/15" : "bg-destructive/15"}`}>
              <div className="font-bold uppercase">{s.name === "groq_vision" ? "Groq" : s.name === "tensorflow" ? "TF" : "Gemini"}</div>
              <div>{s.ok && s.result ? `${Math.round(s.result.confidence * 100)}%` : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TreatmentCard({ treatment }: { treatment: Treatment }) {
  const [tab, setTab] = useState<"organic" | "chemical" | "prevent">("organic");
  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-primary"><Bi k="treatment" /></h3>
      <div className="grid grid-cols-3 gap-1 bg-secondary rounded-xl p-1">
        {(["organic", "chemical", "prevent"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`py-2 rounded-lg text-xs font-bold ${tab === t ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}>
            {t === "organic" ? "🌿 जैविक" : t === "chemical" ? "🧪 रासायनिक" : "🛡️ रोकथाम"}
          </button>
        ))}
      </div>
      {tab === "organic" && (
        <div className="space-y-2 text-sm">
          {treatment.organicTreatment.steps.map((s, i) => (
            <div key={i} className="flex gap-2"><span className="text-success font-bold">{i + 1}.</span>{s}</div>
          ))}
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>लागत: {treatment.organicTreatment.estimatedCost}</span>
            <span>असर: {treatment.organicTreatment.timeToEffect}</span>
          </div>
        </div>
      )}
      {tab === "chemical" && (
        <div className="space-y-2 text-sm">
          <div><b>दवा:</b> {treatment.chemicalTreatment.pesticideName}</div>
          <div><b>मात्रा:</b> {treatment.chemicalTreatment.dosage}</div>
          <div><b>आवृत्ति:</b> {treatment.chemicalTreatment.frequency}</div>
          <div className="pt-2 border-t">
            <b className="text-xs">ब्रांड:</b>
            <div className="flex flex-wrap gap-1 mt-1">
              {treatment.chemicalTreatment.brandNames.map((b) => <span key={b} className="bg-secondary px-2 py-0.5 rounded-full text-xs">{b}</span>)}
            </div>
          </div>
        </div>
      )}
      {tab === "prevent" && (
        <ul className="space-y-1.5 text-sm">
          {treatment.preventiveMeasures.map((m, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">✓</span>{m}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 text-xs bg-warning/20 rounded-lg p-2">
        <Bell className="w-4 h-4" />
        <span>तत्परता: <b>{treatment.urgency === "immediate" ? "तुरंत" : treatment.urgency === "within_week" ? "1 हफ्ते में" : "निगरानी"}</b></span>
      </div>
    </div>
  );
}
