import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import type { TKey } from "@/i18n/translations";

const STAGE_KEYS: TKey[] = ["loadWeather", "loadMandi", "loadSoil", "loadBudget", "loadBest"];

export function LoadingAnimation() {
  const { t } = useLang();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % STAGE_KEYS.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-5xl animate-pulse shadow-[var(--shadow-glow)]">
        🌾
      </div>
      <p className="mt-6 text-lg font-bold text-primary">{t(STAGE_KEYS[i])}</p>
      <div className="flex gap-1 mt-4">
        {STAGE_KEYS.map((_, n) => (
          <div key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-8 bg-primary" : "w-2 bg-border"}`} />
        ))}
      </div>
    </div>
  );
}
