// Real Agmarknet mandi prices via Data.gov.in (server-proxied) with Groq AI fallback
import { cacheGet, cacheSet, getData, saveData } from "./db";
import { getCoords } from "./weatherApi";
import { groqText } from "./groqApi";
import type { MandiPrice } from "./demoResults";
import type { Lang } from "@/i18n/LanguageContext";

const CACHE_KEY = "mandiPricesReal";
const RAW_KEY = "mandiPricesRealRaw";
const TTL_MS = 6 * 60 * 60 * 1000;

const VEGETABLES = new Set([
  "Tomato", "Onion", "Potato", "Brinjal", "Cabbage", "Cauliflower", "Carrot",
  "Cucumber", "Lady Finger", "Bhindi", "Capsicum", "Bitter Gourd", "Bottle Gourd",
  "Pumpkin", "Spinach", "Green Chilli", "Garlic", "Ginger", "Beans", "Peas",
  "Beetroot", "Radish", "Coriander", "Mint",
]);

export interface RealMandiPrice extends MandiPrice {
  market: string;
  arrivalDate: string;
}

export interface RealMandiResult {
  prices: RealMandiPrice[];
  updatedAt: number;
  state: string;
  district: string;
  stale: boolean;
  source: "agmarknet" | "ai" | "cached";
  disclaimer?: string;
}

interface ApiRecord {
  state?: string; district?: string; market?: string; commodity?: string;
  variety?: string; arrival_date?: string; modal_price?: string;
  Modal_Price?: string; Commodity?: string; Market?: string;
  Arrival_Date?: string; State?: string; District?: string;
}

async function reverseGeocode(lat: number, lon: number): Promise<{ state: string; district: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const r = await fetch(url, { headers: { "Accept-Language": "en" } });
    const j = await r.json();
    const a = j?.address ?? {};
    const state = a.state || "Karnataka";
    const district = a.state_district || a.county || a.district || a.city || "Bangalore";
    return { state, district: String(district).replace(/\s+District$/i, "") };
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Reverse geocode failed:", e);
    return { state: "Karnataka", district: "Bangalore" };
  }
}

function toMandi(rec: ApiRecord): RealMandiPrice {
  const commodity = (rec.Commodity || rec.commodity || "").trim();
  const market = (rec.Market || rec.market || "").trim();
  const arrival = (rec.Arrival_Date || rec.arrival_date || "").trim();
  const modalQuintal = Number(rec.Modal_Price || rec.modal_price || 0);
  const isVeg = VEGETABLES.has(commodity);
  const price = isVeg ? Math.round(modalQuintal / 100) : Math.round(modalQuintal);
  const unit: MandiPrice["unit"] = isVeg ? "kg" : "quintal";
  const allLangs: Record<Lang, string> = {
    en: commodity, hi: commodity, ta: commodity, kn: commodity,
    bn: commodity, te: commodity, mr: commodity, pa: commodity,
  };
  return {
    crop: commodity, hi: commodity, names: allLangs,
    price, unit, trend: "stable", change: "→",
    market, arrivalDate: arrival,
  };
}

function currentSeason(): string {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 9) return "Kharif (Monsoon)";
  if (m >= 10 || m <= 3) return "Rabi (Winter)";
  return "Zaid (Summer)";
}

const COMMON_COMMODITIES = [
  "Tomato", "Onion", "Potato", "Wheat", "Rice", "Cotton",
  "Maize", "Soybean", "Groundnut", "Chilli", "Brinjal", "Garlic",
];

const HINDI_NAMES: Record<string, string> = {
  Tomato: "टमाटर", Onion: "प्याज", Potato: "आलू", Wheat: "गेहूं",
  Rice: "चावल", Cotton: "कपास", Maize: "मक्का", Soybean: "सोयाबीन",
  Groundnut: "मूंगफली", Chilli: "मिर्च", Brinjal: "बैंगन", Garlic: "लहसुन",
};

interface AiPrice {
  commodity: string; commodityHindi?: string;
  minPrice?: number; maxPrice?: number; modalPrice: number;
  unit?: "kg" | "quintal"; mandi?: string;
  trend?: "up" | "down" | "stable"; trendPercent?: number;
}

async function fetchGroqEstimate(state: string, district: string): Promise<RealMandiResult | null> {
  try {
    const sys = "You are an Indian agricultural market expert. Output ONLY valid JSON.";
    const user = `Today: ${new Date().toLocaleDateString("en-IN")}
Farmer location: ${district}, ${state}, India
Season: ${currentSeason()}
Give realistic current mandi prices for these commodities for today, considering seasonal patterns and recent trends: ${COMMON_COMMODITIES.join(", ")}.
Return ONLY this JSON shape:
{"prices":[{"commodity":"Tomato","commodityHindi":"टमाटर","minPrice":number,"maxPrice":number,"modalPrice":number,"unit":"kg|quintal","mandi":"nearest mandi name","trend":"up|down|stable","trendPercent":number}],"lastUpdated":"${new Date().toLocaleDateString("en-IN")}","disclaimer":"AI अनुमानित भाव - वास्तविक भाव मंडी में भिन्न हो सकते हैं"}`;
    const json = await groqText(sys, user);
    const list: AiPrice[] = json?.prices ?? [];
    if (!list.length) return null;
    const prices: RealMandiPrice[] = list
      .filter((p) => p.commodity && typeof p.modalPrice === "number" && p.modalPrice > 0)
      .map((p) => {
        const commodity = p.commodity;
        const hi = p.commodityHindi || HINDI_NAMES[commodity] || commodity;
        const allLangs: Record<Lang, string> = {
          en: commodity, hi, ta: commodity, kn: commodity,
          bn: commodity, te: commodity, mr: commodity, pa: commodity,
        };
        const trend = p.trend ?? "stable";
        const pct = p.trendPercent ?? 0;
        return {
          crop: commodity, hi, names: allLangs,
          price: Math.round(p.modalPrice),
          unit: (p.unit === "quintal" ? "quintal" : "kg"),
          trend, change: trend === "up" ? `+${pct}%` : trend === "down" ? `-${pct}%` : "→",
          market: p.mandi || `${district} Mandi`,
          arrivalDate: new Date().toLocaleDateString("en-IN"),
        };
      });
    if (!prices.length) return null;
    return {
      prices, updatedAt: Date.now(), state, district, stale: false,
      source: "ai",
      disclaimer: json?.disclaimer || "AI अनुमानित भाव - वास्तविक भाव मंडी में भिन्न हो सकते हैं",
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn("Groq mandi estimate failed:", e);
    return null;
  }
}

let inflight: Promise<RealMandiResult | null> | null = null;

export async function fetchRealMandiPrices(force = false): Promise<RealMandiResult | null> {
  if (!force) {
    const cached = cacheGet<RealMandiResult>(CACHE_KEY);
    if (cached) return { ...cached, stale: false };
  }
  if (inflight) return inflight;
  inflight = (async () => {
    let state = "Karnataka";
    let district = "Bangalore";
    try {
      const { lat, lon } = await getCoords();
      const geo = await reverseGeocode(lat, lon);
      state = geo.state; district = geo.district;
      const url = `/api/mandi?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
      const r = await fetch(url);
      const data = await r.json();
      const records: ApiRecord[] = data?.records ?? [];
      if (!records.length) throw new Error(data?.error || "no records");
      const prices = records.map(toMandi).filter((p) => p.crop && p.price > 0);
      if (!prices.length) throw new Error("no usable records");
      const result: RealMandiResult = {
        prices, updatedAt: Date.now(), state, district, stale: false, source: "agmarknet",
      };
      cacheSet(CACHE_KEY, result, TTL_MS);
      saveData(RAW_KEY, result);
      return result;
    } catch (e) {
      if (import.meta.env.DEV) console.error("Mandi fetch failed, trying AI fallback:", e);
      const ai = await fetchGroqEstimate(state, district);
      if (ai) {
        cacheSet(CACHE_KEY, ai, TTL_MS);
        saveData(RAW_KEY, ai);
        return ai;
      }
      const raw = getData<RealMandiResult>(RAW_KEY);
      if (raw) return { ...raw, stale: true, source: raw.source ?? "cached" };
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
