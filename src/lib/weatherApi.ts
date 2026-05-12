// Open-Meteo weather (no API key)
import { cacheGet, cacheSet } from "./db";

export interface Weather {
  temperature: number;
  humidity: number;
  rain: number;
  windSpeed: number;
  lat: number;
  lon: number;
  fetchedAt: number;
}

export const FALLBACK_COORDS = { lat: 20.5937, lon: 78.9629 };

export async function getCoords(): Promise<{ lat: number; lon: number }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return FALLBACK_COORDS;
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(FALLBACK_COORDS), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude });
      },
      () => {
        clearTimeout(t);
        resolve(FALLBACK_COORDS);
      },
      { timeout: 4000, enableHighAccuracy: false },
    );
  });
}

export async function fetchWeather(force = false): Promise<Weather> {
  if (!force) {
    const cached = cacheGet<Weather>("farmsmart_weather");
    if (cached) return cached;
  }
  const { lat, lon } = await getCoords();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weathercode&timezone=Asia/Kolkata&t=${Date.now()}`;
    const r = await fetch(url);
    const j = await r.json();
    const c = j.current ?? {};
    const w: Weather = {
      temperature: c.temperature_2m ?? 28,
      humidity: c.relative_humidity_2m ?? 60,
      rain: c.rain ?? 0,
      windSpeed: c.wind_speed_10m ?? 5,
      lat,
      lon,
      fetchedAt: Date.now(),
    };
    cacheSet("farmsmart_weather", w, 30 * 60 * 1000);
    return w;
  } catch {
    return { temperature: 28, humidity: 60, rain: 0, windSpeed: 5, lat, lon, fetchedAt: Date.now() };
  }
}
