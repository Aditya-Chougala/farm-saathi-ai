// Open-Meteo weather (no API key)
import { cacheGet, cacheSet } from "./db";

const GPS_CACHE_KEY = "farmsmart_gps";

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
  const cached = cacheGet<{ lat: number; lon: number; timestamp: number }>(GPS_CACHE_KEY);
  if (cached) {
    console.log("GPS coords (cached):", cached.lat, cached.lon);
    return { lat: cached.lat, lon: cached.lon };
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    console.log("GPS coords (fallback, no geolocation):", FALLBACK_COORDS.lat, FALLBACK_COORDS.lon);
    return FALLBACK_COORDS;
  }
  return new Promise((resolve) => {
    const done = (lat: number, lon: number, src: string) => {
      console.log(`GPS coords (${src}):`, lat, lon);
      if (src === "gps") {
        cacheSet(GPS_CACHE_KEY, { lat, lon, timestamp: Date.now() }, 60 * 60 * 1000);
      }
      resolve({ lat, lon });
    };
    const t = setTimeout(() => done(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon, "fallback-timeout"), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        done(p.coords.latitude, p.coords.longitude, "gps");
      },
      (err) => {
        clearTimeout(t);
        console.warn("GPS denied/error:", err?.message);
        done(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon, "fallback-denied");
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&timezone=Asia/Kolkata&t=${Date.now()}`;
    console.log("Weather API request:", url);
    const r = await fetch(url);
    const j = await r.json();
    console.log("Weather API response:", j);
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
  } catch (e) {
    console.error("Weather fetch failed:", e);
    return { temperature: 28, humidity: 60, rain: 0, windSpeed: 5, lat, lon, fetchedAt: Date.now() };
  }
}
