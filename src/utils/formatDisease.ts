// Clean PlantVillage labels like "Tomato___Late_blight" → "Late Blight"
export function formatDiseaseName(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^[A-Za-z_()]+___/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
