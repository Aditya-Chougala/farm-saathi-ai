import { Sprout, Languages, WifiOff } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { useEffect, useState } from "react";

export function Header() {
  const { lang, toggle, t } = useLang();
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
        <button
          onClick={toggle}
          className="min-touch px-3 rounded-xl bg-secondary text-secondary-foreground flex items-center gap-2 font-semibold text-sm active:scale-95 transition"
          aria-label="Toggle language"
        >
          <Languages className="w-5 h-5" />
          {lang === "hi" ? "EN" : "हिं"}
        </button>
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
