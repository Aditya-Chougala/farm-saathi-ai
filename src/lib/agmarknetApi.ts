// Real Agmarknet mandi prices via Data.gov.in
import { cacheGet, cacheSet, getData, saveData } from "./db";
import { getCoords } from "./weatherApi";
import type { MandiPrice } from "./demoResults";
import { MANDI_PRICES } from "./demoResults";
import type { Lang } from "@/i18n/LanguageContext";

const API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aab56540cef3a8e4f19";
const RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";
const CACHE_KEY = "mandiPricesReal";
const RAW_KEY = "mandiPricesRealRaw"; // {prices, updatedAt} — kept past TTL for fallback
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
}

interface ApiRecord {
  state?: string;
  district?: string;
  market?: string;
  commodity?: string;
  variety?: string;
  arrival_date?: string;
  modal_price?: string;
  Modal_Price?: string;
  Commodity?: string;
  Market?: string;
  Arrival_Date?: string;
  State?: string;
  District?: string;
}

async function reverseGeocode(lat: number, lon: number): Promise<{ state: string; district: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const r = await fetch(url, { headers: { "Accept-Language": "en" } });
    const j = await r.json();
    const a = j?.address ?? {};
    const state = a.state || "Karnataka";
    const district = a.state_district || a.county || a.district || a.city || "Bangalore";
    console.log("Reverse geocode:", state, district);
    return { state, district: String(district).replace(/\s+District$/i, "") };
  } catch (e) {
    console.warn("Reverse geocode failed:", e);
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
  const known = MANDI_PRICES.find((m) => m.crop.toLowerCase() === commodity.toLowerCase());
  const allLangs: Record<Lang, string> = known?.names ?? {
    en: commodity, hi: commodity, ta: commodity, kn: commodity, bn: commodity, te: commodity, mr: commodity,
  };
  return {
    crop: commodity,
    hi: known?.hi ?? commodity,
    names: allLangs,
    price,
    unit,
    trend: "stable",
    change: "→",
    market,
    arrivalDate: arrival,
  };
}

export async function fetchRealMandiPrices(force = false): Promise<RealMandiResult | null> {
  if (!force) {
    const cached = cacheGet<RealMandiResult>(CACHE_KEY);
    if (cached) return { ...cached, stale: false };
  }
  try {
    const { lat, lon } = await getCoords();
    const { state, district } = await reverseGeocode(lat, lon);
    const url = `https://api.data.gov.in/resource/${RESOURCE}?api-key=${API_KEY}&format=json&filters%5BState.keyword%5D=${encodeURIComponent(state)}&filters%5BDistrict.keyword%5D=${encodeURIComponent(district)}&limit=20`;
    console.log("Mandi API request:", url);
    const r = await fetch(url);
    const data = await r.json();
    console.log("Mandi API response:", data);
    const records: ApiRecord[] = data?.records ?? [];
    if (!records.length) throw new Error("no records");
    const prices = records.map(toMandi).filter((p) => p.crop && p.price > 0);
    const result: RealMandiResult = {
      prices,
      updatedAt: Date.now(),
      state,
      district,
      stale: false,
    };
    cacheSet(CACHE_KEY, result, TTL_MS);
    saveData(RAW_KEY, result);
    return result;
  } catch (e) {
    console.error("Mandi fetch failed:", e);
    const raw = getData<RealMandiResult>(RAW_KEY);
    if (raw) return { ...raw, stale: true };
    return null;
  }
}

export function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
