export interface DemoCrop {
  cropName: string;
  cropNameHindi: string;
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

export const DEMO_CROPS: DemoCrop[] = [
  {
    cropName: "Tomato",
    cropNameHindi: "टमाटर",
    cropEmoji: "🍅",
    matchScore: 92,
    financial: { costPerAcre: 35000, expectedRevenuePerAcre: 75000, expectedProfitPerAcre: 40000, roi: 114 },
    risk: { level: "medium", mainRisks: ["कीमत में उतार-चढ़ाव", "रोग का खतरा"], riskScore: 55 },
    timeline: { growingDays: 90, sowingWindow: "जून-जुलाई", harvestWindow: "सितंबर-अक्टूबर" },
    market: { currentPricePerKg: 22, priceTrend: "up", nearestMandi: "Azadpur Mandi", priceForecast: forecast(22, 1.5) },
    cultivation: { fertilizerSchedule: "NPK 15 दिन में एक बार", irrigationSchedule: "ड्रिप - रोज़ 30 मिनट" },
    suitabilityReasons: ["आपकी मिट्टी उपयुक्त", "अच्छा बजट मेल", "मौसम अनुकूल"],
    warnings: ["वर्षा के समय फफूंदी का ध्यान"],
  },
  {
    cropName: "Wheat",
    cropNameHindi: "गेहूं",
    cropEmoji: "🌾",
    matchScore: 88,
    financial: { costPerAcre: 18000, expectedRevenuePerAcre: 43000, expectedProfitPerAcre: 25000, roi: 138 },
    risk: { level: "low", mainRisks: ["पीला रतुआ"], riskScore: 25 },
    timeline: { growingDays: 120, sowingWindow: "नवंबर", harvestWindow: "मार्च-अप्रैल" },
    market: { currentPricePerKg: 24, priceTrend: "stable", nearestMandi: "Karnal Mandi", priceForecast: forecast(24, 0.3) },
    cultivation: { fertilizerSchedule: "DAP बुवाई समय, यूरिया 30 दिन बाद", irrigationSchedule: "4-5 सिंचाई कुल" },
    suitabilityReasons: ["कम जोखिम", "पक्का MSP समर्थन", "भंडारण आसान"],
    warnings: ["पीला रतुआ रोकें"],
  },
  {
    cropName: "Cotton",
    cropNameHindi: "कपास",
    cropEmoji: "☁️",
    matchScore: 80,
    financial: { costPerAcre: 30000, expectedRevenuePerAcre: 65000, expectedProfitPerAcre: 35000, roi: 116 },
    risk: { level: "medium", mainRisks: ["गुलाबी सुंडी", "बेमौसम बारिश"], riskScore: 50 },
    timeline: { growingDays: 180, sowingWindow: "मई-जून", harvestWindow: "अक्टूबर-दिसंबर" },
    market: { currentPricePerKg: 65, priceTrend: "up", nearestMandi: "Yavatmal Mandi", priceForecast: forecast(65, 2) },
    cultivation: { fertilizerSchedule: "NPK 3 बार", irrigationSchedule: "स्प्रिंकलर 7 दिन में" },
    suitabilityReasons: ["काली मिट्टी उपयुक्त", "अच्छा भाव", "निर्यात मांग"],
    warnings: ["सुंडी जांच करें"],
  },
  {
    cropName: "Onion",
    cropNameHindi: "प्याज",
    cropEmoji: "🧅",
    matchScore: 75,
    financial: { costPerAcre: 40000, expectedRevenuePerAcre: 85000, expectedProfitPerAcre: 45000, roi: 112 },
    risk: { level: "high", mainRisks: ["कीमत क्रैश", "भंडारण नुकसान"], riskScore: 75 },
    timeline: { growingDays: 100, sowingWindow: "अक्टूबर", harvestWindow: "फरवरी-मार्च" },
    market: { currentPricePerKg: 18, priceTrend: "stable", nearestMandi: "Lasalgaon Mandi", priceForecast: forecast(18, 0.8) },
    cultivation: { fertilizerSchedule: "गोबर खाद + NPK", irrigationSchedule: "बाढ़ सिंचाई 10 दिन में" },
    suitabilityReasons: ["ज़्यादा मुनाफ़ा संभव", "कम पानी", "बाज़ार पास"],
    warnings: ["कीमत स्थिर नहीं", "भंडारण सावधानी"],
  },
  {
    cropName: "Soybean",
    cropNameHindi: "सोयाबीन",
    cropEmoji: "🫘",
    matchScore: 78,
    financial: { costPerAcre: 15000, expectedRevenuePerAcre: 45000, expectedProfitPerAcre: 30000, roi: 200 },
    risk: { level: "low", mainRisks: ["पीला मोज़ेक"], riskScore: 30 },
    timeline: { growingDays: 100, sowingWindow: "जून-जुलाई", harvestWindow: "अक्टूबर" },
    market: { currentPricePerKg: 45, priceTrend: "up", nearestMandi: "Indore Mandi", priceForecast: forecast(45, 1) },
    cultivation: { fertilizerSchedule: "DAP बुवाई समय", irrigationSchedule: "वर्षा आधारित" },
    suitabilityReasons: ["कम लागत", "अच्छा ROI", "मिट्टी सुधार"],
    warnings: ["पीला मोज़ेक देखें"],
  },
];

export const MANDI_PRICES = [
  { crop: "Tomato", hi: "टमाटर", price: 22, trend: "up" as const },
  { crop: "Onion", hi: "प्याज", price: 18, trend: "stable" as const },
  { crop: "Potato", hi: "आलू", price: 15, trend: "down" as const },
  { crop: "Wheat", hi: "गेहूं", price: 24, trend: "stable" as const },
  { crop: "Rice", hi: "चावल", price: 35, trend: "up" as const },
  { crop: "Cotton", hi: "कपास", price: 65, trend: "up" as const },
  { crop: "Sugarcane", hi: "गन्ना", price: 3.5, trend: "stable" as const },
  { crop: "Maize", hi: "मक्का", price: 20, trend: "down" as const },
  { crop: "Soybean", hi: "सोयाबीन", price: 45, trend: "up" as const },
  { crop: "Groundnut", hi: "मूंगफली", price: 55, trend: "stable" as const },
];

export const QUOTES = [
  "🌿 Healthy soil, happy farmer, prosperous tomorrow.",
  "🌾 Smart farming starts with smart decisions.",
  "💚 Every seed you plant is hope for tomorrow.",
  "🤝 Together we grow stronger communities.",
];

export const SOIL_TYPES = [
  { en: "Red soil", hi: "लाल मिट्टी", color: "#C1440E" },
  { en: "Black soil", hi: "काली मिट्टी", color: "#2C2C2C" },
  { en: "Sandy soil", hi: "रेतीली मिट्टी", color: "#E8D5A3" },
  { en: "Loamy soil", hi: "दोमट मिट्टी", color: "#8B6914" },
  { en: "Clay soil", hi: "चिकनी मिट्टी", color: "#A0785A" },
];
