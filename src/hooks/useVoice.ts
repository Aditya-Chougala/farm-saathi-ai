import { useEffect } from "react";

export function useVoiceInput(handler: (transcript: string, lang: string) => void) {
  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.transcript) handler(detail.transcript, detail.lang ?? "en");
    };
    window.addEventListener("farmsmart:voice", listener);
    return () => window.removeEventListener("farmsmart:voice", listener);
  }, [handler]);
}

export function speak(text: string, lang: string) {
  try {
    const LANG_MAP: Record<string, string> = {
      en: "en-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN",
      bn: "bn-IN", te: "te-IN", mr: "mr-IN", pa: "pa-IN",
    };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_MAP[lang] ?? "en-IN";
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
