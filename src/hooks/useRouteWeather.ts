import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import type { RouteWeather } from '@/types/weather';
import { getRouteWeather } from '@/utils/weather-advice';

const CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_DURATION_MIN = 60;
const DURATION_STEP_MIN = 15;
// The planner's durations come from OSRM's driving profile; walking time is derived from distance
const WALKING_SPEED_MS = 4.5 / 3.6;
const HOUR_MS = 60 * 60 * 1000;

const cache = new Map<string, { at: number; data: RouteWeather }>();

export type UseRouteWeatherOptions = {
  /** Start of the walk; null while unknown */
  location: LatLng | null;
  /** Planned start; defaults to now */
  startAt?: Date | null;
  /** Route duration in seconds (planner / group route) */
  durationS?: number | null;
  /** Route length in meters, for the walking time */
  distanceM?: number | null;
};

type Result = {
  key: string;
  weather: RouteWeather | null;
  error: string | null;
};

/** Forecast and clothing advice for the hours a planned walk covers. */
export default function useRouteWeather({
  location,
  startAt,
  durationS,
  distanceM,
}: UseRouteWeatherOptions) {
  const [result, setResult] = useState<Result | null>(null);
  const [reloads, setReloads] = useState(0);

  // Primitive deps: ~1 km grid, start time, 15-minute duration steps
  const lat = location ? Number(location.latitude.toFixed(2)) : null;
  const lng = location ? Number(location.longitude.toFixed(2)) : null;
  const startMs = startAt?.getTime() ?? null;
  const walkS = Math.max(durationS ?? 0, (distanceM ?? 0) / WALKING_SPEED_MS);
  const durationMin =
    Math.ceil((walkS ? walkS / 60 : DEFAULT_DURATION_MIN) / DURATION_STEP_MIN) *
    DURATION_STEP_MIN;
  const key =
    lat == null || lng == null
      ? null
      : `${lat},${lng}|${startMs == null ? 'now' : Math.floor(startMs / HOUR_MS)}|${durationMin}`;

  useEffect(() => {
    if (key == null || lat == null || lng == null) return;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return;

    const ctrl = new AbortController();
    getRouteWeather(
      { latitude: lat, longitude: lng },
      new Date(startMs ?? Date.now()),
      durationMin,
      ctrl.signal
    )
      .then((weather) => {
        cache.set(key, { at: Date.now(), data: weather });
        setResult({ key, weather, error: null });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Weather error:', e instanceof Error ? e.message : e);
        setResult({
          key,
          weather: null,
          error: 'Nie udało się pobrać prognozy.',
        });
      });

    return () => ctrl.abort();
  }, [key, lat, lng, startMs, durationMin, reloads]);

  const refresh = useCallback(() => {
    cache.clear();
    setResult(null);
    setReloads((n) => n + 1);
  }, []);

  // Cached data shows right away (also while a stale entry is being refetched)
  const cached = key == null ? undefined : cache.get(key);
  const current = result?.key === key ? result : null;

  return {
    weather: current?.weather ?? cached?.data ?? null,
    loading: key != null && !current && !cached,
    error: current?.error ?? null,
    refresh,
  };
}
