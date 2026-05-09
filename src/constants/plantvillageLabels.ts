export const PLANTVILLAGE_LABELS = [
  "Apple___Apple_scab",
  "Apple___Black_rot",
  "Apple___Cedar_apple_rust",
  "Apple___healthy",
  "Corn_(maize)___Cercospora_leaf_spot",
  "Corn_(maize)___Common_rust",
  "Corn_(maize)___Northern_Leaf_Blight",
  "Corn_(maize)___healthy",
  "Grape___Black_rot",
  "Grape___Esca_(Black_Measles)",
  "Grape___Leaf_blight",
  "Grape___healthy",
  "Potato___Early_blight",
  "Potato___Late_blight",
  "Potato___healthy",
  "Rice___Leaf_scald",
  "Rice___Narrow_brown_leaf_spot",
  "Rice___Rice_blast",
  "Rice___healthy",
  "Tomato___Bacterial_spot",
  "Tomato___Early_blight",
  "Tomato___Late_blight",
  "Tomato___Leaf_Mold",
  "Tomato___Septoria_leaf_spot",
  "Tomato___Spider_mites",
  "Tomato___Target_Spot",
  "Tomato___Yellow_Leaf_Curl_Virus",
  "Tomato___mosaic_virus",
  "Tomato___healthy",
  "Pepper___Bacterial_spot",
  "Pepper___healthy",
  "Strawberry___Leaf_scorch",
  "Strawberry___healthy",
  "Peach___Bacterial_spot",
  "Peach___healthy",
  "Wheat___Brown_rust",
  "Wheat___Yellow_rust",
  "Wheat___healthy",
] as const;

export type PlantVillageLabel = (typeof PLANTVILLAGE_LABELS)[number];

export function formatDiseaseName(raw: string): string {
  return raw
    .replace(/^[A-Za-z_()]+___/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function getCropFromLabel(raw: string): string {
  const m = raw.match(/^([A-Za-z_()]+)___/);
  return m ? m[1].replace(/_/g, " ") : "Crop";
}
