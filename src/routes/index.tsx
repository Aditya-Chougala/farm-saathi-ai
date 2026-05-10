import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, Sun, Sprout, ScanLine, Store, TrendingUp } from "lucide-react";
import { fetchWeather, type Weather } from "@/lib/weatherApi";
import { Bi, useLang } from "@/i18n/LanguageContext";
import { QUOTES, MANDI_PRICES } from "@/lib/demoResults";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmSmart AI — Home" },
      { name: "description", content: "Your dashboard with weather, crop tools, disease scan and mandi prices." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { lang } = useLang();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [quote, setQuote] = useState<string>(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    fetchWeather().then(setWeather).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-3xl p-5 gradient-warm text-accent-foreground relative overflow-hidden">
        <div className="absolute -top-6 -right-6 text-9xl opacity-20">☀️</div>
        <div className="relative">
          <p className="text-xs font-semibold opacity-80"><Bi k="weatherToday" /></p>
          <div className="flex items-end gap-3 mt-1">
            <div className="text-5xl font-extrabold">{weather ? Math.round(weather.temperature) : "--"}°</div>
            <div className="text-sm pb-1.5 opacity-90">
              {lang === "hi" ? "तापमान" : "Temperature"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="bg-white/30 rounded-lg p-2 backdrop-blur"><Droplets className="w-4 h-4 mb-1" />{weather?.humidity ?? "--"}%</div>
            <div className="bg-white/30 rounded-lg p-2 backdrop-blur"><Cloud className="w-4 h-4 mb-1" />{weather?.rain ?? 0}mm</div>
            <div className="bg-white/30 rounded-lg p-2 backdrop-blur"><Wind className="w-4 h-4 mb-1" />{weather?.windSpeed ?? "--"}km/h</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <FeatureTile to="/crop" icon={Sprout} hi="फसल सुझाव" en="Crop Suggest" gradient="gradient-primary" />
        <FeatureTile to="/disease" icon={ScanLine} hi="रोग पहचान" en="Disease Scan" gradient="gradient-warm" />
        <FeatureTile to="/market" icon={Store} hi="बाज़ार" en="Marketplace" gradient="bg-earth/90 text-primary-foreground" />
        <FeatureTile to="/market" icon={TrendingUp} hi="मंडी भाव" en="Mandi Prices" gradient="bg-success/90 text-primary-foreground" />
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-primary"><Bi k="mandiPrices" /></h3>
          <Link to="/market" className="text-xs text-accent-foreground font-semibold">सब देखें →</Link>
        </div>
        <div className="space-y-1.5">
          {MANDI_PRICES.slice(0, 5).map((m) => (
            <div key={m.crop} className="flex items-center justify-between text-sm py-1">
              <span className="font-semibold">{m.hi} <span className="text-muted-foreground text-xs">{m.crop}</span></span>
              <span className="font-bold">₹{m.price}/{m.unit} {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 text-center">
        <Sun className="w-5 h-5 mx-auto text-accent-foreground mb-1" />
        <p className="text-sm font-semibold italic">{quote}</p>
      </section>
    </div>
  );
}

function FeatureTile({ to, icon: Icon, hi, en, gradient }: { to: string; icon: typeof Cloud; hi: string; en: string; gradient: string }) {
  return (
    <Link to={to} className={`glass-card rounded-2xl p-4 ${gradient} text-primary-foreground min-touch flex flex-col justify-between active:scale-95 transition shadow-md`}>
      <Icon className="w-7 h-7" />
      <div className="mt-3 leading-tight">
        <div className="font-bold">{hi}</div>
        <div className="text-[11px] opacity-80">{en}</div>
      </div>
    </Link>
  );
}
