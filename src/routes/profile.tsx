import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, MapPin, Sprout, Check, Database } from "lucide-react";
import { getData, saveData } from "@/lib/db";
import { diseaseHindi } from "@/constants/diseaseTranslations";
import { useLang } from "@/i18n/LanguageContext";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — FarmSmart AI" },
      { name: "description", content: "Your scan history, treatment reminders and selected crops." },
    ],
  }),
  component: ProfilePage,
});

interface Farmer { name: string; location: string; landAcres: number }
interface HistItem { id: string; date: number; imageThumb: string; cropType: string; diseaseName: string; severity: string; confidence: number }
interface Reminder { id: string; due: number; disease: string; crop: string; done: boolean }

function ProfilePage() {
  const { t, lang } = useLang();
  const [farmer, setFarmer] = useState<Farmer>({ name: "", location: "", landAcres: 2 });
  const [edit, setEdit] = useState(false);
  const [history, setHistory] = useState<HistItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    setFarmer(getData<Farmer>("farmsmart_farmer") ?? { name: t("defaultFarmer"), location: "India", landAcres: 2 });
    setHistory(getData<HistItem[]>("farmsmart_disease_history") ?? []);
    setReminders(getData<Reminder[]>("farmsmart_reminders") ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveFarmer = () => { saveData("farmsmart_farmer", farmer); setEdit(false); };
  const markDone = (id: string) => {
    const next = reminders.map((r) => r.id === id ? { ...r, done: true } : r);
    setReminders(next); saveData("farmsmart_reminders", next);
  };

  const dateLocale: Record<string, string> = { en: "en-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN", bn: "bn-IN", te: "te-IN", mr: "mr-IN" };

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            {edit ? (
              <div className="space-y-1">
                <input className="w-full min-touch px-2 rounded-lg border bg-background text-sm" value={farmer.name} onChange={(e) => setFarmer({ ...farmer, name: e.target.value })} placeholder={t("farmerName")} />
                <input className="w-full min-touch px-2 rounded-lg border bg-background text-sm" value={farmer.location} onChange={(e) => setFarmer({ ...farmer, location: e.target.value })} placeholder={t("farmerLocation")} />
                <input type="number" className="w-full min-touch px-2 rounded-lg border bg-background text-sm" value={farmer.landAcres} onChange={(e) => setFarmer({ ...farmer, landAcres: +e.target.value })} placeholder={t("farmerAcres")} />
              </div>
            ) : (
              <>
                <div className="font-bold text-lg text-primary">{farmer.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{farmer.location} • {farmer.landAcres} {t("acresShort")}</div>
              </>
            )}
          </div>
          <button onClick={edit ? saveFarmer : () => setEdit(true)} className="text-xs font-bold text-primary px-3 py-2 rounded-lg bg-secondary">
            {edit ? "💾" : "✏️"}
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-success font-semibold">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          {t("storageReady")}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h3 className="font-bold text-primary mb-3">{t("scanHistory")}</h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("noScans")}</p>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/40">
                <img src={h.imageThumb} alt="" className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{lang === "hi" ? diseaseHindi(h.cropType + "___" + h.diseaseName.replace(/ /g, "_")) : h.diseaseName}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString(dateLocale[lang] ?? "en-IN")} • {h.confidence}%</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${h.severity === "severe" ? "bg-destructive/20 text-destructive" : h.severity === "moderate" ? "bg-warning/30" : "bg-success/20 text-success"}`}>{h.severity}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h3 className="font-bold text-primary mb-3">{t("activeTreatments")}</h3>
        {reminders.filter((r) => !r.done).length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("noTreatments")}</p>
        ) : (
          <div className="space-y-2">
            {reminders.filter((r) => !r.done).map((r) => {
              const days = Math.max(0, Math.ceil((r.due - Date.now()) / (24 * 60 * 60 * 1000)));
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-warning/15">
                  <div className="flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2"><Sprout className="w-4 h-4" />{r.crop} - {r.disease}</div>
                    <div className="text-[10px] text-muted-foreground">{t("followUp", { n: days })}</div>
                  </div>
                  <button onClick={() => markDone(r.id)} className="min-touch px-3 bg-success text-primary-foreground rounded-xl font-semibold text-xs flex items-center gap-1">
                    <Check className="w-4 h-4" /> {t("done")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-4 text-center text-xs text-muted-foreground">
        <Database className="w-5 h-5 mx-auto text-success mb-1" />
        {t("privacyNote")}
      </section>
    </div>
  );
}
