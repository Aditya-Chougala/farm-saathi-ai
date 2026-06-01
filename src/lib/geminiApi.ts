// Gemini Vision via server function (key stays on the server).
import { geminiVisionFn } from "./ai.functions";

export function stripBase64Prefix(b64: string): string {
  return b64.includes(",") ? b64.split(",")[1] : b64;
}

export async function geminiVision(base64: string, prompt: string): Promise<string> {
  const res = await geminiVisionFn({ data: { base64, prompt } });
  return res.text;
}
