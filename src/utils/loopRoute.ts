import type { LatLng } from 'react-native-maps';
import { routeBetween, OsrmError, type Route } from './oneWayRoute';

const toRad = (deg: number) => (deg * Math.PI) / 180;

// Point `meters` away from p in direction `bearing` (radians, 0 = north, clockwise)
function offset(p: LatLng, meters: number, bearing: number): LatLng {
  return {
    latitude: p.latitude + (meters * Math.cos(bearing)) / 111_320,
    longitude:
      p.longitude +
      (meters * Math.sin(bearing)) / (111_320 * Math.cos(toRad(p.latitude))),
  };
}

// Fraction of points that revisit a ~25 m grid cell after leaving it.
// Numeric keys, no string allocation. Rough heuristic for "out-and-back" loops.
function overlap(coords: LatLng[]): number {
  if (coords.length === 0) return 0;
  const seen = new Set<number>();
  let repeats = 0;
  let prev = NaN;

  for (const c of coords) {
    const key =
      Math.round((c.latitude + 90) * 4000) * 2_000_000 +
      Math.round((c.longitude + 180) * 4000);
    if (key !== prev && seen.has(key)) repeats++;
    seen.add(key);
    prev = key;
  }

  return repeats / coords.length;
}

// OSRM codes meaning "no road near a waypoint": worth retrying with a smaller circle
const isNoRoad = (e: unknown): boolean =>
  e instanceof OsrmError && (e.code === 'NoRoute' || e.code === 'NoSegment');

export type LoopOptions = {
  start: LatLng;
  targetMeters: number;
  bearing?: number; // radians; omit for random. Same bearing = similar loop
  points?: number; // points on the circle including start (4-8)
  tolerance?: number; // 0.1 = accept within 10%
  maxAttempts?: number; // each attempt = 1 request
  roadFactor?: number; // how much longer roads are than straight lines (tune per area)
  signal?: AbortSignal;
};

export type LoopResult = Route & { bearing: number };

export async function loopOfLength({
  start,
  targetMeters,
  bearing = Math.random() * 2 * Math.PI,
  points = 5,
  tolerance = 0.1,
  maxAttempts = 4,
  roadFactor = 1.3,
  signal,
}: LoopOptions): Promise<LoopResult> {
  if (targetMeters <= 0) throw new Error('Target length must be positive');

  const pointCount = Math.max(3, points);
  let radius = targetMeters / (2 * Math.PI * roadFactor);
  let best: { route: Route; score: number } | null = null;

  // Fixed per-waypoint jitter so rescaling doesn't change the loop's shape
  const jitter = Array.from(
    { length: pointCount - 1 },
    () => 0.85 + Math.random() * 0.3
  );
  const fromCenter = bearing + Math.PI; // direction from circle center back to start

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const center = offset(start, radius, bearing);
    const ring = jitter.map((j, i) =>
      offset(
        center,
        radius * j,
        fromCenter + ((i + 1) * 2 * Math.PI) / pointCount
      )
    );

    let route: Route;
    try {
      route = await routeBetween([start, ...ring, start], signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      if (isNoRoad(e)) {
        radius *= 0.8; // a waypoint had no road nearby, try a smaller circle
        continue;
      }
      throw e; // abort, offline, timeout, server error: don't burn more attempts
    }

    const error = Math.abs(route.distance - targetMeters) / targetMeters;
    const score = error + overlap(route.coords); // lower is better
    if (!best || score < best.score) best = { route, score };
    if (error < tolerance) break;

    // Rescale radius and retry, clamping to prevent runaway scaling on short/blocked roads
    const factor = targetMeters / Math.max(route.distance, 1);
    radius *= Math.min(Math.max(factor, 0.5), 2.0);
  }

  if (!best) throw new Error('Could not generate a loop here, try again');
  return { ...best.route, bearing };
}
