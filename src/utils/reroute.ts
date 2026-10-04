import type { LatLng } from 'react-native-maps';
import { routeBetween, type Route } from './oneWayRoute';
import type { Obstacle } from './obstacles';

/*
 * Rerouting around obstacles while keeping the generated route.
 *
 * OSRM can't be told to avoid an area, so for every stretch of the route that
 * runs through an obstacle we cut that stretch out (with some approach margin
 * on both ends), ask OSRM for a short route through a point pushed off to one
 * side of the obstacle, and splice it back in. Everything outside the cut-out
 * stretches stays exactly as generated, so the overall shape of the route
 * (loop, stops, destination) doesn't change.
 */

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

/** Route sampling step for obstacle detection */
const SAMPLE_M = 6;
/** How close to a linear obstacle (road works) the route must run to use it */
const LINE_BUFFER_M = 8;
/** Shortest run through an obstacle that counts (crossing a street under construction doesn't) */
const MIN_RUN_M = { area: 15, line: 25, point: 0 } as const;
/** Obstacles closer than this along the route are avoided with one detour */
const MERGE_GAP_M = 160;
/**
 * Detour attempts, from the smallest change to the route: the detour leaves
 * the route `approach` meters before the obstacle and rejoins it as far after,
 * via OSRM's alternative routes or a point pushed `clearance` meters past the
 * obstacle's edge on either side.
 */
const ATTEMPTS = [
  { approach: 80, clearance: 50 },
  { approach: 250, clearance: 160 },
  { approach: 600, clearance: 400 },
];
/** A detour longer than this (vs the stretch it replaces) changes the route too much */
const MAX_DETOUR_FACTOR = 3;
const MAX_DETOUR_EXTRA_M = 1500;
/** Detour points spread along long blocked stretches */
const DETOUR_POINT_SPACING_M = 250;
const MAX_DETOUR_POINTS = 3;
/** At most this many detours per route, to go easy on the public OSRM server */
const MAX_DETOURS = 6;

const OSRM_BASE = 'https://router.project-osrm.org';
const OSRM_TIMEOUT_MS = 10_000;

type XY = { x: number; y: number };

function projector(origin: LatLng) {
  const cosLat = Math.cos(origin.latitude * DEG);
  return {
    toXY: (p: LatLng): XY => ({
      x: (p.longitude - origin.longitude) * DEG * cosLat * EARTH_RADIUS_M,
      y: (p.latitude - origin.latitude) * DEG * EARTH_RADIUS_M,
    }),
    toLatLng: ({ x, y }: XY): LatLng => ({
      latitude: origin.latitude + y / (EARTH_RADIUS_M * DEG),
      longitude: origin.longitude + x / (EARTH_RADIUS_M * DEG * cosLat),
    }),
  };
}

type Line = { pts: XY[]; cum: number[]; length: number };

function measure(pts: XY[]): Line {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(
      cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    );
  }
  return { pts, cum, length: cum[cum.length - 1] };
}

/** Index of the segment containing distance `m` and the position within it (0..1). */
function locate(line: Line, m: number): { i: number; t: number } {
  const { cum } = line;
  if (m <= 0) return { i: 0, t: 0 };
  if (m >= line.length) return { i: Math.max(0, cum.length - 2), t: 1 };
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= m) lo = mid;
    else hi = mid;
  }
  const len = cum[lo + 1] - cum[lo];
  return { i: lo, t: len === 0 ? 0 : (m - cum[lo]) / len };
}

function lerp<T extends LatLng | XY>(a: T, b: T, t: number): T {
  if ('x' in a && 'x' in b) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } as T;
  }
  const la = a as LatLng;
  const lb = b as LatLng;
  return {
    latitude: la.latitude + (lb.latitude - la.latitude) * t,
    longitude: la.longitude + (lb.longitude - la.longitude) * t,
  } as T;
}

function pointAt(line: Line, m: number): XY {
  const { i, t } = locate(line, m);
  return line.pts.length === 1
    ? line.pts[0]
    : lerp(line.pts[i], line.pts[i + 1], t);
}

/** Part of the route between two distances along it, endpoints interpolated. */
function slice(
  coords: LatLng[],
  line: Line,
  fromM: number,
  toM: number
): LatLng[] {
  if (toM <= fromM) return [];
  const a = locate(line, fromM);
  const b = locate(line, toM);
  const out = [lerp(coords[a.i], coords[a.i + 1] ?? coords[a.i], a.t)];
  for (let k = a.i + 1; k <= b.i; k++) out.push(coords[k]);
  out.push(lerp(coords[b.i], coords[b.i + 1] ?? coords[b.i], b.t));
  return out;
}

function segmentDistance(p: XY, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0
      ? 0
      : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}

function polylineDistance(p: XY, pts: XY[]): number {
  if (pts.length === 1) return Math.hypot(pts[0].x - p.x, pts[0].y - p.y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    best = Math.min(best, segmentDistance(p, pts[i - 1], pts[i]));
  }
  return best;
}

function insidePolygon(p: XY, ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

type ProjectedObstacle = { obstacle: Obstacle; pts: XY[] };

function blocks({ obstacle, pts }: ProjectedObstacle, p: XY): boolean {
  switch (obstacle.shape) {
    case 'area':
      return insidePolygon(p, pts);
    case 'line':
      return polylineDistance(p, pts) <= LINE_BUFFER_M;
    case 'point':
      return Math.hypot(pts[0].x - p.x, pts[0].y - p.y) <= obstacle.radiusM;
  }
}

/** A stretch of the route (meters along it) that goes through an obstacle. */
export type ObstacleHit = { obstacle: Obstacle; fromM: number; toM: number };

function hitsOnLine(line: Line, obstacles: ProjectedObstacle[]): ObstacleHit[] {
  if (line.pts.length < 2) return [];

  const samples: (XY & { m: number })[] = [];
  for (let i = 1; i < line.pts.length; i++) {
    const segLen = line.cum[i] - line.cum[i - 1];
    const n = Math.max(1, Math.ceil(segLen / SAMPLE_M));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      samples.push({
        ...lerp(line.pts[i - 1], line.pts[i], t),
        m: line.cum[i - 1] + segLen * t,
      });
    }
  }
  samples.push({ ...line.pts[line.pts.length - 1], m: line.length });

  const hits: ObstacleHit[] = [];
  for (const po of obstacles) {
    const minRun = MIN_RUN_M[po.obstacle.shape];
    let runStart: number | null = null;
    let runEnd = 0;
    const close = () => {
      if (runStart !== null && runEnd - runStart >= minRun) {
        hits.push({ obstacle: po.obstacle, fromM: runStart, toM: runEnd });
      }
      runStart = null;
    };
    for (const s of samples) {
      if (blocks(po, s)) {
        if (runStart !== null && s.m - runEnd > SAMPLE_M * 2) close();
        if (runStart === null) runStart = s.m;
        runEnd = s.m;
      }
    }
    close();
  }

  return hits.sort((a, b) => a.fromM - b.fromM);
}

/** Obstacles that could touch the line, projected; skips far ones cheaply. */
function candidates(
  line: Line,
  obstacles: Obstacle[],
  toXY: (p: LatLng) => XY,
  marginM: number
): ProjectedObstacle[] {
  return obstacles
    .filter(
      (o) => polylineDistance(toXY(o.center), line.pts) <= o.radiusM + marginM
    )
    .map((o) => ({ obstacle: o, pts: o.points.map(toXY) }));
}

/** Stretches of the route that run through obstacles, in order along the route. */
export function findObstacleHits(
  coords: LatLng[],
  obstacles: Obstacle[]
): ObstacleHit[] {
  if (coords.length < 2 || obstacles.length === 0) return [];
  const { toXY } = projector(coords[0]);
  const line = measure(coords.map(toXY));
  return hitsOnLine(line, candidates(line, obstacles, toXY, LINE_BUFFER_M + 5));
}

/** Obstacles within `maxM` of the route (for showing them on the map). */
export function obstaclesNearRoute(
  coords: LatLng[],
  obstacles: Obstacle[],
  maxM: number
): Obstacle[] {
  if (coords.length === 0) return [];
  const { toXY } = projector(coords[0]);
  const line = measure(coords.map(toXY));
  return candidates(line, obstacles, toXY, maxM).map((c) => c.obstacle);
}

type Cluster = { hits: ObstacleHit[]; fromM: number; toM: number };

function clusterHits(hits: ObstacleHit[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const h of hits) {
    const last = clusters[clusters.length - 1];
    if (last && h.fromM - last.toM < MERGE_GAP_M) {
      last.hits.push(h);
      last.toM = Math.max(last.toM, h.toM);
    } else {
      clusters.push({ hits: [h], fromM: h.fromM, toM: h.toM });
    }
  }
  return clusters;
}

type Detour = { entryM: number; exitM: number; route: Route };

type OsrmAlternatives = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
};

/** OSRM's route between two points plus up to 2 alternatives. */
async function alternativesBetween(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal
): Promise<Route[]> {
  const coords = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=3`;

  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(new Error('Route request timed out')),
    OSRM_TIMEOUT_MS
  );
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const json = (await res.json()) as OsrmAlternatives;
    if (json.code !== 'Ok') throw new Error(`OSRM ${json.code}`);
    return (json.routes ?? []).map((r) => ({
      coords: r.geometry.coordinates.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      })),
      distance: r.distance,
      duration: r.duration,
    }));
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Best detour around one cluster of obstacles, leaving the route no earlier
 * than `minEntryM`, or null if there's no reasonable one.
 */
async function detourAround(
  cluster: Cluster,
  line: Line,
  minEntryM: number,
  allObstacles: Obstacle[],
  proj: ReturnType<typeof projector>,
  signal?: AbortSignal
): Promise<Detour | null> {
  // An obstacle right at the start or end can't be avoided
  if (cluster.fromM < 10 || cluster.toM > line.length - 10) return null;

  const blockedLen = cluster.toM - cluster.fromM;
  const pointCount = Math.min(
    MAX_DETOUR_POINTS,
    Math.max(1, Math.ceil(blockedLen / DETOUR_POINT_SPACING_M))
  );
  const bases = Array.from({ length: pointCount }, (_, j) =>
    pointAt(line, cluster.fromM + (blockedLen * (j + 0.5)) / pointCount)
  );
  const obstaclePts = cluster.hits.flatMap(({ obstacle }) =>
    obstacle.points.map((p) => ({
      ...proj.toXY(p),
      reach: obstacle.shape === 'point' ? obstacle.radiusM : 0,
    }))
  );
  // Detours must not run into other obstacles either
  const nearby = candidates(
    line,
    allObstacles,
    proj.toXY,
    ATTEMPTS[ATTEMPTS.length - 1].approach * 3
  ).map((c) => c.obstacle);

  for (const { approach, clearance } of ATTEMPTS) {
    const entryM = Math.max(minEntryM, cluster.fromM - approach);
    const exitM = Math.min(line.length, cluster.toM + approach);
    const entry = pointAt(line, entryM);
    const exit = pointAt(line, exitM);
    const maxDistance =
      (exitM - entryM) * MAX_DETOUR_FACTOR + MAX_DETOUR_EXTRA_M;

    // Sideways direction: perpendicular to where the route is heading here
    let ux = exit.x - entry.x;
    let uy = exit.y - entry.y;
    if (Math.hypot(ux, uy) < 20) {
      const a = pointAt(line, cluster.fromM);
      const b = pointAt(line, cluster.toM + 1);
      ux = b.x - a.x;
      uy = b.y - a.y;
    }
    const ulen = Math.hypot(ux, uy) || 1;
    const normal = { x: -uy / ulen, y: ux / ulen };

    const viaSide = (side: number) =>
      bases.map((b) => {
        // How far the obstacles reach past the route on this side
        const reach = Math.max(
          0,
          ...obstaclePts.map(
            (p) =>
              ((p.x - b.x) * normal.x + (p.y - b.y) * normal.y) * side + p.reach
          )
        );
        const off = reach + clearance;
        return proj.toLatLng({
          x: b.x + normal.x * side * off,
          y: b.y + normal.y * side * off,
        });
      });

    const from = proj.toLatLng(entry);
    const to = proj.toLatLng(exit);
    const results = await Promise.allSettled([
      alternativesBetween(from, to, signal),
      ...[1, -1].map((side) =>
        routeBetween([from, ...viaSide(side), to], signal).then((r) => [r])
      ),
    ]);
    if (signal?.aborted) throw signal.reason ?? new Error('Aborted');

    const best = results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter(
        (r) =>
          r.distance <= maxDistance &&
          findObstacleHits(r.coords, nearby).length === 0
      )
      .sort((a, b) => a.distance - b.distance)[0];
    if (best) return { entryM, exitM, route: best };
  }

  return null;
}

export type RerouteResult = {
  /** The rerouted route, or the original one when nothing could be avoided */
  route: Route;
  /** Obstacles the original route went through and the new one doesn't */
  avoided: Obstacle[];
  /** Obstacles the route still goes through */
  unavoidable: Obstacle[];
  /** Number of detours spliced into the route */
  detours: number;
};

function uniqueObstacles(hits: ObstacleHit[]): Obstacle[] {
  const seen = new Map<string, Obstacle>();
  for (const h of hits) seen.set(h.obstacle.id, h.obstacle);
  return [...seen.values()];
}

/**
 * Reroutes `route` around the obstacles it goes through, keeping the rest of
 * it unchanged.
 */
export async function rerouteAroundObstacles(
  route: Route,
  obstacles: Obstacle[],
  signal?: AbortSignal
): Promise<RerouteResult> {
  const { coords } = route;
  const original = findObstacleHits(coords, obstacles);
  const blocked = uniqueObstacles(original);
  if (original.length === 0) {
    return { route, avoided: [], unavoidable: [], detours: 0 };
  }

  const proj = projector(coords[0]);
  const line = measure(coords.map(proj.toXY));
  const clusters = clusterHits(original).slice(0, MAX_DETOURS);

  // One cluster at a time: a wide detour may already cover the next obstacle
  const detours: Detour[] = [];
  for (const cluster of clusters) {
    const minEntryM = detours[detours.length - 1]?.exitM ?? 0;
    if (cluster.fromM < minEntryM) continue;
    try {
      const d = await detourAround(
        cluster,
        line,
        minEntryM,
        obstacles,
        proj,
        signal
      );
      if (d) detours.push(d);
    } catch (e) {
      if (signal?.aborted) throw e;
      console.warn('Detour error:', e instanceof Error ? e.message : e);
    }
  }

  if (detours.length === 0) {
    return { route, avoided: [], unavoidable: blocked, detours: 0 };
  }

  const out: LatLng[] = [];
  const push = (pts: LatLng[]) => {
    for (const p of pts) {
      const last = out[out.length - 1];
      if (
        !last ||
        last.latitude !== p.latitude ||
        last.longitude !== p.longitude
      ) {
        out.push(p);
      }
    }
  };

  let cursor = 0;
  let replacedM = 0;
  let detourDistance = 0;
  let detourDuration = 0;
  for (const d of detours) {
    push(slice(coords, line, cursor, d.entryM));
    push(d.route.coords);
    cursor = d.exitM;
    replacedM += d.exitM - d.entryM;
    detourDistance += d.route.distance;
    detourDuration += d.route.duration;
  }
  push(slice(coords, line, cursor, line.length));

  // Keep OSRM's own numbers for the untouched parts of the route
  const kept = line.length > 0 ? 1 - replacedM / line.length : 1;
  const rerouted: Route = {
    coords: out,
    distance: route.distance * kept + detourDistance,
    duration: route.duration * kept + detourDuration,
  };

  const unavoidable = uniqueObstacles(findObstacleHits(out, obstacles));
  const unavoidableIds = new Set(unavoidable.map((o) => o.id));

  return {
    route: rerouted,
    avoided: blocked.filter((o) => !unavoidableIds.has(o.id)),
    unavoidable,
    detours: detours.length,
  };
}
