import type { SupabaseClient } from '@supabase/supabase-js';
import type { LatLng } from 'react-native-maps';
import type { Route } from '@/utils/oneWayRoute';
import {
  RECREATION_CATEGORIES,
  type RecreationCategory,
} from '@/constants/recreation';

// Max points sent to recreation_areas_along_route; OSRM overview=full can return thousands.
const MAX_ROUTE_POINTS = 300;

export type RecreationArea = {
  id: number;
  name: string | null;
  category: RecreationCategory;
  tags: Record<string, string>;
  areaM2: number | null;
  latitude: number;
  longitude: number;
  distanceM: number; // from the map centre (near) or from the route (along route)
  // Outer ring + holes of each polygon, when requested and the area isn't a point
  polygons?: { outer: LatLng[]; holes: LatLng[][] }[];
  // Along route only: point of the area closest to the route, used as the stop
  stop?: LatLng;
  routeFraction?: number; // 0..1 position along the route
};

type RecreationRow = {
  id: number;
  name: string | null;
  category: RecreationCategory;
  tags: Record<string, string> | null;
  area_m2: number | null;
  latitude: number;
  longitude: number;
  distance_m: number;
  shape_geojson?: string | null;
  stop_latitude?: number;
  stop_longitude?: number;
  route_fraction?: number;
};

type Ring = [number, number][];

const toLatLngs = (ring: Ring): LatLng[] =>
  ring.map(([longitude, latitude]) => ({ latitude, longitude }));

/** GeoJSON Polygon / MultiPolygon text -> polygons for react-native-maps. */
function parsePolygons(geojson: string): RecreationArea['polygons'] {
  const g = JSON.parse(geojson) as
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] };
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.map(([outer, ...holes]) => ({
    outer: toLatLngs(outer),
    holes: holes.map(toLatLngs),
  }));
}

const toRecreationArea = (r: RecreationRow): RecreationArea => ({
  id: r.id,
  name: r.name,
  category: r.category,
  tags: r.tags ?? {},
  areaM2: r.area_m2,
  latitude: r.latitude,
  longitude: r.longitude,
  distanceM: r.distance_m,
  polygons: r.shape_geojson ? parsePolygons(r.shape_geojson) : undefined,
  stop:
    r.stop_latitude != null && r.stop_longitude != null
      ? { latitude: r.stop_latitude, longitude: r.stop_longitude }
      : undefined,
  routeFraction: r.route_fraction,
});

/** Name to show; unnamed areas (most playgrounds) get their category label. */
export const recreationTitle = (a: RecreationArea) =>
  a.name ?? RECREATION_CATEGORIES[a.category].label;

/** Short details line for callouts, e.g. "Park · 12 ha · lit". */
export function recreationDetails(a: RecreationArea): string {
  const parts: string[] = [];
  if (a.name) parts.push(RECREATION_CATEGORIES[a.category].label);
  if (a.areaM2 && a.areaM2 >= 10_000)
    parts.push(
      `${(a.areaM2 / 10_000).toFixed(a.areaM2 >= 100_000 ? 0 : 1)} ha`
    );
  if (a.tags.lit === 'yes') parts.push('lit');
  if (a.tags.opening_hours) parts.push(a.tags.opening_hours);
  return parts.join(' · ');
}

export async function fetchRecreationNear(
  supabase: SupabaseClient,
  center: LatLng,
  radiusM: number,
  options: {
    categories?: RecreationCategory[] | null;
    withShapes?: boolean;
    maxCount?: number;
  } = {},
  signal?: AbortSignal
): Promise<RecreationArea[]> {
  let query = supabase.rpc('recreation_areas_near', {
    lat: center.latitude,
    lon: center.longitude,
    radius_m: Math.round(radiusM),
    max_count: options.maxCount ?? 150,
    categories: options.categories ?? null,
    with_shapes: options.withShapes ?? false,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as RecreationRow[]).map(toRecreationArea);
}

export async function fetchRecreationAlongRoute(
  supabase: SupabaseClient,
  route: Route,
  bufferM = 200,
  signal?: AbortSignal
): Promise<RecreationArea[]> {
  const step = Math.ceil(route.coords.length / MAX_ROUTE_POINTS);
  const coords = route.coords.filter(
    (_, i) => i % step === 0 || i === route.coords.length - 1
  );

  let query = supabase.rpc('recreation_areas_along_route', {
    route_geojson: JSON.stringify({
      type: 'LineString',
      coordinates: coords.map((c) => [c.longitude, c.latitude]),
    }),
    buffer_m: bufferM,
    // Named and bigger areas first, so unnamed playgrounds don't crowd out parks
    max_count: 20,
  });
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as RecreationRow[]).map(toRecreationArea);
}
