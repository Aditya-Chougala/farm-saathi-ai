import { TrendingUp, TrendingDown, Minus, IndianRupee, Calendar, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { DemoCrop } from "@/lib/demoResults";
import { useLang } from "@/i18n/LanguageContext";

const trendIcon = { up: <TrendingUp className="w-4 h-4" />, down: <TrendingDown className="w-4 h-4" />, stable: <Minus className="w-4 h-4" /> };

const riskColor = {
  low: "bg-success/20 text-success",
  medium: "bg-warning/30 text-foreground",
  high: "bg-destructive/20 text-destructive",
};

export function CropResultCard({ crop }: { crop: DemoCrop }) {
  const { t, lang } = useLang();
  const localized = crop.names?.[lang] ?? crop.cropName;
  const riskKey = crop.risk.level === "low" ? "riskLow" : crop.risk.level === "medium" ? "riskMedium" : "riskHigh";

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="gradient-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-5xl">{crop.cropEmoji}</div>
          <div>
            <h3 className="font-bold text-xl leading-tight">{localized}</h3>
            {lang !== "en" && <p className="text-sm opacity-90">{crop.cropName}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold">{crop.matchScore}</div>
          <div className="text-[10px] uppercase opacity-80">Match</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-secondary/60 rounded-xl p-2">
            <div className="text-xs text-muted-foreground">{t("cost")}</div>
            <div className="font-bold text-sm flex items-center justify-center"><IndianRupee className="w-3 h-3" />{crop.financial.costPerAcre.toLocaleString("en-IN")}</div>
          </div>
          <div className="bg-success/15 rounded-xl p-2">
            <div className="text-xs text-muted-foreground">{t("profit")}</div>
            <div className="font-bold text-sm text-success flex items-center justify-center"><IndianRupee className="w-3 h-3" />{crop.financial.expectedProfitPerAcre.toLocaleString("en-IN")}</div>
          </div>
          <div className="bg-accent/20 rounded-xl p-2">
            <div className="text-xs text-muted-foreground">{t("roi")}</div>
            <div className="font-bold text-sm text-accent-foreground">{crop.financial.roi}%</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskColor[crop.risk.level]}`}>
            {t("riskLabel")}: {t(riskKey as any)}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" /> {crop.timeline.growingDays} {t("days")}
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold">
            ₹{crop.market.currentPricePerKg}/kg {trendIcon[crop.market.priceTrend]}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold mb-1 text-muted-foreground">{t("forecast6")} — {crop.market.nearestMandi}</p>
          <div className="h-32 bg-secondary/40 rounded-xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crop.market.priceForecast}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="price" fill="oklch(0.46 0.09 152)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-primary mb-1">{t("whySuitable")}</p>
          <ul className="text-xs space-y-0.5">
            {crop.suitabilityReasons.map((r, i) => (
              <li key={i} className="flex gap-1.5"><span className="text-success">✓</span>{r}</li>
            ))}
          </ul>
        </div>

        {crop.warnings.length > 0 && (
          <div className="bg-warning/20 rounded-xl p-2.5">
            <p className="text-xs font-bold flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> {t("caution")}</p>
            <ul className="text-xs space-y-0.5">
              {crop.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
