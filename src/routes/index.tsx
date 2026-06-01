import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cloud, Droplets, Wind, Sun, Sprout, ScanLine, Store, TrendingUp, RefreshCw, MapPin, Beaker, CalendarDays } from "lucide-react";
import { fetchHomeData, weatherEmoji, describeWeatherCode, locationDenied, type HomeData } from "@/lib/weatherApi";
import { useLang } from "@/i18n/LanguageContext";
import type { TKey } from "@/i18n/translations";
import { QUOTES } from "@/lib/demoResults";
import { fetchRealMandiPrices, type RealMandiPrice } from "@/lib/agmarknetApi";
import { shareApp } from "@/utils/shareUtils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmSmart AI — Home" },
      { name: "description", content: "Your dashboard with weather, crop tools, disease scan and mandi prices." },
    ],
  }),
  component: HomePage,
});

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function formatDay(date: string, idx: number): string {
  if (idx === 0) return "Today";
  try {
    return new Date(date).toLocaleDateString("en-US", { weekday: "short" });
  } catch {
    return date.slice(5);
  }
}

function HomePage() {
  const { t, lang } = useLang();
  const [home, setHome] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quote, setQuote] = useState<string>(QUOTES[0]);
  const [prices, setPrices] = useState<RealMandiPrice[]>([]);
  const [liveBadge, setLiveBadge] = useState<"agmarknet" | "ai" | null>(null);

  const load = async (force = false) => {
    try {
      const d = await fetchHomeData(force);
      setHome(d);
    } catch (e) {
      console.error("Home data load failed:", e);
    }
  };

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    load().finally(() => setLoading(false));
    fetchRealMandiPrices().then((res) => {
      if (res && res.prices.length) {
        setPrices(res.prices);
        setLiveBadge(res.source === "ai" ? "ai" : res.source === "agmarknet" ? "agmarknet" : null);
      }
    }).catch(() => {});
  }, []);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const w = home?.weather;
  const loc = home?.location;
  const aqi = home?.aqi;
  const aqiColor = !aqi ? "" : aqi.level === "Good" ? "bg-success/20 text-success" : aqi.level === "Moderate" ? "bg-accent/30 text-accent-foreground" : aqi.level === "Poor" ? "bg-orange-500/20 text-orange-700" : "bg-destructive/20 text-destructive";

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-3xl p-5 gradient-warm text-accent-foreground relative overflow-hidden">
        <div className="absolute -top-6 -right-6 text-9xl opacity-20">{w ? weatherEmoji(w.weatherCode) : "☀️"}</div>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh weather"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/30 backdrop-blur active:scale-95 transition disabled:opacity-60"
          disabled={refreshing || loading}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <div className="relative">
          <p className="text-xs font-semibold opacity-80">{t("weatherToday")}</p>
          {loc && (
            <div className="flex items-center gap-1 text-xs mt-0.5 opacity-90">
              <MapPin className="w-3 h-3" />
              <span className="font-semibold">{loc.city}{loc.state ? `, ${loc.state}` : ""}</span>
            </div>
          )}
          <div className="flex items-end gap-3 mt-1">
            <div className="text-5xl font-extrabold">
              {loading && !w ? "…" : w ? `${Math.round(w.temperature)}°` : "—"}
            </div>
            <div className="text-sm pb-1.5 opacity-90">
              {w ? describeWeatherCode(w.weatherCode) : t("temperature")}
              {w ? ` · feels ${Math.round(w.feelsLike)}°` : ""}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div className="bg-white/30 rounded-lg p-2 backdrop-blur">
              <Droplets className="w-4 h-4 mb-1" />
              {w ? `${Math.round(w.humidity)}%` : "—"}
            </div>
            <div className="bg-white/30 rounded-lg p-2 backdrop-blur">
              <Cloud className="w-4 h-4 mb-1" />
              {w ? `${w.rain.toFixed(1)} mm` : "—"}
            </div>
            <div className="bg-white/30 rounded-lg p-2 backdrop-blur">
              <Wind className="w-4 h-4 mb-1" />
              {w ? `${Math.round(w.windSpeed)} km/h` : "—"}
            </div>
          </div>
          {w && w.daily.length > 0 && (
            <div className="mt-3 -mx-1 overflow-x-auto">
              <div className="flex gap-1.5 px-1 min-w-max">
                {w.daily.slice(0, 7).map((d, i) => (
                  <div key={d.date} className="bg-white/30 backdrop-blur rounded-lg px-2 py-1.5 text-center min-w-[52px]">
                    <div className="text-[10px] font-semibold opacity-80">{formatDay(d.date, i)}</div>
                    <div className="text-base leading-none my-0.5">{weatherEmoji(d.code)}</div>
                    <div className="text-[10px] font-bold">{Math.round(d.tMax)}°/{Math.round(d.tMin)}°</div>
                    {d.precipProb > 0 && <div className="text-[9px] opacity-80">💧{d.precipProb}%</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-[10px] opacity-80">
            <span>{home ? `Updated ${timeAgo(home.fetchedAt)}` : loading ? "Loading…" : ""}</span>
          </div>
        </div>
      </section>

      {aqi && (
        <section className="glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-primary text-sm">Air Quality (AQI)</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${aqiColor}`}>
              {aqi.aqi} · {aqi.level}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{aqi.advice}</p>
        </section>
      )}

      {locationDenied && (
        <section className="glass-card rounded-2xl p-3 flex items-center justify-between gap-3 bg-warning/15">
          <div className="text-xs">
            <div className="font-bold">📍 स्थान की अनुमति दें</div>
            <div className="text-muted-foreground">For accurate weather & mandi prices.</div>
          </div>
          <button
            type="button"
            onClick={() => { localStorage.removeItem("farmsmart_gps"); window.location.reload(); }}
            className="min-touch px-3 gradient-primary text-primary-foreground rounded-xl text-xs font-bold"
          >
            Allow
          </button>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <FeatureTile to="/crop" icon={Sprout} k="cropSuggest" gradient="gradient-primary" />
        <FeatureTile to="/disease" icon={ScanLine} k="diseaseScan" gradient="gradient-warm" />
        <FeatureTileRaw to="/fertilizer" icon={Beaker} label="Fertilizer" gradient="bg-primary-glow/90 text-primary-foreground" />
        <FeatureTileRaw to="/calendar" icon={CalendarDays} label="Calendar" gradient="bg-accent/90 text-accent-foreground" />
        <FeatureTile to="/market" icon={Store} k="marketplace" gradient="bg-earth/90 text-primary-foreground" />
        <FeatureTile to="/market" icon={TrendingUp} k="mandiPrices" gradient="bg-success/90 text-primary-foreground" />
      </section>

      <section className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-primary">{t("mandiPrices")}</h3>
            {liveBadge === "agmarknet" && (
              <span className="text-[9px] font-bold bg-success/15 text-success px-1.5 py-0.5 rounded-full">
                📊 Agmarknet लाइव
              </span>
            )}
            {liveBadge === "ai" && (
              <span className="text-[9px] font-bold bg-accent/30 text-accent-foreground px-1.5 py-0.5 rounded-full">
                🤖 AI अनुमानित
              </span>
            )}
          </div>
          <Link to="/market" className="text-xs text-accent-foreground font-semibold">{t("viewAll")}</Link>
        </div>
        <div className="space-y-1.5">
          {prices.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 text-center">
              {loading ? "Loading mandi prices…" : "Mandi data unavailable"}
            </div>
          ) : prices.slice(0, 5).map((m, i) => (
            <div key={`${m.crop}-${i}`} className="flex items-center justify-between text-sm py-1">
              <span className="font-semibold">{m.names[lang]}</span>
              <span className="font-bold">₹{m.price}/{m.unit} {m.trend === "up" ? "↑" : m.trend === "down" ? "↓" : "→"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 text-center">
        <Sun className="w-5 h-5 mx-auto text-accent-foreground mb-1" />
        <p className="text-sm font-semibold italic">{quote}</p>
      </section>

      <button
        type="button"
        onClick={shareApp}
        className="w-full min-touch gradient-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition"
      >
        📤 दोस्तों को बताएं / Share App
      </button>
    </div>
  );
}

function FeatureTile({ to, icon: Icon, k, gradient }: { to: string; icon: typeof Cloud; k: TKey; gradient: string }) {
  const { t } = useLang();
  return (
    <Link to={to} className={`glass-card rounded-2xl p-4 ${gradient} text-primary-foreground min-touch flex flex-col justify-between active:scale-95 transition shadow-md`}>
      <Icon className="w-7 h-7" />
      <div className="mt-3 leading-tight">
        <div className="font-bold">{t(k)}</div>
      </div>
    </Link>
  );
}

function FeatureTileRaw({ to, icon: Icon, label, gradient }: { to: string; icon: typeof Cloud; label: string; gradient: string }) {
  return (
    <Link to={to} className={`glass-card rounded-2xl p-4 ${gradient} min-touch flex flex-col justify-between active:scale-95 transition shadow-md`}>
      <Icon className="w-7 h-7" />
      <div className="mt-3 leading-tight">
        <div className="font-bold">{label}</div>
      </div>
    </Link>
  );
}
