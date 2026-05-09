// Tiny localStorage helpers + cache TTL
export function saveData<T>(key: string, data: T) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / safari private mode */
  }
}

export function getData<T = unknown>(key: string): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return JSON.parse(localStorage.getItem(key) || "null") as T | null;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T, ttlMs = 60 * 60 * 1000) {
  saveData(key, { data, expires: Date.now() + ttlMs });
}

export function cacheGet<T = unknown>(key: string): T | null {
  const v = getData<{ data: T; expires: number }>(key);
  if (!v) return null;
  if (Date.now() > v.expires) return null;
  return v.data;
}
