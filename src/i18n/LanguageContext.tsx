import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type TKey } from "./translations";

export type Lang = "hi" | "en";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TKey) => string;
  /** Returns Hindi + English bilingual JSX-friendly object */
  bi: (key: TKey) => { hi: string; en: string };
}

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("farmsmart_lang") as Lang | null;
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("farmsmart_lang", l);
  };

  const t = (key: TKey) => translations[key]?.[lang] ?? String(key);
  const bi = (key: TKey) => translations[key] ?? { hi: String(key), en: String(key) };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle: () => setLang(lang === "hi" ? "en" : "hi"), t, bi }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

/** Renders Hindi label prominently with English smaller below */
export function Bi({ k, className = "" }: { k: TKey; className?: string }) {
  const { bi } = useLang();
  const v = bi(k);
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span className="text-bilingual-hi">{v.hi}</span>
      <span className="text-[10px] opacity-75 font-normal">{v.en}</span>
    </span>
  );
}
