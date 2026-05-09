import { useEffect, useState } from "react";

const STAGES = [
  "🌤️ मौसम जांच रहे हैं...",
  "📊 मंडी भाव देख रहे हैं...",
  "🌱 मिट्टी विश्लेषण...",
  "🧮 बजट और जमीन जांच...",
  "💡 सबसे अच्छी फसल ढूंढ रहे हैं...",
];

export function LoadingAnimation() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % STAGES.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-5xl animate-pulse shadow-[var(--shadow-glow)]">
        🌾
      </div>
      <p className="mt-6 text-lg font-bold text-primary">{STAGES[i]}</p>
      <div className="flex gap-1 mt-4">
        {STAGES.map((_, n) => (
          <div key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-8 bg-primary" : "w-2 bg-border"}`} />
        ))}
      </div>
    </div>
  );
}
