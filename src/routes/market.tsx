import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Phone, MapPin, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MANDI_PRICES } from "@/lib/demoResults";
import { getData, saveData } from "@/lib/db";

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
  const [tab, setTab] = useState<Tab>("mandi");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 glass-card rounded-2xl p-1">
        {(["mandi", "sell", "buy", "equip"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`py-2.5 rounded-xl text-xs font-bold ${tab === t ? "gradient-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
            {t === "mandi" ? "💰 मंडी" : t === "sell" ? "🌾 बेचें" : t === "buy" ? "🌱 खरीदें" : "🚜 उपकरण"}
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
  const trendIcon = {
    up: <TrendingUp className="w-4 h-4 text-success" />,
    down: <TrendingDown className="w-4 h-4 text-destructive" />,
    stable: <Minus className="w-4 h-4 text-muted-foreground" />,
  };
  const trendColor = { up: "text-success", down: "text-destructive", stable: "text-muted-foreground" } as const;
  return (
    <div className="glass-card rounded-2xl p-4">
      <h2 className="font-bold text-primary mb-3">आज के मंडी भाव • Karnataka</h2>
      <div className="space-y-1">
        {MANDI_PRICES.map((m) => (
          <div key={m.crop} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <div className="font-bold text-sm">{m.hi}</div>
              <div className="text-[10px] text-muted-foreground">{m.crop}</div>
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
      <p className="text-[10px] text-muted-foreground mt-3 text-center">May 2026 • स्थानीय मंडी अनुमान</p>
    </div>
  );
}

function SellTab() {
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
        <Plus className="w-5 h-5" /> नई फसल पोस्ट करें
      </button>
      {show && (
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="फसल का नाम (Tomato)" value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="मात्रा (500 kg)" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="भाव (₹22/kg)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="WhatsApp नंबर" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="w-full min-touch px-3 rounded-xl border bg-background" placeholder="स्थान" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <button onClick={post} className="w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold">पोस्ट करें</button>
        </div>
      )}
      {listings.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">कोई लिस्टिंग नहीं — पहली बेच पोस्ट करें</div>
      ) : (
        listings.map((l) => (
          <div key={l.id} className="glass-card rounded-2xl p-4 flex justify-between items-center">
            <div>
              <div className="font-bold text-primary">{l.crop} • {l.qty}</div>
              <div className="text-sm">{l.price}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{l.location}</div>
            </div>
            <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" className="min-touch px-4 bg-success text-primary-foreground rounded-xl font-semibold text-sm flex items-center gap-1">
              <Phone className="w-4 h-4" /> WhatsApp
            </a>
          </div>
        ))
      )}
    </div>
  );
}

const INPUT_DEMOS = [
  { cat: "🌱 बीज", name: "Hybrid Tomato Seeds", price: "₹450/100g", dealer: "Krishi Kendra", dist: "2.5 km", phone: "919876543210" },
  { cat: "🧪 खाद", name: "DAP 50kg bag", price: "₹1,350", dealer: "IFFCO Center", dist: "4 km", phone: "919876543211" },
  { cat: "🐛 कीटनाशक", name: "Neem Oil 1L", price: "₹320", dealer: "Organic Mart", dist: "1.2 km", phone: "919876543212" },
  { cat: "🌾 बीज", name: "Wheat HD-2967", price: "₹40/kg", dealer: "Bharat Seeds", dist: "3 km", phone: "919876543213" },
];

function BuyTab() {
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
          <a href={`https://wa.me/${p.phone}`} target="_blank" className="min-touch px-3 bg-success text-primary-foreground rounded-xl font-semibold text-xs flex items-center gap-1">
            <Phone className="w-4 h-4" /> संपर्क
          </a>
        </div>
      ))}
    </div>
  );
}

function EquipTab() {
  const [mode, setMode] = useState<"rent" | "buy">("rent");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 glass-card rounded-2xl p-1">
        {(["rent", "buy"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`py-2.5 rounded-xl font-bold text-sm ${mode === m ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "rent" ? "🔄 किराये पर" : "💰 खरीदें"}
          </button>
        ))}
      </div>
      <div className="glass-card rounded-2xl p-4 space-y-3 text-center">
        <div className="text-5xl">🚜</div>
        <p className="text-sm">ट्रैक्टर, हार्वेस्टर, पंप — {mode === "rent" ? "किराये पर" : "खरीदने के लिए"}</p>
        <a href="https://www.olx.in/items/q-tractor" target="_blank" className="min-touch px-4 bg-accent text-accent-foreground rounded-xl font-bold inline-flex items-center gap-2">
          <ExternalLink className="w-4 h-4" /> OLX पर देखें
        </a>
        <a href="https://dir.indiamart.com/impcat/agriculture-equipment.html" target="_blank" className="min-touch px-4 bg-secondary rounded-xl font-bold inline-flex items-center gap-2 ml-2">
          <ExternalLink className="w-4 h-4" /> Indiamart
        </a>
      </div>
    </div>
  );
}
