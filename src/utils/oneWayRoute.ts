import { LatLng } from 'react-native-maps';

const BASE = 'https://router.project-osrm.org';
const DEFAULT_TIMEOUT_MS = 10_000;

export type Route = {
  coords: LatLng[];
  distance: number; // meters
  duration: number; // seconds
};

export class OsrmError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message || code || 'Route calculation failed');
    this.name = 'OsrmError';
    this.code = code;
  }
}

type OsrmResponse = {
  code: string; // 'Ok' | 'NoRoute' | 'NoSegment' | ...
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
  }[];
};

export async function routeBetween(
  points: LatLng[],
  signal?: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Route> {
  if (points.length < 2) {
    throw new Error('At least 2 points are required to calculate a route.');
  }

  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const url = `${BASE}/route/v1/walking/${coords}?overview=full&geometries=geojson&continue_straight=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Route request timed out'));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw signal.reason || new Error('Aborted');
    }
    signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`OSRM request failed with HTTP status ${res.status}`);
    }

    const json: OsrmResponse = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) {
      throw new OsrmError(
        json.code,
        json.message || `Route calculation failed with code: ${json.code}`
      );
    }

    const r = json.routes[0];
    return {
      coords: r.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      })),
      distance: r.distance,
      duration: r.duration,
    };
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export const routeThrough = routeBetween;
