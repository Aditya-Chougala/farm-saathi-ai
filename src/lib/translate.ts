// Dynamic translation via Gemini for AI-generated content (crop results, disease info, etc.)
// Static UI strings live in src/i18n/translations.ts — never use this for them.
import type { Lang } from "@/i18n/LanguageContext";

const KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
const CACHE_KEY = "translations_cache";

const LANG_NAME: Record<Lang, string> = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  kn: "Kannada",
  bn: "Bengali",
  te: "Telugu",
  mr: "Marathi",
};

type Cache = Record<string, string>;

function loadCache(): Cache {
  try {
    if (typeof localStorage === "undefined") return {};
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(c: Cache) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* ignore quota */
  }
}

function cacheKey(text: string, target: Lang) {
  return `${target}::${text}`;
}

/**
 * Translate AI/dynamic text to the target language.
 * - Returns input unchanged for English or empty input.
 * - Caches results in localStorage to avoid repeat API cost.
 * - On any failure, returns the original English text.
 */
export async function translateText(text: string, targetLang: Lang): Promise<string> {
  if (!text || targetLang === "en") return text;
  const cache = loadCache();
  const k = cacheKey(text, targetLang);
  if (cache[k]) return cache[k];
  if (!KEY) return text;

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${KEY}&t=${Date.now()}`;
    const prompt = `Translate the following text to ${LANG_NAME[targetLang]} using simple language an Indian farmer can understand.
Rules: do NOT translate numbers, currency symbols (₹), units (kg, acre, ml), brand names, scientific names, or English crop/chemical names. Reply ONLY with the translation, no quotes or explanation.

Text: ${text}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (!res.ok) return text;
    const data = await res.json();
    const out = (data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined)?.trim();
    if (!out) return text;
    cache[k] = out;
    saveCache(cache);
    return out;
  } catch {
    return text;
  }
}

/** Translate many strings in parallel with the same fallback rules. */
export async function translateMany(items: string[], targetLang: Lang): Promise<string[]> {
  return Promise.all(items.map((t) => translateText(t, targetLang)));
}
