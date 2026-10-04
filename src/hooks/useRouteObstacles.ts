import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import type { Route } from '@/utils/oneWayRoute';
import {
  bboxAround,
  bboxContains,
  fetchObstacles,
  reportedObstacle,
  type BBox,
  type Obstacle,
} from '@/utils/obstacles';
import {
  findObstacleHits,
  obstaclesNearRoute,
  rerouteAroundObstacles,
  type RerouteResult,
} from '@/utils/reroute';

// Obstacles are fetched this far around the route, so small changes (stops) don't refetch
const FETCH_MARGIN_M = 400;
// Obstacles this close to the route are shown on the map
const SHOW_WITHIN_M = 120;

const NO_OBSTACLES: Obstacle[] = [];

/**
 * Obstacles around the route (OSM construction sites, road works, hazards and
 * points the user reported with a long press) and the route rerouted around
 * them, keeping the rest of the route as generated.
 *
 * `rerouted` is the route to show and use, or null when the route doesn't go
 * through any obstacle (or avoiding is switched off).
 */
export default function useRouteObstacles(route: Route | null) {
  const [fetched, setFetched] = useState<{ bbox: BBox; items: Obstacle[] }>();
  const [fetchFailed, setFetchFailed] = useState<Route | null>(null);
  const [reported, setReported] = useState<Obstacle[]>(NO_OBSTACLES);

  const [avoid, setAvoid] = useState(true);
  // Results and failures are kept per route and obstacle list, so anything
  // computed for an older route is simply ignored
  const [result, setResult] = useState<{
    route: Route;
    obstacles: Obstacle[];
    value: RerouteResult;
  }>();
  const [rerouteFailed, setRerouteFailed] = useState<{
    route: Route;
    obstacles: Obstacle[];
  }>();

  // Fetch when the route leaves the area we already have obstacles for
  const needed = useMemo(
    () => (route?.coords.length ? bboxAround(route.coords, 50) : null),
    [route]
  );
  const covered = !!needed && !!fetched && bboxContains(fetched.bbox, needed);
  const fetchError = !!route && fetchFailed === route;
  const fetching = !!needed && !covered && !fetchError;

  useEffect(() => {
    if (!route || !needed || covered || fetchFailed === route) return;

    const ctrl = new AbortController();
    const bbox = bboxAround(route.coords, FETCH_MARGIN_M);

    fetchObstacles(bbox, ctrl.signal)
      .then((items) => setFetched({ bbox, items }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Obstacles error:', e instanceof Error ? e.message : e);
        setFetchFailed(route);
      });

    return () => ctrl.abort();
  }, [route, needed, covered, fetchFailed]);

  const obstacles = useMemo(
    () => [...(fetched?.items ?? NO_OBSTACLES), ...reported],
    [fetched, reported]
  );

  const isCurrent = (r?: { route: Route; obstacles: Obstacle[] }) =>
    !!r && r.route === route && r.obstacles === obstacles;
  const rerouteError = isCurrent(rerouteFailed);
  const rerouting =
    avoid &&
    !!route &&
    obstacles.length > 0 &&
    !isCurrent(result) &&
    !rerouteError;

  // Reroute whenever the route or the obstacles change
  useEffect(() => {
    if (!route || !avoid || obstacles.length === 0) return;

    const ctrl = new AbortController();
    rerouteAroundObstacles(route, obstacles, ctrl.signal)
      .then((value) => setResult({ route, obstacles, value }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Reroute error:', e instanceof Error ? e.message : e);
        setRerouteFailed({ route, obstacles });
      });

    return () => ctrl.abort();
  }, [route, obstacles, avoid]);

  // While a new obstacle is being taken into account, keep the last detour
  const current = result?.route === route ? result.value : null;
  const rerouted =
    avoid && current && current.detours > 0 ? current.route : null;

  const nearby = useMemo(
    () =>
      route ? obstaclesNearRoute(route.coords, obstacles, SHOW_WITHIN_M) : [],
    [route, obstacles]
  );

  // Obstacles the generated route goes through
  const blocking = useMemo(() => {
    if (!route) return NO_OBSTACLES;
    const byId = new Map<string, Obstacle>();
    for (const h of findObstacleHits(route.coords, obstacles)) {
      byId.set(h.obstacle.id, h.obstacle);
    }
    return [...byId.values()];
  }, [route, obstacles]);

  const report = useCallback((point: LatLng) => {
    setReported((r) => [...r, reportedObstacle(point)]);
  }, []);

  const remove = useCallback((id: string) => {
    setReported((r) => r.filter((o) => o.id !== id));
  }, []);

  const refresh = useCallback(() => {
    setFetchFailed(null);
    setRerouteFailed(undefined);
  }, []);

  return {
    /** Obstacles near the route, plus every reported one */
    nearby: useMemo(
      () => [...nearby.filter((o) => o.kind !== 'reported'), ...reported],
      [nearby, reported]
    ),
    blocking,
    rerouted,
    original: route,
    /** Of `blocking`, the ones the rerouted route goes around */
    avoided: rerouted && current ? current.avoided : NO_OBSTACLES,
    avoid,
    setAvoid,
    loading: fetching || rerouting,
    error: fetchError
      ? 'Nie udało się pobrać przeszkód.'
      : rerouteError
        ? 'Nie udało się wyznaczyć objazdu.'
        : null,
    report,
    remove,
    refresh,
  };
}

export type RouteObstacles = ReturnType<typeof useRouteObstacles>;
