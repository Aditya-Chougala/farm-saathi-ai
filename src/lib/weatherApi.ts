// Open-Meteo weather + Nominatim geocoding + WAQI air quality
import { cacheGet, cacheSet } from "./db";

const GPS_CACHE_KEY = "farmsmart_gps";
const LOC_CACHE_KEY = "farmsmart_location";
const WEATHER_CACHE_KEY = "farmsmart_weather";
const AQI_CACHE_KEY = "farmsmart_aqi";

export const FALLBACK_COORDS = { lat: 15.3647, lon: 75.1240 }; // Hubballi, Karnataka

async function ipLocation(): Promise<{ lat: number; lon: number } | null> {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const j = await r.json();
    if (typeof j.latitude === "number" && typeof j.longitude === "number") {
      console.log("IP location:", j.city, j.region, j.latitude, j.longitude);
      return { lat: j.latitude, lon: j.longitude };
    }
  } catch (e) {
    console.warn("IP location failed:", e);
  }
  return null;
}

export interface DailyForecast {
  date: string;
  tMax: number;
  tMin: number;
  precipProb: number;
  code: number;
}

export interface Weather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  rain: number;
  windSpeed: number;
  weatherCode: number;
  lat: number;
  lon: number;
  fetchedAt: number;
  daily: DailyForecast[];
}

export interface LocationInfo {
  city: string;
  state: string;
  district: string;
  country: string;
  lat: number;
  lon: number;
}

export interface AQIInfo {
  aqi: number;
  level: "Good" | "Moderate" | "Poor" | "Severe";
  advice: string;
  station?: string;
  fetchedAt: number;
}

export interface HomeData {
  location: LocationInfo | null;
  weather: Weather | null;
  aqi: AQIInfo | null;
  fetchedAt: number;
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return "Sunny";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
}

export function weatherEmoji(code: number): string {
  const d = describeWeatherCode(code);
  return d === "Sunny" ? "☀️" : d === "Rain" ? "🌧️" : d === "Thunderstorm" ? "⛈️" : d === "Snow" ? "❄️" : d === "Foggy" ? "🌫️" : d === "Drizzle" ? "🌦️" : "☁️";
}

function aqiLevel(aqi: number): AQIInfo["level"] {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 200) return "Poor";
  return "Severe";
}

function aqiAdvice(level: AQIInfo["level"]): string {
  switch (level) {
    case "Good": return "Excellent air — safe for spraying & field work.";
    case "Moderate": return "Acceptable — sensitive workers wear a mask during long field hours.";
    case "Poor": return "Limit prolonged outdoor work; postpone pesticide spraying if possible.";
    case "Severe": return "Avoid open-field work; reschedule spraying & harvesting until air clears.";
  }
}

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
      if (src === "gps") cacheSet(GPS_CACHE_KEY, { lat, lon, timestamp: Date.now() }, 60 * 60 * 1000);
      resolve({ lat, lon });
    };
    const t = setTimeout(() => done(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon, "fallback-timeout"), 4000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); done(p.coords.latitude, p.coords.longitude, "gps"); },
      (err) => { clearTimeout(t); console.warn("GPS denied/error:", err?.message); done(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon, "fallback-denied"); },
      { timeout: 4000, enableHighAccuracy: false },
    );
  });
}

export async function fetchLocation(lat: number, lon: number, force = false): Promise<LocationInfo | null> {
  if (!force) {
    const c = cacheGet<LocationInfo>(LOC_CACHE_KEY);
    if (c) return c;
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`;
    const r = await fetch(url, { headers: { "accept-language": "en" } });
    const j = await r.json();
    console.log("Location API response:", j);
    const a = j.address ?? {};
    const info: LocationInfo = {
      city: a.city || a.town || a.village || a.county || a.suburb || j.name || "Unknown",
      district: a.state_district || a.county || "",
      state: a.state || "",
      country: a.country || "India",
      lat, lon,
    };
    cacheSet(LOC_CACHE_KEY, info, 60 * 60 * 1000);
    return info;
  } catch (e) {
    console.error("Location fetch failed:", e);
    return null;
  }
}

export async function fetchWeather(force = false): Promise<Weather> {
  if (!force) {
    const cached = cacheGet<Weather>(WEATHER_CACHE_KEY);
    if (cached) return cached;
  }
  const { lat, lon } = await getCoords();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,weathercode,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Asia/Kolkata&forecast_days=7&t=${Date.now()}`;
    console.log("Weather API request:", url);
    const r = await fetch(url);
    const j = await r.json();
    console.log("Weather API response:", j);
    const c = j.current ?? {};
    const d = j.daily ?? {};
    const daily: DailyForecast[] = (d.time ?? []).map((date: string, i: number) => ({
      date,
      tMax: d.temperature_2m_max?.[i] ?? 0,
      tMin: d.temperature_2m_min?.[i] ?? 0,
      precipProb: d.precipitation_probability_max?.[i] ?? 0,
      code: d.weathercode?.[i] ?? 0,
    }));
    const w: Weather = {
      temperature: c.temperature_2m ?? 28,
      feelsLike: c.apparent_temperature ?? c.temperature_2m ?? 28,
      humidity: c.relative_humidity_2m ?? 60,
      rain: c.rain ?? 0,
      windSpeed: c.wind_speed_10m ?? 5,
      weatherCode: c.weathercode ?? 1,
      lat, lon,
      fetchedAt: Date.now(),
      daily,
    };
    cacheSet(WEATHER_CACHE_KEY, w, 30 * 60 * 1000);
    return w;
  } catch (e) {
    console.error("Weather fetch failed:", e);
    return {
      temperature: 28, feelsLike: 30, humidity: 60, rain: 0, windSpeed: 5,
      weatherCode: 1, lat, lon, fetchedAt: Date.now(), daily: [],
    };
  }
}

export async function fetchAQI(lat: number, lon: number, force = false): Promise<AQIInfo | null> {
  if (!force) {
    const c = cacheGet<AQIInfo>(AQI_CACHE_KEY);
    if (c) return c;
  }
  try {
    const token = (import.meta.env.VITE_WAQI_TOKEN as string) || "demo";
    const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`;
    const r = await fetch(url);
    const j = await r.json();
    console.log("AQI API response:", j);
    if (j.status !== "ok" || typeof j.data?.aqi !== "number") return null;
    const aqi = j.data.aqi as number;
    const level = aqiLevel(aqi);
    const info: AQIInfo = {
      aqi,
      level,
      advice: aqiAdvice(level),
      station: j.data?.city?.name,
      fetchedAt: Date.now(),
    };
    cacheSet(AQI_CACHE_KEY, info, 60 * 60 * 1000);
    return info;
  } catch (e) {
    console.error("AQI fetch failed:", e);
    return null;
  }
}

export async function fetchHomeData(force = false): Promise<HomeData> {
  const { lat, lon } = await getCoords();
  const [location, weather, aqi] = await Promise.all([
    fetchLocation(lat, lon, force).catch(() => null),
    fetchWeather(force).catch(() => null as unknown as Weather),
    fetchAQI(lat, lon, force).catch(() => null),
  ]);
  return { location, weather, aqi, fetchedAt: Date.now() };
}
