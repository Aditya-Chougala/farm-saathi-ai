// Floating voice input button — uses Web Speech API.
// Dispatches a `farmsmart:voice` CustomEvent that pages can listen to.
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const LANG_CODE: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN",
  bn: "bn-IN", te: "te-IN", mr: "mr-IN", pa: "pa-IN",
};

type SR = any;

export function VoiceFab() {
  const { lang } = useLang();
  const [state, setState] = useState<"idle" | "listening" | "thinking">("idle");
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const rec: SR = new SR();
      rec.lang = LANG_CODE[lang] ?? "en-IN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event: any) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript ?? "").trim();
        setState("thinking");
        window.dispatchEvent(new CustomEvent("farmsmart:voice", { detail: { transcript, lang } }));
        // Echo back briefly via TTS so user knows it was heard.
        try {
          const u = new SpeechSynthesisUtterance(transcript);
          u.lang = LANG_CODE[lang] ?? "en-IN";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        } catch { /* ignore */ }
        setTimeout(() => setState("idle"), 1200);
      };
      rec.onerror = () => setState("idle");
      rec.onend = () => setState((s) => (s === "listening" ? "idle" : s));
      recRef.current = rec;
      setState("listening");
      rec.start();
    } catch (e) {
      console.warn("Voice start failed", e);
      setState("idle");
    }
  };

  const stop = () => {
    try { recRef.current?.stop?.(); } catch { /* ignore */ }
    setState("idle");
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={state === "listening" ? stop : start}
      aria-label="Voice input"
      className={`fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-primary-foreground active:scale-95 transition ${
        state === "listening" ? "bg-destructive animate-pulse" : "gradient-primary"
      }`}
    >
      {state === "thinking" ? <Loader2 className="w-6 h-6 animate-spin" /> :
        state === "listening" ? <MicOff className="w-6 h-6" /> :
        <Mic className="w-6 h-6" />}
    </button>
  );
}
