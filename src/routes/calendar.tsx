import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Loader2, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { groqText } from "@/lib/groqApi";
import { getData, saveData } from "@/lib/db";
import { checkRateLimit } from "@/utils/rateLimit";
import { useLang } from "@/i18n/LanguageContext";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Crop Calendar — FarmSmart AI" },
      { name: "description", content: "Week-by-week farming calendar tailored to your crop, sowing date and location." },
    ],
  }),
  component: CalendarPage,
});

const CROPS = ["Tomato", "Wheat", "Rice", "Cotton", "Maize", "Onion", "Potato"];

interface Week {
  week: number;
  stage: string;
  stageHindi?: string;
  tasks: string[];
  alerts?: string[];
  status?: "upcoming" | "ongoing" | "completed";
}

interface Plan {
  crop: string;
  sowingDate: number;
  weeks: Week[];
  done: Record<string, boolean>;
}

const KEY = "farmsmart_calendar";

function CalendarPage() {
  const { lang } = useLang();
  const [crop, setCrop] = useState("Tomato");
  const [acres, setAcres] = useState(2);
  const [state, setState] = useState("Karnataka");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const saved = getData<Plan>(KEY);
    if (saved) setPlan(saved);
  }, []);

  const make = async () => {
    if (!checkRateLimit("calendar")) return;
    setLoading(true); setErr(null);
    try {
      const sys = "You are an Indian agronomist. Output ONLY valid JSON.";
      const user = `Create a complete farming calendar for ${crop}.
Sowing date: ${new Date().toLocaleDateString("en-IN")}
Land: ${acres} acres
Location: ${state}, India
Respond ${lang === "hi" ? "in Hindi" : "in English"} for tasks.
Return JSON:
{"weeks":[{"week":1,"stage":"Seedling","stageHindi":"अंकुरण","tasks":["task1","task2"],"alerts":["alert"]}]}
Include every week from sowing to harvest.`;
      const j = await groqText(sys, user);
      const weeks: Week[] = j?.weeks ?? [];
      if (!weeks.length) throw new Error("bad response");
      const newPlan: Plan = { crop, sowingDate: Date.now(), weeks, done: {} };
      setPlan(newPlan);
      saveData(KEY, newPlan);
    } catch (e: any) {
      setErr(e?.message || "Failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (wk: number, idx: number) => {
    if (!plan) return;
    const k = `${wk}:${idx}`;
    const next = { ...plan, done: { ...plan.done, [k]: !plan.done[k] } };
    setPlan(next);
    saveData(KEY, next);
  };

  const currentWeek = plan
    ? Math.max(1, Math.floor((Date.now() - plan.sowingDate) / (7 * 24 * 60 * 60 * 1000)) + 1)
    : 0;

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-primary">Crop Calendar / फसल कैलेंडर</h2>
        </div>
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full min-touch px-3 rounded-xl border bg-background">
          {CROPS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="number" min={0.5} step={0.5} value={acres} onChange={(e) => setAcres(+e.target.value)} className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="Acres" />
        <input value={state} onChange={(e) => setState(e.target.value)} className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="State" />
        <button onClick={make} disabled={loading} className="w-full min-touch gradient-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating…</> : "Generate Calendar"}
        </button>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </section>

      {plan && (
        <section className="space-y-3">
          <div className="text-xs text-muted-foreground text-center">
            Sown {new Date(plan.sowingDate).toLocaleDateString("en-IN")} • {plan.crop} • Week {currentWeek}
          </div>
          {plan.weeks.map((w) => {
            const status =
              w.week < currentWeek ? "completed" :
              w.week === currentWeek ? "ongoing" : "upcoming";
            const ring =
              status === "ongoing" ? "border-l-4 border-success bg-success/5" :
              status === "completed" ? "opacity-70" : "";
            return (
              <div key={w.week} className={`glass-card rounded-2xl p-4 ${ring}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-primary">Week {w.week} — {w.stage}{w.stageHindi ? ` / ${w.stageHindi}` : ""}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    status === "ongoing" ? "bg-success text-primary-foreground" :
                    status === "completed" ? "bg-muted text-muted-foreground" :
                    "bg-secondary text-secondary-foreground"
                  }`}>{status}</span>
                </div>
                <ul className="space-y-1.5">
                  {w.tasks.map((tk, i) => {
                    const k = `${w.week}:${i}`;
                    const done = !!plan.done[k];
                    return (
                      <li key={i}>
                        <button onClick={() => toggle(w.week, i)} className="flex items-start gap-2 text-sm text-left w-full">
                          {done ? <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                          <span className={done ? "line-through text-muted-foreground" : ""}>{tk}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {w.alerts && w.alerts.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 bg-warning/20 rounded-lg p-2 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{w.alerts.join(" • ")}</div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
