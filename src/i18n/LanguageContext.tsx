import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type TKey } from "./translations";

export type Lang = "en" | "hi" | "ta" | "kn" | "bn" | "te" | "mr";

export const LANGS: Array<{ code: Lang; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "bn", label: "বাংলা" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
];

const STORAGE_KEY = "language";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TKey) => string;
  bi: (key: TKey) => { native: string; en: string };
}

const LanguageContext = createContext<Ctx | null>(null);

function readStored(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v && LANGS.some((l) => l.code === v)) return v as Lang;
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = readStored();
    if (saved) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: TKey) => {
    const entry = translations[key] as Record<string, string> | undefined;
    if (!entry) return String(key);
    return entry[lang] ?? entry.en ?? entry.hi ?? String(key);
  };

  const bi = (key: TKey) => {
    const entry = translations[key] as Record<string, string> | undefined;
    const en = entry?.en ?? String(key);
    const native = entry?.[lang] ?? en;
    return { native, en };
  };

  const toggle = () => setLang(lang === "en" ? "hi" : "en");

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t, bi }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

/** Renders selected language label with English smaller below (when different) */
export function Bi({ k, className = "" }: { k: TKey; className?: string }) {
  const { bi, lang } = useLang();
  const v = bi(k);
  const showEn = lang !== "en" && v.native !== v.en;
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span className="text-bilingual-hi">{v.native}</span>
      {showEn && <span className="text-[10px] opacity-75 font-normal">{v.en}</span>}
    </span>
  );
}
