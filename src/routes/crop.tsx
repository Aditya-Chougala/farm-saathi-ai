import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SoilAnalyzer, type SoilAnalysis } from "@/components/crop/SoilAnalyzer";
import { FarmDetailsForm, type FarmDetails } from "@/components/crop/FarmDetailsForm";
import { LoadingAnimation } from "@/components/crop/LoadingAnimation";
import { CropResultCard } from "@/components/crop/CropResultCard";
import { DEMO_CROPS, type DemoCrop } from "@/lib/demoResults";
import { fetchWeather } from "@/lib/weatherApi";
import { groqText } from "@/lib/groqApi";
import { saveData } from "@/lib/db";
import { useLang } from "@/i18n/LanguageContext";
import type { TKey } from "@/i18n/translations";

export const Route = createFileRoute("/crop")({
  head: () => ({
    meta: [
      { title: "Crop Suggestion — FarmSmart AI" },
      { name: "description", content: "AI crop suggestions tailored to your soil, budget, season and weather." },
    ],
  }),
  component: CropPage,
});

type Step = "soil" | "details" | "loading" | "results";

function CropPage() {
  const { t } = useLang();
  const [step, setStep] = useState<Step>("soil");
  const [soil, setSoil] = useState<SoilAnalysis | null>(null);
  const [results, setResults] = useState<DemoCrop[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const onSoilDone = (s: SoilAnalysis) => {
    setSoil(s);
    setStep("details");
  };

  const onDetailsSubmit = async (d: FarmDetails) => {
    setStep("loading");
    let crops: DemoCrop[] = DEMO_CROPS;
    try {
      const w = await fetchWeather();
      const sys = "You are an Indian agronomy expert. Suggest 5 best crops as JSON. Reply in English. Use realistic Indian market prices in INR.";
      const user = `Farm: ${d.acres} acres, budget ₹${d.budget}, ${d.irrigation} irrigation, ${d.season} season, experience ${d.experience}.
Soil: ${soil?.soilType}, pH ${soil?.ph}, NPK ${soil?.nutrients.N}/${soil?.nutrients.P}/${soil?.nutrients.K}.
Weather: ${w.temperature}°C, humidity ${w.humidity}%, rain ${w.rain}mm.
Reply JSON: { "crops": [ {cropName, cropNameHindi, cropEmoji, matchScore, financial:{costPerAcre,expectedRevenuePerAcre,expectedProfitPerAcre,roi}, risk:{level,mainRisks,riskScore}, timeline:{growingDays,sowingWindow,harvestWindow}, market:{currentPricePerKg,priceTrend,nearestMandi,priceForecast:[{month,price}x6]}, cultivation:{fertilizerSchedule,irrigationSchedule}, suitabilityReasons:[3], warnings:[2] } x5 ] }`;
      const out = await groqText(sys, user);
      if (out?.crops?.length) crops = out.crops as DemoCrop[];
    } catch {
      // demo fallback
    }
    setResults(crops);
    saveData("farmsmart_last_crop_result", crops);
    setStep("results");
  };

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      {step === "soil" && <SoilAnalyzer onComplete={onSoilDone} />}
      {step === "details" && <FarmDetailsForm onSubmit={onDetailsSubmit} onBack={() => setStep("soil")} />}
      {step === "loading" && <LoadingAnimation />}
      {step === "results" && (
        <div className="space-y-3">
          <p className="text-center text-sm font-semibold text-primary">{t("topCrops", { n: results.length })}</p>
          <CropResultCard crop={results[activeIdx]} />
          <div className="flex justify-center gap-2">
            {results.map((c, i) => (
              <button key={c.cropName + i} onClick={() => setActiveIdx(i)}
                className={`min-touch min-w-14 px-2 rounded-xl text-2xl ${i === activeIdx ? "gradient-primary shadow-md" : "bg-secondary"}`}
                aria-label={c.cropName}>
                {c.cropEmoji}
              </button>
            ))}
          </div>
          <button onClick={() => { setStep("soil"); setSoil(null); setResults([]); setActiveIdx(0); }}
            className="w-full min-touch bg-secondary text-secondary-foreground rounded-xl font-semibold">
            {t("newSearch")}
          </button>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const { t } = useLang();
  const order: Step[] = ["soil", "details", "loading", "results"];
  const idx = order.indexOf(step);
  const labels: TKey[] = ["step1Soil", "step2Details", "step3Loading", "step4Results"];
  return (
    <div className="glass-card rounded-2xl p-3 flex items-center justify-between">
      {labels.map((k, i) => (
        <div key={k} className="flex-1 flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= idx ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {i + 1}
          </div>
          <span className={`ml-1 text-[10px] font-semibold ${i === idx ? "text-primary" : "text-muted-foreground"}`}>{t(k)}</span>
          {i < labels.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${i < idx ? "bg-primary" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}
