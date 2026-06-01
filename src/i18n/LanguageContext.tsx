import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type TKey } from "./translations";

export type Lang = "en" | "hi" | "ta" | "kn" | "bn" | "te" | "mr" | "pa";

export const LANGS: Array<{ code: Lang; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "bn", label: "বাংলা" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

const STORAGE_KEY = "language";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

function readStored(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v && LANGS.some((l) => l.code === v)) return v as Lang;
  return "en";
}

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English on first render to match SSR; hydrate stored lang in effect.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = readStored();
    if (saved !== lang) setLangState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = (l: Lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
      // Hard reload — guarantees a single-language render and fresh translation cache.
      window.location.reload();
      return;
    }
    setLangState(l);
  };

  const t = (key: TKey, vars?: Record<string, string | number>) => {
    const entry = translations[key] as Record<string, string> | undefined;
    if (!entry) return String(key);
    const raw = entry[lang] ?? entry.en ?? String(key);
    return interpolate(raw, vars);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

/** Renders a single translated label — never mixes languages. */
export function Bi({ k, className = "" }: { k: TKey; className?: string }) {
  const { t } = useLang();
  return <span className={className}>{t(k)}</span>;
}
