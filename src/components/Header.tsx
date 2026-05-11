import { Sprout, WifiOff } from "lucide-react";
import { useLang, LANGS, type Lang } from "@/i18n/LanguageContext";
import { useEffect, useState } from "react";

export function Header() {
  const { lang, setLang, t } = useLang();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b rounded-none px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
            <Sprout className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-primary">{t("appName")}</h1>
            <p className="text-[10px] text-muted-foreground">{t("tagline")}</p>
          </div>
        </div>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className="min-touch px-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-95 transition border-0 outline-none"
          aria-label="Select language"
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </header>
      {!online && (
        <div className="bg-warning/90 text-foreground text-sm px-4 py-2 flex items-center gap-2 font-semibold">
          <WifiOff className="w-4 h-4" />
          {t("offline")}
        </div>
      )}
    </>
  );
}
