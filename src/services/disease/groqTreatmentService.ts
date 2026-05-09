import { groqText } from "@/lib/groqApi";
import { formatDiseaseName } from "@/constants/plantvillageLabels";

export interface Treatment {
  organicTreatment: { steps: string[]; estimatedCost: string; timeToEffect: string };
  chemicalTreatment: {
    pesticideName: string;
    dosage: string;
    frequency: string;
    brandNames: string[];
  };
  preventiveMeasures: string[];
  urgency: "immediate" | "within_week" | "monitor";
}

const FALLBACK = (disease: string): Treatment => ({
  organicTreatment: {
    steps: [
      `${disease} के लिए नीम तेल का छिड़काव करें (5ml/L पानी)`,
      "संक्रमित पत्तियों को निकाल दें",
      "हफ्ते में 2 बार दोहराएं",
    ],
    estimatedCost: "₹200-500 per acre",
    timeToEffect: "5-7 दिन",
  },
  chemicalTreatment: {
    pesticideName: "Mancozeb 75% WP",
    dosage: "2g per liter water",
    frequency: "हर 10 दिन में",
    brandNames: ["Indofil M-45", "Dithane M-45", "Krilaxyl Gold"],
  },
  preventiveMeasures: [
    "खेत में जल निकास ठीक रखें",
    "स्वस्थ बीज का प्रयोग करें",
    "फसल चक्र अपनाएं",
  ],
  urgency: "within_week",
});

export async function getTreatment(label: string, severity: string): Promise<Treatment> {
  const disease = formatDiseaseName(label);
  try {
    const sys =
      "You are an agronomist for Indian farmers. Always reply with valid JSON only. Use Hindi for steps and measures, English for chemical brand names.";
    const user = `Suggest treatment for "${disease}" (severity: ${severity}). Reply JSON:
{
  "organicTreatment": { "steps": ["..", "..", ".."], "estimatedCost": "₹..", "timeToEffect": ".." },
  "chemicalTreatment": { "pesticideName": "..", "dosage": "..", "frequency": "..", "brandNames": ["..","..",".."] },
  "preventiveMeasures": ["..","..",".."],
  "urgency": "immediate" | "within_week" | "monitor"
}`;
    const out = await groqText(sys, user);
    if (!out?.organicTreatment) return FALLBACK(disease);
    return out as Treatment;
  } catch {
    return FALLBACK(disease);
  }
}
