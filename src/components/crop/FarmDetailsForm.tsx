import { useMemo, useState } from "react";
import { Bi, useLang } from "@/i18n/LanguageContext";

export interface FarmDetails {
  acres: number;
  budget: number;
  irrigation: string;
  season: string;
  experience: string;
}

const IRRIGATION = [
  { v: "drip", label: "💧 ड्रिप / Drip" },
  { v: "flood", label: "🌊 बाढ़ / Flood" },
  { v: "rainfed", label: "🌧️ वर्षा / Rain-fed" },
  { v: "sprinkler", label: "💦 स्प्रिंकलर / Sprinkler" },
];

const EXP = [
  { v: "new", label: "🌱 नया (0-2)" },
  { v: "exp", label: "🌾 अनुभवी (2-10)" },
  { v: "expert", label: "👨‍🌾 विशेषज्ञ (10+)" },
];

function autoSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 10) return "kharif";
  if (m >= 10 || m <= 3) return "rabi";
  return "zaid";
}

const SEASONS = [
  { v: "kharif", label: "🌧️ खरीफ / Kharif" },
  { v: "rabi", label: "❄️ रबी / Rabi" },
  { v: "zaid", label: "☀️ जायद / Zaid" },
];

export function FarmDetailsForm({ onSubmit, onBack }: { onSubmit: (d: FarmDetails) => void; onBack: () => void }) {
  const { t } = useLang();
  const defaultSeason = useMemo(() => autoSeason(), []);
  const [form, setForm] = useState<FarmDetails>({
    acres: 2,
    budget: 50000,
    irrigation: "drip",
    season: defaultSeason,
    experience: "exp",
  });

  return (
    <div className="glass-card rounded-2xl p-4 space-y-4">
      <h2 className="font-bold text-lg text-primary">खेत की जानकारी</h2>

      <div>
        <label className="text-sm font-semibold block mb-1"><Bi k="landAcres" /></label>
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={form.acres}
          onChange={(e) => setForm({ ...form, acres: +e.target.value })}
          className="w-full min-touch px-4 rounded-xl border bg-background text-lg"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-1"><Bi k="budget" /></label>
        <input
          type="number"
          min={1000}
          step={1000}
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: +e.target.value })}
          className="w-full min-touch px-4 rounded-xl border bg-background text-lg"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2"><Bi k="irrigation" /></label>
        <div className="grid grid-cols-2 gap-2">
          {IRRIGATION.map((o) => (
            <button
              key={o.v}
              onClick={() => setForm({ ...form, irrigation: o.v })}
              className={`min-touch rounded-xl border-2 px-3 text-sm font-semibold ${
                form.irrigation === o.v ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2"><Bi k="season" /></label>
        <div className="grid grid-cols-3 gap-2">
          {SEASONS.map((o) => (
            <button
              key={o.v}
              onClick={() => setForm({ ...form, season: o.v })}
              className={`min-touch rounded-xl border-2 px-2 text-xs font-semibold ${
                form.season === o.v ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold block mb-2"><Bi k="experience" /></label>
        <div className="grid grid-cols-3 gap-2">
          {EXP.map((o) => (
            <button
              key={o.v}
              onClick={() => setForm({ ...form, experience: o.v })}
              className={`min-touch rounded-xl border-2 px-2 text-xs font-semibold ${
                form.experience === o.v ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onBack} className="flex-1 min-touch bg-secondary text-secondary-foreground rounded-xl font-semibold">
          {t("back")}
        </button>
        <button onClick={() => onSubmit(form)} className="flex-[2] min-touch gradient-primary text-primary-foreground rounded-xl font-bold shadow-md">
          {t("next")} →
        </button>
      </div>
    </div>
  );
}
