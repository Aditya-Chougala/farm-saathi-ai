// Dynamic translation via Gemini (server-proxied) for AI-generated content.
// Static UI strings live in src/i18n/translations.ts — never use this for them.
import type { Lang } from "@/i18n/LanguageContext";
import { geminiTextFn } from "./ai.functions";

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

export async function translateText(text: string, targetLang: Lang): Promise<string> {
  if (!text || targetLang === "en") return text;
  const cache = loadCache();
  const k = cacheKey(text, targetLang);
  if (cache[k]) return cache[k];

  try {
    const prompt = `Translate the following text to ${LANG_NAME[targetLang]} using simple language an Indian farmer can understand.
Rules: do NOT translate numbers, currency symbols (₹), units (kg, acre, ml), brand names, scientific names, or English crop/chemical names. Reply ONLY with the translation, no quotes or explanation.

Text: ${text}`;
    const { text: out } = await geminiTextFn({ data: { prompt } });
    const trimmed = (out || "").trim();
    if (!trimmed) return text;
    cache[k] = trimmed;
    saveCache(cache);
    return trimmed;
  } catch {
    return text;
  }
}

export async function translateMany(items: string[], targetLang: Lang): Promise<string[]> {
  return Promise.all(items.map((t) => translateText(t, targetLang)));
}
