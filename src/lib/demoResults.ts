import type { Lang } from "@/i18n/LanguageContext";

type LName = Record<Lang, string>;

export interface DemoCrop {
  cropName: string;
  cropNameHindi: string; // legacy field, kept for backward compat
  names?: LName;
  cropEmoji: string;
  matchScore: number;
  financial: {
    costPerAcre: number;
    expectedRevenuePerAcre: number;
    expectedProfitPerAcre: number;
    roi: number;
  };
  risk: { level: "low" | "medium" | "high"; mainRisks: string[]; riskScore: number };
  timeline: { growingDays: number; sowingWindow: string; harvestWindow: string };
  market: {
    currentPricePerKg: number;
    priceTrend: "up" | "down" | "stable";
    nearestMandi: string;
    priceForecast: { month: string; price: number }[];
  };
  cultivation: { fertilizerSchedule: string; irrigationSchedule: string };
  suitabilityReasons: string[];
  warnings: string[];
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
function forecast(base: number, drift: number): { month: string; price: number }[] {
  return months.map((m, i) => ({ month: m, price: Math.round(base + drift * i + (Math.random() * 2 - 1)) }));
}

const N = (en: string, hi: string, ta: string, kn: string, bn: string, te: string, mr: string): LName => ({ en, hi, ta, kn, bn, te, mr });

export const DEMO_CROPS: DemoCrop[] = [
  {
    cropName: "Tomato",
    cropNameHindi: "टमाटर",
    names: N("Tomato", "टमाटर", "தக்காளி", "ಟೊಮೇಟೊ", "টমেটো", "టమోటా", "टोमॅटो"),
    cropEmoji: "🍅",
    matchScore: 92,
    financial: { costPerAcre: 35000, expectedRevenuePerAcre: 75000, expectedProfitPerAcre: 40000, roi: 114 },
    risk: { level: "medium", mainRisks: ["Price volatility", "Disease risk"], riskScore: 55 },
    timeline: { growingDays: 90, sowingWindow: "Jun-Jul", harvestWindow: "Sep-Oct" },
    market: { currentPricePerKg: 22, priceTrend: "up", nearestMandi: "Azadpur Mandi", priceForecast: forecast(22, 1.5) },
    cultivation: { fertilizerSchedule: "NPK every 15 days", irrigationSchedule: "Drip - 30 min daily" },
    suitabilityReasons: ["Soil suitable", "Budget match", "Weather favourable"],
    warnings: ["Watch for fungus during rains"],
  },
  {
    cropName: "Wheat",
    cropNameHindi: "गेहूं",
    names: N("Wheat", "गेहूं", "கோதுமை", "ಗೋಧಿ", "গম", "గోధుమ", "गहू"),
    cropEmoji: "🌾",
    matchScore: 88,
    financial: { costPerAcre: 18000, expectedRevenuePerAcre: 43000, expectedProfitPerAcre: 25000, roi: 138 },
    risk: { level: "low", mainRisks: ["Yellow rust"], riskScore: 25 },
    timeline: { growingDays: 120, sowingWindow: "November", harvestWindow: "Mar-Apr" },
    market: { currentPricePerKg: 24, priceTrend: "stable", nearestMandi: "Karnal Mandi", priceForecast: forecast(24, 0.3) },
    cultivation: { fertilizerSchedule: "DAP at sowing, urea after 30 days", irrigationSchedule: "4-5 irrigations" },
    suitabilityReasons: ["Low risk", "MSP supported", "Easy storage"],
    warnings: ["Prevent yellow rust"],
  },
  {
    cropName: "Cotton",
    cropNameHindi: "कपास",
    names: N("Cotton", "कपास", "பருத்தி", "ಹತ್ತಿ", "তুলা", "పత్తి", "कापूस"),
    cropEmoji: "☁️",
    matchScore: 80,
    financial: { costPerAcre: 30000, expectedRevenuePerAcre: 65000, expectedProfitPerAcre: 35000, roi: 116 },
    risk: { level: "medium", mainRisks: ["Pink bollworm", "Unseasonal rain"], riskScore: 50 },
    timeline: { growingDays: 180, sowingWindow: "May-Jun", harvestWindow: "Oct-Dec" },
    market: { currentPricePerKg: 65, priceTrend: "up", nearestMandi: "Yavatmal Mandi", priceForecast: forecast(65, 2) },
    cultivation: { fertilizerSchedule: "NPK 3 times", irrigationSchedule: "Sprinkler every 7 days" },
    suitabilityReasons: ["Black soil suitable", "Good price", "Export demand"],
    warnings: ["Check for bollworm"],
  },
  {
    cropName: "Onion",
    cropNameHindi: "प्याज",
    names: N("Onion", "प्याज", "வெங்காயம்", "ಈರುಳ್ಳಿ", "পেঁয়াজ", "ఉల్లిపాయ", "कांदा"),
    cropEmoji: "🧅",
    matchScore: 75,
    financial: { costPerAcre: 40000, expectedRevenuePerAcre: 85000, expectedProfitPerAcre: 45000, roi: 112 },
    risk: { level: "high", mainRisks: ["Price crash", "Storage loss"], riskScore: 75 },
    timeline: { growingDays: 100, sowingWindow: "October", harvestWindow: "Feb-Mar" },
    market: { currentPricePerKg: 18, priceTrend: "stable", nearestMandi: "Lasalgaon Mandi", priceForecast: forecast(18, 0.8) },
    cultivation: { fertilizerSchedule: "Manure + NPK", irrigationSchedule: "Flood every 10 days" },
    suitabilityReasons: ["High profit potential", "Less water", "Market nearby"],
    warnings: ["Price unstable", "Storage care"],
  },
  {
    cropName: "Soybean",
    cropNameHindi: "सोयाबीन",
    names: N("Soybean", "सोयाबीन", "சோயாபீன்ஸ்", "ಸೋಯಾಬೀನ್", "সয়াবিন", "సోయాబీన్", "सोयाबीन"),
    cropEmoji: "🫘",
    matchScore: 78,
    financial: { costPerAcre: 15000, expectedRevenuePerAcre: 45000, expectedProfitPerAcre: 30000, roi: 200 },
    risk: { level: "low", mainRisks: ["Yellow mosaic"], riskScore: 30 },
    timeline: { growingDays: 100, sowingWindow: "Jun-Jul", harvestWindow: "October" },
    market: { currentPricePerKg: 45, priceTrend: "up", nearestMandi: "Indore Mandi", priceForecast: forecast(45, 1) },
    cultivation: { fertilizerSchedule: "DAP at sowing", irrigationSchedule: "Rain-fed" },
    suitabilityReasons: ["Low cost", "Good ROI", "Soil improvement"],
    warnings: ["Watch yellow mosaic"],
  },
];

export interface MandiPrice {
  crop: string;          // English crop key
  hi: string;            // legacy
  names: LName;          // localized display name
  price: number;
  unit: "kg" | "quintal";
  trend: "up" | "down" | "stable";
  change: string;
}

export const MANDI_PRICES: MandiPrice[] = [
  { crop: "Tomato",    hi: "टमाटर",   names: N("Tomato",    "टमाटर",   "தக்காளி",     "ಟೊಮೇಟೊ",     "টমেটো",   "టమోటా",      "टोमॅटो"),     price: 22,   unit: "kg",      trend: "up",     change: "+₹4" },
  { crop: "Onion",     hi: "प्याज",   names: N("Onion",     "प्याज",   "வெங்காயம்",   "ಈರುಳ್ಳಿ",     "পেঁয়াজ",  "ఉల్లిపాయ",   "कांदा"),       price: 18,   unit: "kg",      trend: "stable", change: "→" },
  { crop: "Potato",    hi: "आलू",    names: N("Potato",    "आलू",    "உருளைக்கிழங்கு", "ಆಲೂಗಡ್ಡೆ",   "আলু",     "బంగాళదుంప", "बटाटा"),       price: 15,   unit: "kg",      trend: "down",   change: "-₹2" },
  { crop: "Wheat",     hi: "गेहूं",   names: N("Wheat",     "गेहूं",   "கோதுமை",      "ಗೋಧಿ",       "গম",      "గోధుమ",     "गहू"),         price: 2425, unit: "quintal", trend: "stable", change: "→" },
  { crop: "Rice",      hi: "धान",    names: N("Rice",      "धान",    "அரிசி",       "ಅಕ್ಕಿ",        "ধান",     "వరి",        "तांदूळ"),       price: 2800, unit: "quintal", trend: "up",     change: "+₹100" },
  { crop: "Cotton",    hi: "कपास",   names: N("Cotton",    "कपास",   "பருத்தி",     "ಹತ್ತಿ",       "তুলা",    "పత్తి",      "कापूस"),       price: 6500, unit: "quintal", trend: "up",     change: "+₹200" },
  { crop: "Maize",     hi: "मक्का",  names: N("Maize",     "मक्का",  "சோளம்",       "ಮೆಕ್ಕೆಜೋಳ",   "ভুট্টা",   "మొక్కజొన్న",  "मका"),         price: 2100, unit: "quintal", trend: "down",   change: "-₹50" },
  { crop: "Soybean",   hi: "सोयाबीन", names: N("Soybean",   "सोयाबीन", "சோயாபீன்ஸ்",  "ಸೋಯಾಬೀನ್",  "সয়াবিন", "సోయాబీన్",   "सोयाबीन"),     price: 4500, unit: "quintal", trend: "up",     change: "+₹150" },
  { crop: "Groundnut", hi: "मूंगफली", names: N("Groundnut", "मूंगफली", "நிலக்கடலை",   "ನೆಲಗಡಲೆ",    "চিনাবাদাম","వేరుశనగ",   "भुईमूग"),       price: 5500, unit: "quintal", trend: "stable", change: "→" },
  { crop: "Sugarcane", hi: "गन्ना",  names: N("Sugarcane", "गन्ना",  "கரும்பு",     "ಕಬ್ಬು",       "আখ",      "చెరుకు",     "ऊस"),          price: 350,  unit: "quintal", trend: "stable", change: "→" },
];

export const QUOTES = [
  "🌿 Healthy soil, happy farmer, prosperous tomorrow.",
  "🌾 Smart farming starts with smart decisions.",
  "💚 Every seed you plant is hope for tomorrow.",
  "🤝 Together we grow stronger communities.",
];

export const SOIL_TYPES = [
  { en: "Red soil",   hi: "लाल मिट्टी",   names: N("Red soil",   "लाल मिट्टी",   "சிவப்பு மண்",   "ಕೆಂಪು ಮಣ್ಣು",  "লাল মাটি",  "ఎరుపు మట్టి",  "लाल माती"),   color: "#C1440E" },
  { en: "Black soil", hi: "काली मिट्टी",  names: N("Black soil", "काली मिट्टी",  "கருப்பு மண்",   "ಕಪ್ಪು ಮಣ್ಣು",  "কালো মাটি", "నలుపు మట్టి",  "काळी माती"),  color: "#2C2C2C" },
  { en: "Sandy soil", hi: "रेतीली मिट्टी", names: N("Sandy soil", "रेतीली मिट्टी", "மணல் மண்",      "ಮರಳು ಮಣ್ಣು",  "বেলে মাটি", "ఇసుక మట్టి",   "वाळूमय माती"), color: "#E8D5A3" },
  { en: "Loamy soil", hi: "दोमट मिट्टी",  names: N("Loamy soil", "दोमट मिट्टी",  "லோமி மண்",      "ಲೋಮಿ ಮಣ್ಣು",  "দোআঁশ মাটি","లోమీ మట్టి",   "गाळमिश्रित माती"), color: "#8B6914" },
  { en: "Clay soil",  hi: "चिकनी मिट्टी",  names: N("Clay soil",  "चिकनी मिट्टी",  "களிமண்",        "ಜೇಡಿಮಣ್ಣು",   "এঁটেল মাটি", "బంకమట్టి",     "चिकणमाती"),    color: "#A0785A" },
];
