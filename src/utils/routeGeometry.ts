import type { LatLng } from 'react-native-maps';

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

/**
 * Distance (m) from a point to the route line and where along it the closest
 * point is (0..1 of the route length). Flat-earth approximation around the
 * point, accurate enough at city scale. Null for a route with no points.
 */
export function locateOnRoute(
  point: LatLng,
  coords: LatLng[]
): { distanceM: number; routeFraction: number } | null {
  if (coords.length === 0) return null;

  const cosLat = Math.cos(point.latitude * DEG);
  const toXY = (c: LatLng) => ({
    x: (c.longitude - point.longitude) * DEG * cosLat * EARTH_RADIUS_M,
    y: (c.latitude - point.latitude) * DEG * EARTH_RADIUS_M,
  });

  const pts = coords.map(toXY);
  let best = Math.hypot(pts[0].x, pts[0].y);
  let bestAlong = 0;
  let total = 0;

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    // Projection of the point (origin) onto segment a-b, clamped to the segment
    const t =
      len === 0
        ? 0
        : Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / len ** 2));
    const d = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (d < best) {
      best = d;
      bestAlong = total + t * len;
    }
    total += len;
  }

  return {
    distanceM: best,
    routeFraction: total === 0 ? 0 : bestAlong / total,
  };
}
