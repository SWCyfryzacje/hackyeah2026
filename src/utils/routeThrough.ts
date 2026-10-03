import { LatLng } from 'react-native-maps';

export type RouteProfile = 'driving' | 'foot';

// The public OSRM demo server only has the car profile; FOSSGIS hosts foot.
const BASE: Record<RouteProfile, string> = {
  driving: 'https://router.project-osrm.org',
  foot: 'https://routing.openstreetmap.de/routed-foot',
};

export type Route = {
  coords: LatLng[];
  distance: number; // meters
  duration: number; // seconds
};

type OsrmResponse = {
  code: string; // 'Ok' | 'NoRoute' | 'NoSegment' | ...
  message?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
  }[];
};

export async function routeThrough(
  points: LatLng[],
  signal?: AbortSignal,
  profile: RouteProfile = 'driving'
): Promise<Route> {
  if (points.length < 2) {
    throw new Error('At least 2 points are required to calculate a route.');
  }

  const coords = points.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const res = await fetch(
    `${BASE[profile]}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
    { signal }
  );

  if (!res.ok) {
    throw new Error(`OSRM request failed with HTTP status ${res.status}`);
  }

  const json: OsrmResponse = await res.json();
  if (json.code !== 'Ok' || !json.routes?.length)
    throw new Error(json.message || json.code || 'Route calculation failed');

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
