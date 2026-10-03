import type { LatLng } from 'react-native-maps';
import { routeBetween, OsrmError, type Route } from './oneWayRoute';

const EARTH_RADIUS_M = 6_371_008.8;
const TAU = Math.PI * 2;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function normalizeLongitude(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

/**
 * Accurate destination point on a sphere.
 *
 * `bearing` is radians, clockwise from north.
 */
function offset(p: LatLng, meters: number, bearing: number): LatLng {
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

    if (length < 0.01) continue;

    const steps = Math.max(1, Math.ceil(length / sampleSpacing));

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
  attempt: number
): LatLng[] {
  /*
   * Alternating clockwise / counter-clockwise is useful because
   * one-way streets and turn restrictions can make one direction
   * substantially better.
   */
  const direction = attempt % 2 === 0 ? 1 : -1;

  /*
   * Slightly different ellipse on every attempt.
   *
   * We deliberately avoid large random jitter because randomly
   * putting a waypoint on a small cul-de-sac is exactly what creates
   * many ugly out-and-back sections.
   */
  const majorRadius = radius * (1.04 + 0.04 * Math.sin(attempt * 1.7));

  const minorRadius = radius * (0.88 + 0.05 * Math.cos(attempt * 1.3));

  /*
   * Start is the rear-most point of the ellipse.
   */
  const center = offset(start, majorRadius, bearing);

  const waypoints: LatLng[] = [];

  for (let i = 1; i < pointCount; i++) {
    let angle = Math.PI + (direction * (i * TAU)) / pointCount;

    /*
     * Small deterministic angular wobble.
     *
     * Prevents every candidate from hitting almost exactly the same
     * roads while still producing a smooth loop.
     */
    angle += 0.045 * Math.sin(i * 2.17 + attempt * 1.31);

    const radialWobble = 1 + 0.035 * Math.sin(i * 1.83 + attempt * 0.91);

    const forward = majorRadius * Math.cos(angle) * radialWobble;

    const right = minorRadius * Math.sin(angle) * radialWobble;

    waypoints.push(offsetLocal(center, forward, right, bearing));
  }

  return waypoints;
}

const isNoRoad = (e: unknown): boolean =>
  e instanceof OsrmError && (e.code === 'NoRoute' || e.code === 'NoSegment');

export type LoopOptions = {
  start: LatLng;

  targetMeters: number;

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
   * 0.10 = approximately 10%.
   */

  maxOverlap?: number;
  /**
   * Reject extremely thin / out-and-back shapes.
   *
   * Around 0.02-0.04 works well as a starting point.
   */
  minAreaRatio?: number;

  signal?: AbortSignal;
};

export type LoopResult = Route & {
  bearing: number;
};

export async function loopOfLength({
  start,
  targetMeters,
  bearing = Math.random() * TAU,
  points = 6,
  tolerance = 0.08,
  maxAttempts = 6,
  roadFactor = 1.3,
  maxOverlap = 0.1,
  minAreaRatio = 0.025,

  signal,
}: LoopOptions): Promise<LoopResult> {
  if (targetMeters <= 0) {
    throw new Error('Target length must be positive');
  }

  const pointCount = Math.max(4, Math.min(points, 8));

  /*
   * Initial estimate.
   *
   * Actual radius is corrected after every successful OSRM request,
   * so roadFactor does not need to be extremely precise.
   */
  let radius = targetMeters / (TAU * roadFactor);

  let best: {
    route: Route;
    score: number;
    bearing: number;
  } | null = null;

  /*
   * Instead of repeatedly trying the exact same orientation,
   * move candidate loops slightly left/right.
   *
   * ~9°, ~18°, ~27°.
   */
  const bearingOffsets = [0, 0.16, -0.16, 0.32, -0.32, 0.48, -0.48, 0.64];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateBearing =
      bearing + bearingOffsets[attempt % bearingOffsets.length];

    const ring = createLoopWaypoints(
      start,
      radius,
      candidateBearing,
      pointCount,
      attempt
    );

    let route: Route;

    try {
      route = await routeBetween([start, ...ring, start], signal);
    } catch (e) {
      if (signal?.aborted) {
        throw e;
      }

      if (isNoRoad(e)) {
        /*
         * One or more waypoints are probably too far from usable
         * roads.
         */
        radius *= 0.88;
        continue;
      }

      throw e;
    }

    const lengthError = Math.abs(route.distance - targetMeters) / targetMeters;

    const overlap = reusedRoadRatio(route.coords);

    const areaRatio = enclosedAreaRatio(route.coords, route.distance);

    const areaPenalty =
      minAreaRatio > 0
        ? clamp((minAreaRatio - areaRatio) / minAreaRatio, 0, 1)
        : 0;

    /*
     * Route quality matters considerably more than hitting the exact
     * distance.
     *
     * For example:
     *
     * 10.0 km route with 25% retracing
     *
     * should lose against:
     *
     * 9.6 km route with 1% retracing.
     */
    const score = lengthError * 1.5 + overlap * 4 + areaPenalty * 0.8;

    if (!best || score < best.score) {
      best = {
        route,
        score,
        bearing: candidateBearing,
      };
    }

    /*
     * Don't stop just because distance is correct.
     *
     * The old algorithm could stop on a 10.0 km route even if 4 km
     * of it was an ugly out-and-back.
     */
    const goodDistance = lengthError <= tolerance;

    const goodShape = overlap <= maxOverlap && areaRatio >= minAreaRatio;

    if (goodDistance && goodShape) {
      return {
        ...route,
        bearing: candidateBearing,
      };
    }

    /*
     * Correct the radius using the distance OSRM actually produced.
     *
     * Damping prevents:
     *
     * radius 1 km -> 3 km -> 1.2 km -> ...
     *
     * when road topology changes abruptly.
     */
    const rawCorrection = targetMeters / Math.max(route.distance, 1);

    const dampedCorrection = Math.pow(rawCorrection, 0.7);

    radius *= clamp(dampedCorrection, 0.72, 1.4);
  }

  if (!best) {
    throw new Error('Could not generate a loop here, try again');
  }

  return {
    ...best.route,
    bearing: best.bearing,
  };
}
