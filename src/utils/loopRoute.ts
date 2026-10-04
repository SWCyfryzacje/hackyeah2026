import type { LatLng } from 'react-native-maps';
import type { SupabaseClient } from '@supabase/supabase-js';
import { routeBetween, type Route, type RouteProfile } from './oneWayRoute';
import { fetchMonumentsNear, type Monument } from './monuments';

const EARTH_RADIUS_M = 6_371_008.8;
const TAU = Math.PI * 2;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function normalizeLongitude(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

export function haversineDistance(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRad(normalizeLongitude(b.longitude - a.longitude));
  const sinDLat2 = Math.sin(dLat / 2);
  const sinDLon2 = Math.sin(dLon / 2);
  const aVal =
    sinDLat2 * sinDLat2 +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon2 * sinDLon2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(aVal)));
}

export function initialBearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(normalizeLongitude(b.longitude - a.longitude));
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) + TAU) % TAU;
}

/**
 * Accurate destination point on a sphere.
 *
 * `bearing` is radians, clockwise from north.
 */
export function offset(p: LatLng, meters: number, bearing: number): LatLng {
  if (meters === 0) return p;

  const angularDistance = meters / EARTH_RADIUS_M;

  const lat1 = toRad(p.latitude);
  const lon1 = toRad(p.longitude);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);

  const sinDistance = Math.sin(angularDistance);
  const cosDistance = Math.cos(angularDistance);

  const lat2 = Math.asin(
    sinLat1 * cosDistance + cosLat1 * sinDistance * Math.cos(bearing)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * sinDistance * cosLat1,
      cosDistance - sinLat1 * Math.sin(lat2)
    );

  return {
    latitude: toDeg(lat2),
    longitude: normalizeLongitude(toDeg(lon2)),
  };
}

/**
 * Move relative to a local coordinate system whose "forward"
 * direction is `bearing`.
 */
function offsetLocal(
  origin: LatLng,
  forwardMeters: number,
  rightMeters: number,
  bearing: number
): LatLng {
  const distance = Math.hypot(forwardMeters, rightMeters);

  if (distance === 0) return origin;

  return offset(
    origin,
    distance,
    bearing + Math.atan2(rightMeters, forwardMeters)
  );
}

/**
 * Convert LatLng to approximate local X/Y meters.
 *
 * Used only for scoring route geometry, so an equirectangular
 * projection is plenty accurate for normal loop distances.
 */
function toLocalMeters(p: LatLng, origin: LatLng): { x: number; y: number } {
  const lat = toRad(p.latitude);
  const originLat = toRad(origin.latitude);

  let dLon = p.longitude - origin.longitude;

  // Handle routes near the antimeridian.
  if (dLon > 180) dLon -= 360;
  if (dLon < -180) dLon += 360;

  return {
    x: toRad(dLon) * EARTH_RADIUS_M * Math.cos((lat + originLat) / 2),

    y: (lat - originLat) * EARTH_RADIUS_M,
  };
}

/**
 * Estimate the fraction of the route that uses road/path segments
 * which were already used earlier.
 *
 * Important difference from the old overlap():
 *
 * - old algorithm counts polyline vertices
 * - this algorithm samples approximately every N meters
 * - road edges are considered undirected
 *
 * Therefore:
 *
 * A -> B
 * B -> A
 *
 * counts as the SAME road segment.
 */
function reusedRoadRatio(
  coords: LatLng[],
  sampleSpacing = 12,
  gridSize = 18
): number {
  if (coords.length < 2) return 0;

  const origin = coords[0];

  const cells: string[] = [];

  let previousCell: string | null = null;

  for (let i = 1; i < coords.length; i++) {
    const a = toLocalMeters(coords[i - 1], origin);
    const b = toLocalMeters(coords[i], origin);

    const dx = b.x - a.x;
    const dy = b.y - a.y;

    const length = Math.hypot(dx, dy);

    if (length < 0.01 || !Number.isFinite(length)) continue;

    const steps = Math.min(50, Math.max(1, Math.ceil(length / sampleSpacing)));

    for (let step = 0; step <= steps; step++) {
      // Avoid sampling the beginning of every segment twice.
      if (i > 1 && step === 0) continue;

      const t = step / steps;

      const x = a.x + dx * t;
      const y = a.y + dy * t;

      const gx = Math.round(x / gridSize);
      const gy = Math.round(y / gridSize);

      const cell = `${gx},${gy}`;

      if (cell !== previousCell) {
        cells.push(cell);
        previousCell = cell;
      }
    }
  }

  if (cells.length < 2) return 0;

  const seenEdges = new Set<string>();

  let reusedEdges = 0;
  let totalEdges = 0;

  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1];
    const b = cells[i];

    if (a === b) continue;

    // Undirected edge.
    //
    // A->B and B->A produce the same key.
    const edge = a < b ? `${a}|${b}` : `${b}|${a}`;

    totalEdges++;

    if (seenEdges.has(edge)) {
      reusedEdges++;
    } else {
      seenEdges.add(edge);
    }
  }

  if (totalEdges === 0) return 0;

  return reusedEdges / totalEdges;
}

/**
 * How much area the loop encloses relative to its total length.
 *
 * Circle ≈ 1.0
 * Normal irregular loop = lower
 * Out-and-back route ≈ 0
 *
 * This is essentially an isoperimetric-style score.
 */
function enclosedAreaRatio(coords: LatLng[], routeDistance: number): number {
  if (coords.length < 3 || routeDistance <= 0) {
    return 0;
  }

  const origin = coords[0];

  const points = coords.map((p) => toLocalMeters(p, origin));

  let twiceArea = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];

    twiceArea += a.x * b.y - b.x * a.y;
  }

  const area = Math.abs(twiceArea) / 2;

  // 4πA / P²
  //
  // Circle = 1.
  const ratio = (4 * Math.PI * area) / (routeDistance * routeDistance);

  return clamp(ratio, 0, 1);
}

/**
 * Generate an ellipse-like set of waypoints.
 *
 * Start is placed on the back of the ellipse instead of its center.
 *
 * This encourages:
 *
 *          waypoint
 *       /            \
 *    waypoint       waypoint
 *      |               |
 *      S -----> direction
 *
 * instead of a bunch of arbitrary radial destinations.
 */
function createLoopWaypoints(
  start: LatLng,
  radius: number,
  bearing: number,
  pointCount: number,
  direction = 1,
  wobbleIndex = 0
): LatLng[] {
  /*
   * Slightly different ellipse geometry per candidate variation.
   *
   * We deliberately avoid large random jitter because randomly
   * putting a waypoint on a small cul-de-sac creates ugly out-and-back sections.
   */
  const majorRadius = radius * (1.02 + 0.03 * Math.sin(wobbleIndex * 1.7));
  const minorRadius = radius * (0.88 + 0.04 * Math.cos(wobbleIndex * 1.3));

  /*
   * Start is the rear-most point of the ellipse.
   */
  const center = offset(start, majorRadius, bearing);

  const waypoints: LatLng[] = [];

  for (let i = 1; i < pointCount; i++) {
    let angle = Math.PI + (direction * (i * TAU)) / pointCount;

    /*
     * Small deterministic angular wobble.
     * Prevents every candidate from hitting almost exactly the same
     * roads while still producing a smooth loop.
     */
    angle += 0.04 * Math.sin(i * 2.17 + wobbleIndex * 1.31);

    const radialWobble = 1 + 0.03 * Math.sin(i * 1.83 + wobbleIndex * 0.91);

    const forward = majorRadius * Math.cos(angle) * radialWobble;
    const right = minorRadius * Math.sin(angle) * radialWobble;

    waypoints.push(offsetLocal(center, forward, right, bearing));
  }

  return waypoints;
}

export type LoopOptions = {
  start: LatLng;

  targetMeters?: number;

  /**
   * Minimum desired route length in meters for range-based loop generation.
   */
  minMeters?: number;

  /**
   * Maximum desired route length in meters for range-based loop generation.
   */
  maxMeters?: number;

  /**
   * Preferred initial direction, radians clockwise from north.
   *
   * Omit for random.
   */
  bearing?: number;

  /**
   * Number of points around the loop including the start.
   *
   * 5-7 generally works well.
   */
  points?: number;

  /**
   * Allowed length error.
   *
   * 0.1 = ±10%.
   */
  tolerance?: number;

  /**
   * Number of OSRM requests.
   */
  maxAttempts?: number;

  /**
   * Approximate road distance / straight-line distance.
   *
   * Used only for the initial radius estimate.
   */
  roadFactor?: number;

  /**
   * Maximum fraction of reused/retraced route.
   *
   * 0.12 = approximately 12%.
   */
  maxOverlap?: number;

  /**
   * Reject extremely thin / out-and-back shapes.
   *
   * Around 0.02-0.04 works well as a starting point.
   */
  minAreaRatio?: number;

  signal?: AbortSignal;
  profile?: RouteProfile;
};

export type LoopResult = Route & {
  bearing: number;
  ring: LatLng[];
};

export type OneWayOptions = {
  start: LatLng;
  targetMeters?: number;
  minMeters?: number;
  maxMeters?: number;
  profile?: RouteProfile;
  bearing?: number;
  signal?: AbortSignal;
  supabase?: SupabaseClient;
};

export type OneWayResult = Route & {
  destination: LatLng & { name?: string; description?: string; id?: number };
  monument?: Monument;
};

export type LoopThroughPointOptions = {
  start: LatLng;
  via: LatLng & { name?: string; description?: string; id?: number };
  profile?: RouteProfile;
  signal?: AbortSignal;
};

export async function loopOfLength({
  start,
  targetMeters: explicitTargetMeters,
  minMeters,
  maxMeters,
  bearing = Math.random() * TAU,
  points = 5,
  tolerance = 0.12,
  roadFactor,
  maxOverlap = 0.12,
  minAreaRatio = 0.02,
  signal,
  profile = 'walking',
}: LoopOptions): Promise<LoopResult> {
  const targetMeters =
    explicitTargetMeters ??
    (minMeters !== undefined && maxMeters !== undefined
      ? (minMeters + maxMeters) / 2
      : minMeters ?? maxMeters ?? 5000);

  if (targetMeters <= 0) {
    throw new Error('Target length must be positive');
  }

  const pointCount = Math.max(4, Math.min(points, 8));

  /*
   * Estimate realistic road factor based on target distance.
   * Smaller loops in urban areas experience higher road grid winding overhead.
   */
  const effectiveRoadFactor =
    roadFactor ??
    (targetMeters <= 3500 ? 2.15 : targetMeters <= 6500 ? 1.9 : 1.75);

  const baseRadius = targetMeters / (TAU * effectiveRoadFactor);

  /*
   * Generate diverse candidate loop configurations in parallel:
   * - Varied bearings and directions (clockwise vs counter-clockwise)
   * - Slight radius adjustments to hit target distance across different road topologies
   */
  const candidateConfigs = [
    { bearing, direction: 1, radius: baseRadius, wobble: 0 },
    {
      bearing: bearing + 0.6,
      direction: -1,
      radius: minMeters
        ? (minMeters / (TAU * effectiveRoadFactor)) * 1.05
        : baseRadius * 0.92,
      wobble: 1,
    },
    {
      bearing: bearing - 0.6,
      direction: 1,
      radius: maxMeters
        ? (maxMeters / (TAU * effectiveRoadFactor)) * 0.95
        : baseRadius * 1.08,
      wobble: 2,
    },
    {
      bearing: bearing + Math.PI * 0.7,
      direction: -1,
      radius: baseRadius * 0.95,
      wobble: 3,
    },
    {
      bearing: bearing - Math.PI * 0.7,
      direction: 1,
      radius: baseRadius * 1.12,
      wobble: 4,
    },
  ];

  type ScoredCandidate = LoopResult & {
    score: number;
    lengthError: number;
    overlap: number;
    areaRatio: number;
  };

  const candidatePromises = candidateConfigs.map(async (c) => {
    const ring = createLoopWaypoints(
      start,
      c.radius,
      c.bearing,
      pointCount,
      c.direction,
      c.wobble
    );

    const route = await routeBetween(
      [start, ...ring, start],
      signal,
      undefined,
      profile
    );

    let lengthError: number;
    if (minMeters !== undefined && maxMeters !== undefined) {
      if (route.distance < minMeters) {
        lengthError = (minMeters - route.distance) / minMeters;
      } else if (route.distance > maxMeters) {
        lengthError = (route.distance - maxMeters) / maxMeters;
      } else {
        lengthError = 0;
      }
    } else {
      lengthError = Math.abs(route.distance - targetMeters) / targetMeters;
    }

    const overlap = reusedRoadRatio(route.coords);
    const areaRatio = enclosedAreaRatio(route.coords, route.distance);

    const areaPenalty =
      minAreaRatio > 0
        ? clamp((minAreaRatio - areaRatio) / minAreaRatio, 0, 1)
        : 0;

    /*
     * Score combines length accuracy, low retracing/overlap, and reasonable enclosed area.
     */
    const score = lengthError * 1.8 + overlap * 3.5 + areaPenalty * 0.8;

    return {
      ...route,
      bearing: c.bearing,
      ring,
      score,
      lengthError,
      overlap,
      areaRatio,
    };
  });

  return new Promise<LoopResult>((resolve, reject) => {
    let completedCount = 0;
    const validResults: ScoredCandidate[] = [];
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const checkDone = () => {
      if (settled) return;
      if (validResults.length > 0) {
        settled = true;
        if (graceTimer) clearTimeout(graceTimer);
        validResults.sort((a, b) => a.score - b.score);
        const best = validResults[0];
        resolve({
          coords: best.coords,
          distance: best.distance,
          duration: best.duration,
          bearing: best.bearing,
          ring: best.ring,
        });
      } else if (completedCount === candidatePromises.length) {
        settled = true;
        if (graceTimer) clearTimeout(graceTimer);
        reject(new Error('Could not generate a loop here, try again'));
      }
    };

    if (signal) {
      if (signal.aborted) {
        reject(signal.reason || new Error('Aborted'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          if (!settled) {
            settled = true;
            if (graceTimer) clearTimeout(graceTimer);
            reject(signal.reason || new Error('Aborted'));
          }
        },
        { once: true }
      );
    }

    candidatePromises.forEach((p) => {
      p.then((res) => {
        completedCount++;
        validResults.push(res);

        /*
         * Fast exit: If an excellent route arrives that satisfies tolerance and shape,
         * return immediately without waiting for slower in-flight requests.
         */
        if (
          res.lengthError <= tolerance &&
          res.overlap <= maxOverlap &&
          res.areaRatio >= minAreaRatio
        ) {
          settled = true;
          if (graceTimer) clearTimeout(graceTimer);
          resolve({
            coords: res.coords,
            distance: res.distance,
            duration: res.duration,
            bearing: res.bearing,
            ring: res.ring,
          });
          return;
        }

        /*
         * Once at least one valid candidate is received, allow a brief grace period (180ms)
         * for other fast candidate requests to complete so the best route can be selected.
         */
        if (validResults.length >= 1 && !graceTimer) {
          graceTimer = setTimeout(checkDone, 180);
        }

        if (completedCount === candidatePromises.length) {
          checkDone();
        }
      }).catch((err) => {
        completedCount++;
        if (completedCount === candidatePromises.length) {
          checkDone();
        }
      });
    });
  });
}

export async function oneWayOfLength({
  start,
  targetMeters: explicitTargetMeters,
  minMeters,
  maxMeters,
  bearing = Math.random() * TAU,
  profile = 'walking',
  signal,
  supabase,
}: OneWayOptions): Promise<OneWayResult> {
  const targetMeters =
    explicitTargetMeters ??
    (minMeters !== undefined && maxMeters !== undefined
      ? (minMeters + maxMeters) / 2
      : minMeters ?? maxMeters ?? 4000);

  if (targetMeters <= 0) {
    throw new Error('Target length must be positive');
  }

  // 1. If Supabase client is available, attempt to select a random cultural monument in the requested range
  if (supabase) {
    try {
      const searchRadius = Math.max(maxMeters ?? targetMeters * 1.2, 2000);
      const monuments = await fetchMonumentsNear(
        supabase,
        start,
        searchRadius,
        0,
        signal
      );

      const effectiveMinMeters = minMeters ?? targetMeters * 0.8;
      const effectiveMaxMeters = maxMeters ?? targetMeters * 1.2;

      // Filter monuments located at a plausible straight-line distance for the route range
      let candidateMonuments = monuments.filter(
        (m) =>
          m.distanceM >= effectiveMinMeters * 0.45 &&
          m.distanceM <= effectiveMaxMeters * 1.05
      );

      if (candidateMonuments.length === 0) {
        candidateMonuments = monuments.filter(
          (m) =>
            m.distanceM >= effectiveMinMeters * 0.3 &&
            m.distanceM <= effectiveMaxMeters * 1.2
        );
      }

      if (candidateMonuments.length > 0) {
        // Randomize candidate ordering for unbiased selection
        const shuffled = [...candidateMonuments].sort(
          () => Math.random() - 0.5
        );

        const testCandidates = shuffled.slice(0, 8);

        type ScoredMonumentRoute = {
          route: Route;
          monument: Monument;
          score: number;
          inRange: boolean;
        };

        const monumentPromises = testCandidates.map(async (m) => {
          const dest = { latitude: m.latitude, longitude: m.longitude };
          const route = await routeBetween(
            [start, dest],
            signal,
            undefined,
            profile
          );

          let lengthError: number;
          let inRange = false;

          if (minMeters !== undefined && maxMeters !== undefined) {
            if (route.distance < minMeters) {
              lengthError = (minMeters - route.distance) / minMeters;
            } else if (route.distance > maxMeters) {
              lengthError = (route.distance - maxMeters) / maxMeters;
            } else {
              lengthError = 0;
              inRange = true;
            }
          } else {
            lengthError =
              Math.abs(route.distance - targetMeters) / targetMeters;
            inRange = lengthError < 0.2;
          }

          return {
            route,
            monument: m,
            score: lengthError,
            inRange,
          };
        });

        const settledResults = await Promise.allSettled(monumentPromises);
        const validResults: ScoredMonumentRoute[] = settledResults
          .filter(
            (r): r is PromiseFulfilledResult<ScoredMonumentRoute> =>
              r.status === 'fulfilled'
          )
          .map((r) => r.value);

        if (validResults.length > 0) {
          const inRangeResults = validResults.filter((r) => r.inRange);
          const chosen =
            inRangeResults.length > 0
              ? inRangeResults[0]
              : validResults.sort((a, b) => a.score - b.score)[0];

          if (chosen.inRange || chosen.score < 0.4) {
            return {
              coords: chosen.route.coords,
              distance: chosen.route.distance,
              duration: chosen.route.duration,
              destination: {
                latitude: chosen.monument.latitude,
                longitude: chosen.monument.longitude,
                name: chosen.monument.name,
                description: chosen.monument.description ?? undefined,
                id: chosen.monument.id,
              },
              monument: chosen.monument,
            };
          }
        }
      }
    } catch (e) {
      if (signal?.aborted) throw e;
      // If fetching monuments fails, smoothly fall back to geometric candidate routing
    }
  }

  // 2. Geometric fallback route generation
  const roadFactor = profile === 'driving' ? 1.4 : 1.35;
  const straightDistance = targetMeters / roadFactor;

  const candidateBearings = [
    bearing,
    (bearing + Math.PI / 3) % TAU,
    (bearing + (2 * Math.PI) / 3) % TAU,
    (bearing + Math.PI) % TAU,
    (bearing + (4 * Math.PI) / 3) % TAU,
    (bearing + (5 * Math.PI) / 3) % TAU,
  ];

  type ScoredOneWay = OneWayResult & { score: number };

  const candidatePromises = candidateBearings.map(async (b) => {
    const dest = offset(start, straightDistance, b);
    const route = await routeBetween([start, dest], signal, undefined, profile);

    let lengthError: number;
    if (minMeters !== undefined && maxMeters !== undefined) {
      if (route.distance < minMeters) {
        lengthError = (minMeters - route.distance) / minMeters;
      } else if (route.distance > maxMeters) {
        lengthError = (route.distance - maxMeters) / maxMeters;
      } else {
        lengthError = 0;
      }
    } else {
      lengthError = Math.abs(route.distance - targetMeters) / targetMeters;
    }

    return {
      ...route,
      destination: dest,
      score: lengthError,
    };
  });

  return new Promise<OneWayResult>((resolve, reject) => {
    let completedCount = 0;
    const validResults: ScoredOneWay[] = [];
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const checkDone = () => {
      if (settled) return;
      if (validResults.length > 0) {
        settled = true;
        if (graceTimer) clearTimeout(graceTimer);
        validResults.sort((a, b) => a.score - b.score);
        resolve({
          coords: validResults[0].coords,
          distance: validResults[0].distance,
          duration: validResults[0].duration,
          destination: validResults[0].destination,
        });
      } else if (completedCount === candidatePromises.length) {
        settled = true;
        if (graceTimer) clearTimeout(graceTimer);
        reject(new Error('Could not calculate a route in this area'));
      }
    };

    if (signal) {
      if (signal.aborted) {
        reject(signal.reason || new Error('Aborted'));
        return;
      }
      signal.addEventListener(
        'abort',
        () => {
          if (!settled) {
            settled = true;
            if (graceTimer) clearTimeout(graceTimer);
            reject(signal.reason || new Error('Aborted'));
          }
        },
        { once: true }
      );
    }

    candidatePromises.forEach((p) => {
      p.then((res) => {
        completedCount++;
        validResults.push(res);
        if (res.score < 0.15) {
          settled = true;
          if (graceTimer) clearTimeout(graceTimer);
          resolve({
            coords: res.coords,
            distance: res.distance,
            duration: res.duration,
            destination: res.destination,
          });
          return;
        }

        if (validResults.length >= 1 && !graceTimer) {
          graceTimer = setTimeout(checkDone, 180);
        }

        if (completedCount === candidatePromises.length) {
          checkDone();
        }
      }).catch(() => {
        completedCount++;
        if (completedCount === candidatePromises.length) {
          checkDone();
        }
      });
    });
  });
}

/**
 * Generate a closed loop route that specifically passes through a specified waypoint/monument.
 * Evaluates diverse geometry configurations to minimize overlapping road segments.
 */
export async function loopThroughPoint({
  start,
  via,
  profile = 'walking',
  signal,
}: LoopThroughPointOptions): Promise<LoopResult> {
  const dist = haversineDistance(start, via);
  const bearing = initialBearing(start, via);

  if (dist < 50) {
    return loopOfLength({
      start,
      targetMeters: 3000,
      profile,
      signal,
    });
  }

  const mid = offset(start, dist * 0.5, bearing);

  // Diverse candidate configurations ensuring a natural loop passing through via
  const candidateConfigurations: LatLng[][] = [
    // 1. Clockwise triangle / polygon
    [
      start,
      offset(mid, dist * 0.45, bearing - Math.PI / 2),
      via,
      offset(mid, dist * 0.45, bearing + Math.PI / 2),
      start,
    ],
    // 2. Counter-clockwise triangle / polygon
    [
      start,
      offset(mid, dist * 0.45, bearing + Math.PI / 2),
      via,
      offset(mid, dist * 0.45, bearing - Math.PI / 2),
      start,
    ],
    // 3. Out via point, curved back on right
    [
      start,
      via,
      offset(mid, dist * 0.55, bearing + Math.PI / 2),
      start,
    ],
    // 4. Out via point, curved back on left
    [
      start,
      via,
      offset(mid, dist * 0.55, bearing - Math.PI / 2),
      start,
    ],
    // 5. Curved out on right, back via point
    [
      start,
      offset(mid, dist * 0.55, bearing + Math.PI / 2),
      via,
      start,
    ],
    // 6. Curved out on left, back via point
    [
      start,
      offset(mid, dist * 0.55, bearing - Math.PI / 2),
      via,
      start,
    ],
    // 7. Wide arc around start and via
    [
      start,
      offset(start, dist * 0.8, bearing - Math.PI / 3),
      via,
      offset(start, dist * 0.8, bearing + Math.PI / 3),
      start,
    ],
    // 8. Tighter arc
    [
      start,
      offset(mid, dist * 0.3, bearing - Math.PI / 2),
      via,
      offset(mid, dist * 0.3, bearing + Math.PI / 2),
      start,
    ],
  ];

  type ScoredCandidate = LoopResult & {
    score: number;
    overlap: number;
  };

  const promises = candidateConfigurations.map(async (pts) => {
    const r = await routeBetween(pts, signal, undefined, profile);
    const overlap = reusedRoadRatio(r.coords);
    const areaRatio = enclosedAreaRatio(r.coords, r.distance);
    const score = overlap * 3 - areaRatio * 0.5;
    return {
      coords: r.coords,
      distance: r.distance,
      duration: r.duration,
      bearing,
      ring: pts.slice(1, -1),
      score,
      overlap,
    };
  });

  const settled = await Promise.allSettled(promises);
  const valid: ScoredCandidate[] = settled
    .filter(
      (res): res is PromiseFulfilledResult<ScoredCandidate> =>
        res.status === 'fulfilled'
    )
    .map((res) => res.value);

  if (valid.length > 0) {
    valid.sort((a, b) => a.score - b.score);
    return valid[0];
  }

  // Fallback direct loop
  const fallbackRoute = await routeBetween(
    [start, via, start],
    signal,
    undefined,
    profile
  );
  return {
    coords: fallbackRoute.coords,
    distance: fallbackRoute.distance,
    duration: fallbackRoute.duration,
    bearing,
    ring: [via],
  };
}
