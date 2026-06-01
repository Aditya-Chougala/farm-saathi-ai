// Per-device daily limits stored in localStorage.
const LIMITS: Record<string, number> = {
  disease: 5,
  crop: 3,
  fertilizer: 5,
  mandi: 10,
  calendar: 3,
};

function key(feature: string): string {
  return `limit_${feature}_${new Date().toDateString()}`;
}

export function checkRateLimit(feature: keyof typeof LIMITS | string): boolean {
  if (typeof window === "undefined") return true;
  const max = LIMITS[feature] ?? 10;
  const count = parseInt(localStorage.getItem(key(feature)) ?? "0", 10) || 0;
  if (count >= max) {
    alert(`आज की सीमा पूरी हुई (${max}). कल दोबारा कोशिश करें।\nDaily limit reached (${max}). Try again tomorrow.`);
    return false;
  }
  localStorage.setItem(key(feature), String(count + 1));
  return true;
}

export function remainingToday(feature: string): number {
  if (typeof window === "undefined") return LIMITS[feature] ?? 0;
  const max = LIMITS[feature] ?? 10;
  const count = parseInt(localStorage.getItem(key(feature)) ?? "0", 10) || 0;
  return Math.max(0, max - count);
}
