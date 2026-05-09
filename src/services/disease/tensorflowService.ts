// On-device TensorFlow.js MobileNet → mapped to PlantVillage labels heuristically
import { PLANTVILLAGE_LABELS } from "@/constants/plantvillageLabels";

let modelPromise: Promise<any> | null = null;

async function loadModel() {
  if (typeof window === "undefined") throw new Error("server");
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const mn = await import("@tensorflow-models/mobilenet");
      return mn.load({ version: 2, alpha: 1.0 });
    })();
  }
  return modelPromise;
}

function mapMobileNetToPlantVillage(className: string): string {
  const lc = className.toLowerCase();
  // Map common plant-related ImageNet classes to PlantVillage labels
  const direct: Array<[string, string]> = [
    ["tomato", "Tomato___Early_blight"],
    ["potato", "Potato___Early_blight"],
    ["corn", "Corn_(maize)___Common_rust"],
    ["maize", "Corn_(maize)___Common_rust"],
    ["rice", "Rice___Rice_blast"],
    ["wheat", "Wheat___Brown_rust"],
    ["apple", "Apple___Apple_scab"],
    ["grape", "Grape___Black_rot"],
    ["pepper", "Pepper___Bacterial_spot"],
    ["strawberry", "Strawberry___Leaf_scorch"],
    ["peach", "Peach___Bacterial_spot"],
  ];
  for (const [needle, label] of direct) if (lc.includes(needle)) return label;
  // Default: pick a generic Tomato early blight (most common Indian crop)
  return "Tomato___Early_blight";
}

export interface TFResult {
  label: string;
  confidence: number; // 0..1
  raw: string;
}

export async function tfDetect(imgEl: HTMLImageElement | HTMLCanvasElement): Promise<TFResult> {
  const model = await loadModel();
  // Resize to 224 via canvas for stability
  const canvas = document.createElement("canvas");
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imgEl, 0, 0, 224, 224);
  const preds: Array<{ className: string; probability: number }> = await model.classify(canvas, 3);
  if (!preds || preds.length === 0) {
    return { label: PLANTVILLAGE_LABELS[20], confidence: 0.2, raw: "unknown" };
  }
  const top = preds[0];
  return {
    label: mapMobileNetToPlantVillage(top.className),
    confidence: top.probability,
    raw: top.className,
  };
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
