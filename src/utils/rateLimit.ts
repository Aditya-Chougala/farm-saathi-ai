// Daily per-device rate limits to protect API keys.
const LIMITS: Record<string, number> = {
  disease: 5,
  crop: 3,
  fertilizer: 5,
  mandi: 10,
  calendar: 3,
};

function keyFor(feature: string): string {
  return `farmsmart_limit_${feature}_${new Date().toDateString()}`;
}

export function remainingToday(feature: string): number {
  if (typeof localStorage === "undefined") return LIMITS[feature] ?? 5;
  const used = parseInt(localStorage.getItem(keyFor(feature)) || "0", 10);
  return Math.max(0, (LIMITS[feature] ?? 5) - used);
}

export function checkRateLimit(feature: string): boolean {
  if (typeof localStorage === "undefined") return true;
  const k = keyFor(feature);
  const used = parseInt(localStorage.getItem(k) || "0", 10);
  const max = LIMITS[feature] ?? 5;
  if (used >= max) {
    if (typeof alert !== "undefined") {
      alert(
        "आज की सीमा पूरी हुई। कल दोबारा कोशिश करें।\nDaily limit reached. Please try again tomorrow.",
      );
    }
    return false;
  }
  localStorage.setItem(k, String(used + 1));
  return true;
}
