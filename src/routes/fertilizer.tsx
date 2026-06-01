import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Beaker, Loader2, MapPin, Sprout } from "lucide-react";
import { groqText } from "@/lib/groqApi";
import { checkRateLimit } from "@/utils/rateLimit";
import { useLang } from "@/i18n/LanguageContext";

export const Route = createFileRoute("/fertilizer")({
  head: () => ({
    meta: [
      { title: "Fertilizer Calculator — FarmSmart AI" },
      { name: "description", content: "AI-powered fertilizer schedule with quantity, bags and cost estimates." },
    ],
  }),
  component: FertilizerPage,
});

const CROPS = ["Tomato", "Wheat", "Rice", "Cotton", "Maize", "Onion", "Potato"];
const STAGES = ["Sowing", "Vegetative", "Flowering", "Fruiting"];
const SOILS = ["Loamy", "Black", "Red", "Sandy", "Clay"];

interface Fert { name: string; quantity: number; unit: string; bags: number; costEstimate: string }
interface Block { timing: string; fertilizers: Fert[] }
interface Result { schedule: Block[]; totalCost: string; tips: string[] }

function FertilizerPage() {
  const { lang } = useLang();
  const [crop, setCrop] = useState("Tomato");
  const [acres, setAcres] = useState(2);
  const [stage, setStage] = useState("Sowing");
  const [soil, setSoil] = useState("Loamy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const calc = async () => {
    if (!checkRateLimit("fertilizer")) return;
    setLoading(true); setErr(null); setResult(null);
    try {
      const sys = "You are an Indian agronomist. Output ONLY valid JSON matching the schema.";
      const user = `Calculate exact fertilizer schedule for:
Crop: ${crop}
Land: ${acres} acres
Stage: ${stage}
Soil: ${soil}
Respond in ${lang === "hi" ? "Hindi" : "English"} for tips.
Return JSON:
{"schedule":[{"timing":"At sowing / Week N","fertilizers":[{"name":"DAP","quantity":number,"unit":"kg","bags":number,"costEstimate":"₹X"}]}],"totalCost":"₹X-Y","tips":["tip1","tip2","tip3"]}`;
      const j = await groqText(sys, user);
      if (!j?.schedule) throw new Error("bad response");
      setResult(j as Result);
    } catch (e: any) {
      setErr(e?.message || "Failed to calculate. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const findShop = () => {
    const q = encodeURIComponent("fertilizer shop near me");
    window.open(`https://www.google.com/maps/search/${q}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Beaker className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-primary">Fertilizer Calculator / उर्वरक गणना</h2>
        </div>

        <label className="block text-xs font-semibold">Crop / फसल</label>
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full min-touch px-3 rounded-xl border bg-background">
          {CROPS.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label className="block text-xs font-semibold">Land size: {acres} acres</label>
        <input type="range" min={0.5} max={50} step={0.5} value={acres} onChange={(e) => setAcres(+e.target.value)} className="w-full" />

        <label className="block text-xs font-semibold">Growth stage / अवस्था</label>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="w-full min-touch px-3 rounded-xl border bg-background">
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>

        <label className="block text-xs font-semibold">Soil type / मिट्टी</label>
        <select value={soil} onChange={(e) => setSoil(e.target.value)} className="w-full min-touch px-3 rounded-xl border bg-background">
          {SOILS.map((s) => <option key={s}>{s}</option>)}
        </select>

        <button onClick={calc} disabled={loading} className="w-full min-touch gradient-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Calculating…</> : <><Sprout className="w-5 h-5" /> Calculate</>}
        </button>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </section>

      {result && (
        <section className="space-y-3">
          {result.schedule.map((b, i) => (
            <div key={i} className="glass-card rounded-2xl p-4">
              <div className="font-bold text-primary mb-2">📅 {b.timing}</div>
              <div className="space-y-1.5">
                {b.fertilizers.map((f, j) => (
                  <div key={j} className="flex justify-between items-center text-sm border-b last:border-0 py-1.5">
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-[11px] text-muted-foreground">{f.quantity} {f.unit} • {f.bags} bag(s)</div>
                    </div>
                    <div className="font-bold text-primary">{f.costEstimate}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="glass-card rounded-2xl p-4 bg-success/10">
            <div className="text-xs text-muted-foreground">Total estimated cost</div>
            <div className="text-2xl font-extrabold text-primary">{result.totalCost}</div>
          </div>
          {result.tips?.length > 0 && (
            <div className="glass-card rounded-2xl p-4">
              <div className="font-bold mb-2">💡 Tips</div>
              <ul className="space-y-1 text-sm">
                {result.tips.map((tp, i) => <li key={i}>• {tp}</li>)}
              </ul>
            </div>
          )}
          <button onClick={findShop} className="w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5" /> नजदीकी दुकान खोजें / Find Shop
          </button>
        </section>
      )}
    </div>
  );
}
