export const translations = {
  appName: { hi: "फार्मस्मार्ट AI", en: "FarmSmart AI" },
  tagline: { hi: "किसान का अपना सहायक", en: "Your farming companion" },
  // Nav
  home: { hi: "घर", en: "Home" },
  crop: { hi: "फसल", en: "Crop" },
  disease: { hi: "रोग", en: "Disease" },
  market: { hi: "बाज़ार", en: "Market" },
  profile: { hi: "प्रोफ़ाइल", en: "Profile" },
  // Home
  weatherToday: { hi: "आज का मौसम", en: "Today's Weather" },
  cropSuggestion: { hi: "फसल सुझाव", en: "Crop Suggestion" },
  diseaseDetect: { hi: "रोग पहचान", en: "Disease Detection" },
  mandiPrices: { hi: "मंडी भाव", en: "Mandi Prices" },
  marketplace: { hi: "बाज़ार", en: "Marketplace" },
  // Crop flow
  step1Soil: { hi: "मिट्टी की फोटो", en: "Soil photo" },
  step2Details: { hi: "खेत की जानकारी", en: "Farm details" },
  step3Loading: { hi: "विश्लेषण", en: "Analyzing" },
  step4Results: { hi: "परिणाम", en: "Results" },
  takePhoto: { hi: "फोटो लें", en: "Take Photo" },
  uploadPhoto: { hi: "फोटो अपलोड करें", en: "Upload Photo" },
  analyzeSoil: { hi: "मिट्टी जांचें", en: "Analyze Soil" },
  landAcres: { hi: "जमीन (एकड़)", en: "Land (acres)" },
  budget: { hi: "बजट (₹)", en: "Budget (₹)" },
  irrigation: { hi: "सिंचाई", en: "Irrigation" },
  season: { hi: "मौसम", en: "Season" },
  experience: { hi: "अनुभव", en: "Experience" },
  next: { hi: "आगे", en: "Next" },
  back: { hi: "पीछे", en: "Back" },
  retry: { hi: "फिर से", en: "Retry" },
  // Disease
  scanLeaf: { hi: "पत्ती स्कैन करें", en: "Scan Leaf" },
  detecting: { hi: "पहचान हो रही है...", en: "Detecting..." },
  treatment: { hi: "उपचार", en: "Treatment" },
  organic: { hi: "जैविक", en: "Organic" },
  chemical: { hi: "रासायनिक", en: "Chemical" },
  prevention: { hi: "रोकथाम", en: "Prevention" },
  shareWhatsapp: { hi: "WhatsApp पर साझा", en: "Share on WhatsApp" },
  findDealer: { hi: "नज़दीकी डीलर", en: "Nearby Dealer" },
  // Market
  sellCrop: { hi: "फसल बेचें", en: "Sell Crop" },
  buyInputs: { hi: "खाद/बीज", en: "Inputs" },
  equipment: { hi: "उपकरण", en: "Equipment" },
  // Profile
  scanHistory: { hi: "स्कैन इतिहास", en: "Scan History" },
  activeTreatments: { hi: "चालू उपचार", en: "Active Treatments" },
  // Generic
  offline: { hi: "📵 इंटरनेट नहीं है — पुराना डेटा दिखा रहे हैं", en: "📵 Offline — showing cached data" },
  loading: { hi: "लोड हो रहा है...", en: "Loading..." },
} as const;

export type TKey = keyof typeof translations;
