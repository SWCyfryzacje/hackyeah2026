import type { LatLng } from 'react-native-maps';
import type { WeatherCondition, WeatherHour } from '@/types/weather';

// Hourly forecast from Open-Meteo (https://open-meteo.com): free, no API key,
// CC BY 4.0 — the app should credit "Weather data by Open-Meteo.com".

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_TIMEOUT_MS = 10_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Open-Meteo serves at most this many days ahead. */
export const MAX_FORECAST_DAYS = 16;

const HOURLY_VARS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'uv_index',
  'is_day',
] as const;

type HourlyVar = (typeof HOURLY_VARS)[number];

type OpenMeteoResponse = {
  error?: boolean;
  reason?: string;
  hourly?: { time: number[] } & Record<HourlyVar, (number | null)[]>;
};

/** Least to most severe; a window is labelled with its most severe hour. */
export const CONDITION_SEVERITY: readonly WeatherCondition[] = [
  'clear',
  'partly-cloudy',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'heavy-rain',
  'freezing-rain',
  'thunderstorm',
];

/** WMO weather interpretation code → condition. */
export function weatherCondition(code: number): WeatherCondition {
  if (code <= 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code === 56 || code === 57 || code === 66 || code === 67) {
    return 'freezing-rain';
  }
  if (code === 65 || code === 82) return 'heavy-rain';
  if ((code >= 61 && code <= 63) || code === 80 || code === 81) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'cloudy';
}

export const startOfHour = (d: Date) =>
  new Date(Math.floor(d.getTime() / HOUR_MS) * HOUR_MS);

/** Forecast hours overlapping [from, to). */
export async function fetchHourlyForecast(
  at: LatLng,
  from: Date,
  to: Date,
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<WeatherHour[]> {
  const days = Math.ceil((to.getTime() - Date.now()) / DAY_MS) + 1;
  if (days > MAX_FORECAST_DAYS) {
    throw new Error('Prognoza nie sięga jeszcze tak daleko.');
  }

  const params = new URLSearchParams({
    latitude: at.latitude.toFixed(3),
    longitude: at.longitude.toFixed(3),
    hourly: HOURLY_VARS.join(','),
    timeformat: 'unixtime',
    forecast_days: String(Math.max(1, days)),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Weather request timed out'));
  }, timeoutMs);
  const onExternalAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const res = await fetch(`${FORECAST_URL}?${params}`, {
      signal: controller.signal,
    });
    const json: OpenMeteoResponse = await res.json();
    if (!res.ok || json.error || !json.hourly) {
      throw new Error(
        json.reason || `Open-Meteo request failed with HTTP ${res.status}`
      );
    }

    const h = json.hourly;
    const fromMs = startOfHour(from).getTime();
    const toMs = to.getTime();
    const hours: WeatherHour[] = [];

    h.time.forEach((sec, i) => {
      const t = sec * 1000;
      if (t < fromMs || t >= toMs) return;
      hours.push({
        time: new Date(t).toISOString(),
        tempC: h.temperature_2m[i] ?? 0,
        feelsLikeC: h.apparent_temperature[i] ?? h.temperature_2m[i] ?? 0,
        precipProb: h.precipitation_probability[i] ?? 0,
        precipMm: h.precipitation[i] ?? 0,
        windKmh: h.wind_speed_10m[i] ?? 0,
        gustKmh: h.wind_gusts_10m[i] ?? 0,
        uvIndex: h.uv_index[i] ?? 0,
        isDay: h.is_day[i] === 1,
        condition: weatherCondition(h.weather_code[i] ?? 3),
      });
    });

    if (!hours.length) throw new Error('Brak prognozy dla godzin trasy.');
    return hours;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
