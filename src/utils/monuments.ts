import type { SupabaseClient } from '@supabase/supabase-js';
import type { LatLng } from 'react-native-maps';
import type { Route } from '@/utils/oneWayRoute';

// Max points sent to monuments_along_route; OSRM overview=full can return thousands.
const MAX_ROUTE_POINTS = 300;

export type Monument = {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  imageUrl: string | null;
  score: number;
  latitude: number;
  longitude: number;
  distanceM: number; // from the user (near) or from the route (along route)
  routeFraction?: number; // 0..1 position along the route
};

type MonumentRow = {
  id: number;
  name: string;
  kind: string;
  description: string | null;
  image_url: string | null;
  score: number;
  latitude: number;
  longitude: number;
  distance_m: number;
  route_fraction?: number;
};

const toMonument = (r: MonumentRow): Monument => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  description: r.description,
  imageUrl: r.image_url,
  score: r.score,
  latitude: r.latitude,
  longitude: r.longitude,
  distanceM: r.distance_m,
  routeFraction: r.route_fraction,
});

export async function fetchMonumentsNear(
  supabase: SupabaseClient,
  center: LatLng,
  radiusM = 2000,
  signal?: AbortSignal
): Promise<Monument[]> {
  let query = supabase.rpc('monuments_near', {
    lat: center.latitude,
    lon: center.longitude,
    radius_m: Math.round(radiusM),
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as MonumentRow[]).map(toMonument);
}

export async function fetchMonumentsAlongRoute(
  supabase: SupabaseClient,
  route: Route,
  bufferM = 300,
  signal?: AbortSignal
): Promise<Monument[]> {
  const step = Math.ceil(route.coords.length / MAX_ROUTE_POINTS);
  const coords = route.coords.filter(
    (_, i) => i % step === 0 || i === route.coords.length - 1
  );

  let query = supabase.rpc('monuments_along_route', {
    route_geojson: JSON.stringify({
      type: 'LineString',
      coordinates: coords.map((c) => [c.longitude, c.latitude]),
    }),
    buffer_m: bufferM,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as MonumentRow[]).map(toMonument);
}

/** Radius (m) roughly covering a map region, from its latitudeDelta. */
export function regionRadiusM(latitudeDelta: number): number {
  return Math.min((latitudeDelta * 111_000) / 2, 20_000);
}
