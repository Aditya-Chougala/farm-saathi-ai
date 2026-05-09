import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Upload, Loader2, Share2, MapPin, Bell, RotateCw } from "lucide-react";
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

function DiseaseDetection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<EnsembleVerdict | null>(null);
  const [treatment, setTreatment] = useState<Treatment | null>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setPreview(r.result as string); setVerdict(null); setTreatment(null); };
    r.readAsDataURL(f);
  };

  const scan = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const v = await runEnsemble(preview);
      setVerdict(v);
      // history
      const hist = (getData<HistoryItem[]>("farmsmart_disease_history") ?? []) as HistoryItem[];
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        date: Date.now(),
        imageThumb: preview.slice(0, 200000), // truncate
        cropType: v.cropType,
        diseaseName: v.diseaseNameFormatted,
        severity: v.severity,
        confidence: v.confidence,
      };
      saveData("farmsmart_disease_history", [item, ...hist].slice(0, 5));
      // treatment
      const t = await getTreatment(v.label, v.severity);
      setTreatment(t);
      // 7-day reminder
      try {
        if ("Notification" in window && Notification.permission === "default") {
          await Notification.requestPermission();
        }
        const reminders = (getData<any[]>("farmsmart_reminders") ?? []) as any[];
        reminders.push({ id: item.id, due: Date.now() + 7 * 24 * 60 * 60 * 1000, disease: v.diseaseNameFormatted, crop: v.cropType, done: false });
        saveData("farmsmart_reminders", reminders);
      } catch { /* ignore */ }
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
          <button onClick={() => camRef.current?.click()} className="min-touch gradient-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md">
            <Camera className="w-5 h-5" /> कैमरा
          </button>
          <button onClick={() => fileRef.current?.click()} className="min-touch bg-secondary rounded-xl font-semibold flex items-center justify-center gap-2">
            <Upload className="w-5 h-5" /> अपलोड
          </button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />

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
