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

function assertTreatment(value: unknown): asserts value is Treatment {
  const t = value as Treatment;
  if (!t?.organicTreatment?.steps?.length || !t?.chemicalTreatment?.pesticideName || !t?.preventiveMeasures?.length) {
    throw new Error("groq_invalid_treatment_response");
  }
}

export async function getTreatment(label: string, severity: string): Promise<Treatment> {
  const disease = formatDiseaseName(label);
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
  assertTreatment(out);
  return out;
}
