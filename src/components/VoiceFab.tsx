import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const LANG_MAP: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN",
  bn: "bn-IN", te: "te-IN", mr: "mr-IN",
};

export function VoiceFab() {
  const { lang } = useLang();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const r = new SR();
      r.lang = LANG_MAP[lang] ?? "en-IN";
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          window.dispatchEvent(new CustomEvent("farmsmart:voice", { detail: { transcript, lang } }));
          try {
            const u = new SpeechSynthesisUtterance(transcript);
            u.lang = LANG_MAP[lang] ?? "en-IN";
            window.speechSynthesis.speak(u);
          } catch {}
        }
      };
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      recRef.current = r;
      r.start();
      setListening(true);
    } catch (e) {
      console.warn("voice start failed", e);
      setListening(false);
    }
  };

  const stop = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      aria-label="Voice input"
      onClick={listening ? stop : start}
      className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition ${
        listening ? "bg-destructive text-primary-foreground animate-pulse" : "gradient-primary text-primary-foreground"
      }`}
    >
      {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
    </button>
  );
}
