import type { LatLng } from 'react-native-maps';

/*
 * Obstacles near a route, from OpenStreetMap (Overpass API, called from the app:
 * public Overpass instances block Supabase's cloud network, not phones) plus
 * points the user reports on the map.
 *
 * OSRM already refuses to route over closed roads, so we look for things it
 * happily drives through: construction sites, road works on open roads,
 * impassable surfaces and mapped hazards.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const OVERPASS_TIMEOUT_MS = 15_000;
// Overpass mirrors rate-limit requests without a meaningful User-Agent
const USER_AGENT =
  'hackyeah2026-njord/1.0 (+https://github.com/SWCyfryzacje/hackyeah2026)';
const MAX_ELEMENTS = 400;

export type ObstacleKind =
  | 'construction-site'
  | 'road-construction'
  | 'roadworks'
  | 'bad-surface'
  | 'hazard'
  | 'reported';

export type ObstacleShape = 'area' | 'line' | 'point';

export type Obstacle = {
  id: string;
  kind: ObstacleKind;
  shape: ObstacleShape;
  /** Polygon ring (area), polyline (line) or a single point */
  points: LatLng[];
  center: LatLng;
  /** Bounding circle around `center`; for points, how far the obstacle reaches */
  radiusM: number;
  name?: string;
};

export const OBSTACLE_LABELS: Record<ObstacleKind, string> = {
  'construction-site': 'Plac budowy',
  'road-construction': 'Droga w budowie',
  roadworks: 'Roboty drogowe',
  'bad-surface': 'Nieprzejezdna nawierzchnia',
  hazard: 'Zagrożenie',
  reported: 'Zgłoszona przeszkoda',
};

/** How far a point obstacle blocks the way around it */
const POINT_RADIUS_M: Record<ObstacleKind, number> = {
  'construction-site': 30,
  'road-construction': 20,
  roadworks: 20,
  'bad-surface': 20,
  hazard: 25,
  reported: 40,
};

export type BBox = { south: number; west: number; north: number; east: number };

const DEG = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000;

export function distanceM(a: LatLng, b: LatLng): number {
  const cosLat = Math.cos(((a.latitude + b.latitude) / 2) * DEG);
  const dx = (b.longitude - a.longitude) * DEG * cosLat * EARTH_RADIUS_M;
  const dy = (b.latitude - a.latitude) * DEG * EARTH_RADIUS_M;
  return Math.hypot(dx, dy);
}

/** Bounding box of the points grown by `marginM` on every side. */
export function bboxAround(points: LatLng[], marginM: number): BBox {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const p of points) {
    south = Math.min(south, p.latitude);
    north = Math.max(north, p.latitude);
    west = Math.min(west, p.longitude);
    east = Math.max(east, p.longitude);
  }
  const dLat = marginM / (EARTH_RADIUS_M * DEG);
  const dLng = dLat / Math.max(0.01, Math.cos(((south + north) / 2) * DEG));
  return {
    south: south - dLat,
    west: west - dLng,
    north: north + dLat,
    east: east + dLng,
  };
}

export function bboxContains(outer: BBox, inner: BBox): boolean {
  return (
    inner.south >= outer.south &&
    inner.north <= outer.north &&
    inner.west >= outer.west &&
    inner.east <= outer.east
  );
}

export function reportedObstacle(point: LatLng): Obstacle {
  return {
    id: `reported/${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    kind: 'reported',
    shape: 'point',
    points: [point],
    center: point,
    radiusM: POINT_RADIUS_M.reported,
  };
}

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};

function kindOf(tags: Record<string, string>): ObstacleKind | null {
  if (tags.landuse === 'construction') return 'construction-site';
  if (tags.highway === 'construction') return 'road-construction';
  if (tags.highway && tags.construction) return 'roadworks';
  if (tags.highway && tags.smoothness) return 'bad-surface';
  if (tags.hazard) return 'hazard';
  return null;
}

function toObstacle(el: OverpassElement): Obstacle | null {
  const kind = kindOf(el.tags ?? {});
  if (!kind) return null;
  const name = el.tags?.name;
  const id = `${el.type}/${el.id}`;

  if (el.type === 'node' && el.lat != null && el.lon != null) {
    const p = { latitude: el.lat, longitude: el.lon };
    return {
      id,
      kind,
      shape: 'point',
      points: [p],
      center: p,
      radiusM: POINT_RADIUS_M[kind],
      name,
    };
  }

  const points = (el.geometry ?? [])
    .filter((g) => g && Number.isFinite(g.lat) && Number.isFinite(g.lon))
    .map((g) => ({ latitude: g.lat, longitude: g.lon }));
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const closed = points.length >= 4 && distanceM(first, last) < 1;
  // Landuse is an area; a closed highway is a roundabout or square, still a line
  const shape: ObstacleShape =
    kind === 'construction-site' && closed ? 'area' : 'line';

  const center = {
    latitude: points.reduce((s, p) => s + p.latitude, 0) / points.length,
    longitude: points.reduce((s, p) => s + p.longitude, 0) / points.length,
  };
  const radiusM = Math.max(...points.map((p) => distanceM(center, p)));

  return { id, kind, shape, points, center, radiusM, name };
}

function overpassQuery({ south, west, north, east }: BBox): string {
  const b = `${south},${west},${north},${east}`;
  return `[out:json][timeout:15];
(
  way["landuse"="construction"](${b});
  way["highway"="construction"](${b});
  way["highway"]["highway"!="construction"]["construction"~"^(yes|minor|widening)$"](${b});
  way["highway"]["smoothness"~"^(impassable|very_horrible)$"](${b});
  node["hazard"](${b});
);
out geom qt ${MAX_ELEMENTS};`;
}

async function fetchFrom(
  endpoint: string,
  query: string,
  signal?: AbortSignal
): Promise<OverpassElement[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(new Error('Overpass request timed out')),
    OVERPASS_TIMEOUT_MS
  );
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json = (await res.json()) as { elements?: OverpassElement[] };
    return json.elements ?? [];
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Obstacles inside the box, trying the Overpass mirrors in turn. */
export async function fetchObstacles(
  bbox: BBox,
  signal?: AbortSignal
): Promise<Obstacle[]> {
  const query = overpassQuery(bbox);
  let lastError: unknown = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw signal.reason ?? new Error('Aborted');
    try {
      const elements = await fetchFrom(endpoint, query, signal);
      return elements.map(toObstacle).filter((o): o is Obstacle => o !== null);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastError = e;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not fetch obstacles');
}
