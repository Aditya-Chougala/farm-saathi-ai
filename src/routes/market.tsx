import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Phone, MapPin, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchRealMandiPrices, timeAgo, type RealMandiPrice } from "@/lib/agmarknetApi";
import { getData, saveData } from "@/lib/db";
import { useLang } from "@/i18n/LanguageContext";
import type { TKey } from "@/i18n/translations";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Marketplace — FarmSmart AI" },
      { name: "description", content: "Sell crops, buy inputs, rent equipment, and check live mandi prices." },
    ],
  }),
  component: MarketPage,
});

type Tab = "sell" | "buy" | "equip" | "mandi";

interface Listing { id: string; crop: string; qty: string; price: string; phone: string; location: string; date: number }

function MarketPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("mandi");
  const tabKey: Record<Tab, TKey> = { mandi: "tabMandi", sell: "tabSell", buy: "tabBuy", equip: "tabEquip" };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 glass-card rounded-2xl p-1">
        {(["mandi", "sell", "buy", "equip"] as const).map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`py-2.5 rounded-xl text-xs font-bold ${tab === tb ? "gradient-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
            {t(tabKey[tb])}
          </button>
        ))}
      </div>

      {tab === "mandi" && <MandiTab />}
      {tab === "sell" && <SellTab />}
      {tab === "buy" && <BuyTab />}
      {tab === "equip" && <EquipTab />}
    </div>
  );
}

function MandiTab() {
  const { t, lang } = useLang();
  const [prices, setPrices] = useState<RealMandiPrice[]>([]);
  const [meta, setMeta] = useState<{ source: "agmarknet" | "ai" | "cached"; updatedAt: number; stale: boolean; location: string; disclaimer?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchRealMandiPrices()
      .then((res) => {
        if (res && res.prices.length) {
          setPrices(res.prices);
          setMeta({ source: res.source, updatedAt: res.updatedAt, stale: res.stale, location: `${res.district}, ${res.state}`, disclaimer: res.disclaimer });
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const trendIcon = {
    up: <TrendingUp className="w-4 h-4 text-success" />,
    down: <TrendingDown className="w-4 h-4 text-destructive" />,
    stable: <Minus className="w-4 h-4 text-muted-foreground" />,
  };
  const trendColor = { up: "text-success", down: "text-destructive", stable: "text-muted-foreground" } as const;
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-bold text-primary">{t("mandiToday")} {meta?.location ? `• ${meta.location}` : ""}</h2>
        {meta?.source === "agmarknet" && (
          <span className="text-[10px] font-bold bg-success/15 text-success px-2 py-0.5 rounded-full">
            📊 Agmarknet लाइव डेटा
          </span>
        )}
        {meta?.source === "ai" && (
          <span className="text-[10px] font-bold bg-accent/30 text-accent-foreground px-2 py-0.5 rounded-full">
            🤖 AI अनुमानित भाव
          </span>
        )}
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading mandi prices…</div>
      ) : error || prices.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Mandi data unavailable right now. Please try again later.
        </div>
      ) : (
        <div className="space-y-1">
          {prices.map((m, i) => (
            <div key={`${m.crop}-${i}`} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <div className="font-bold text-sm">{m.names[lang]}</div>
                {m.market ? (
                  <div className="text-[10px] text-muted-foreground">
                    {m.market}{m.arrivalDate ? ` • ${m.arrivalDate}` : ""}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${trendColor[m.trend]}`}>{m.change}</span>
                {trendIcon[m.trend]}
                <span className="font-extrabold text-primary text-base min-w-[88px] text-right">
                  ₹{m.price.toLocaleString("en-IN")}<span className="text-[10px] text-muted-foreground">/{m.unit}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {meta?.source === "ai" && (
        <div className="mt-3 p-2 bg-accent/10 rounded-lg text-[10px] text-center">
          <div className="font-bold">⚠️ AI अनुमानित भाव / AI Estimated Prices</div>
          <div className="text-muted-foreground">वास्तविक भाव के लिए नजदीकी मंडी जाएं</div>
        </div>
      )}
      {meta && (
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          {meta.stale ? "Offline • " : ""}Last updated {timeAgo(meta.updatedAt)}
        </p>
      )}
    </div>
  );
}

function SellTab() {
  const { t } = useLang();
  const [listings, setListings] = useState<Listing[]>(() => getData<Listing[]>("farmsmart_listings") ?? []);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<Omit<Listing, "id" | "date">>({ crop: "", qty: "", price: "", phone: "", location: "" });

  const post = () => {
    if (!form.crop || !form.phone) return;
    const next = [{ ...form, id: crypto.randomUUID(), date: Date.now() }, ...listings];
    setListings(next);
    saveData("farmsmart_listings", next);
    setShow(false);
    setForm({ crop: "", qty: "", price: "", phone: "", location: "" });
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setShow((s) => !s)} className="w-full min-touch gradient-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md">
        <Plus className="w-5 h-5" /> {t("postCrop")}
      </button>
      {show && (
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder={t("cropName")} value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder={t("qty")} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder={t("rate")} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder={t("whatsappNo")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder={t("location")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <button onClick={post} className="w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold">{t("postBtn")}</button>
        </div>
      )}
      {listings.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">{t("noListings")}</div>
      ) : (
        listings.map((l) => (
          <div key={l.id} className="glass-card rounded-2xl p-4 flex justify-between items-center">
            <div>
              <div className="font-bold text-primary">{l.crop} • {l.qty}</div>
              <div className="text-sm">{l.price}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{l.location}</div>
            </div>
            <button type="button" onClick={() => contactSeller(l.phone, l.crop, "buy")} className="min-touch px-4 bg-success text-primary-foreground rounded-xl font-semibold text-sm flex items-center gap-1">
              <Phone className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        ))
      )}
    </div>
  );
}

const INPUT_DEMOS = [
  { cat: "🌱", name: "Hybrid Tomato Seeds", price: "₹450/100g", dealer: "Krishi Kendra", dist: "2.5 km", phone: "919876543210" },
  { cat: "🧪", name: "DAP 50kg bag", price: "₹1,350", dealer: "IFFCO Center", dist: "4 km", phone: "919876543211" },
  { cat: "🐛", name: "Neem Oil 1L", price: "₹320", dealer: "Organic Mart", dist: "1.2 km", phone: "919876543212" },
  { cat: "🌾", name: "Wheat HD-2967", price: "₹40/kg", dealer: "Bharat Seeds", dist: "3 km", phone: "919876543213" },
];

function BuyTab() {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      {INPUT_DEMOS.map((p, i) => (
        <div key={i} className="glass-card rounded-2xl p-4 flex justify-between items-center">
          <div className="flex-1">
            <div className="text-xs">{p.cat}</div>
            <div className="font-bold text-primary">{p.name}</div>
            <div className="text-sm font-semibold">{p.price}</div>
            <div className="text-xs text-muted-foreground">{p.dealer} • {p.dist}</div>
          </div>
          <button type="button" onClick={() => contactSeller(p.phone, p.name, "buy")} className="min-touch px-3 bg-success text-primary-foreground rounded-xl font-semibold text-xs flex items-center gap-1">
            <Phone className="w-4 h-4" /> {t("contact")}
          </button>
        </div>
      ))}
    </div>
  );
}

function EquipTab() {
  const { t } = useLang();
  const [mode, setMode] = useState<"rent" | "buy">("rent");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 glass-card rounded-2xl p-1">
        {(["rent", "buy"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`py-2.5 rounded-xl font-bold text-sm ${mode === m ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t(m === "rent" ? "rentMode" : "buyMode")}
          </button>
        ))}
      </div>
      <div className="glass-card rounded-2xl p-4 space-y-3 text-center">
        <div className="text-5xl">🚜</div>
        <p className="text-sm">{t("equipDesc")} — {t(mode === "rent" ? "forRent" : "forBuy")}</p>
        <a href="https://www.olx.in/items/q-tractor" target="_blank" className="min-touch px-4 bg-accent text-accent-foreground rounded-xl font-bold inline-flex items-center gap-2">
          <ExternalLink className="w-4 h-4" /> {t("viewOlx")}
        </a>
        <a href="https://dir.indiamart.com/impcat/agriculture-equipment.html" target="_blank" className="min-touch px-4 bg-secondary rounded-xl font-bold inline-flex items-center gap-2 ml-2">
          <ExternalLink className="w-4 h-4" /> Indiamart
        </a>
      </div>
    </div>
  );
}
