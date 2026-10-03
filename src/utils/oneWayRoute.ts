import { LatLng } from 'react-native-maps';

const BASE = 'https://router.project-osrm.org';

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
  signal?: AbortSignal
): Promise<Route> {
  if (points.length < 2) {
    throw new Error('At least 2 points are required to calculate a route.');
  }

  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const res = await fetch(
    `${BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    { signal }
  );

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
}

export const routeThrough = routeBetween;
