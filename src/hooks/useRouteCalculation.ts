import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import { routeBetween, type Route } from '@/utils/oneWayRoute';
import { loopOfLength, type LoopResult } from '@/utils/loopRoute';

export type UseRouteCalculationOptions = {
  start: LatLng | null;
  useUserLocationAsStart?: boolean;
  onRouteCalculated?: (coords: LatLng[]) => void;
};

export function useRouteCalculation({
  start,
  useUserLocationAsStart = true,
  onRouteCalculated,
}: UseRouteCalculationOptions) {
  const maxWaypoints = useUserLocationAsStart ? 1 : 2;

  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [loop, setLoop] = useState<LoopResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loopAbortRef = useRef<AbortController | null>(null);

  // Point-to-point routing effect
  useEffect(() => {
    const points: LatLng[] = [];

    if (useUserLocationAsStart) {
      if (start) {
        points.push(start);
      }
      points.push(...waypoints);
    } else {
      points.push(...waypoints);
    }

    if (points.length < 2) {
      return;
    }

    let active = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      setLoop(null);

      try {
        const r = await routeBetween(points, ctrl.signal);
        if (!active) return;

        setRoute(r);
        onRouteCalculated?.(r.coords);
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Route calculation failed');
        setRoute(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [start, waypoints, useUserLocationAsStart, onRouteCalculated]);

  // Cleanup abort controller on unmount
  useEffect(() => () => loopAbortRef.current?.abort(), []);

  const generateLoop = useCallback(
    async (km: number) => {
      if (!start) return;

      loopAbortRef.current?.abort();
      const ctrl = new AbortController();
      loopAbortRef.current = ctrl;

      setLoading(true);
      setError(null);
      setRoute(null);
      setWaypoints([]);

      try {
        const r = await loopOfLength({
          start,
          targetMeters: km * 1000,
          signal: ctrl.signal,
        });

        setLoop(r);
        onRouteCalculated?.(r.coords);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(
          e instanceof Error ? e.message : 'Could not generate loop route'
        );
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    [start, onRouteCalculated]
  );

  const addWaypoint = useCallback(
    (coordinate: LatLng) => {
      if (waypoints.length >= maxWaypoints) return;
      setLoop(null);
      setError(null);
      setWaypoints((w) => [...w, coordinate]);
    },
    [waypoints.length, maxWaypoints]
  );

  const resetRoute = useCallback(() => {
    loopAbortRef.current?.abort();
    setWaypoints([]);
    setRoute(null);
    setLoop(null);
    setError(null);
    setLoading(false);
  }, []);

  const activeRoute = loop || route;

  const getStatusText = useCallback(() => {
    if (loading) return loop ? 'Generating loop...' : 'Calculating route...';
    if (error) return error;

    if (activeRoute) {
      const km = (activeRoute.distance / 1000).toFixed(1);
      const min = Math.round(activeRoute.duration / 60);
      return `${loop ? 'Loop: ' : ''}${km} km · ${min} min`;
    }

    if (useUserLocationAsStart && !start) {
      return 'Waiting for location...';
    }

    if (waypoints.length < maxWaypoints) {
      return maxWaypoints === 1
        ? 'Tap map to set destination or pick a loop'
        : `Tap map to set waypoint ${waypoints.length + 1} of ${maxWaypoints}`;
    }

    return 'No route found';
  }, [
    loading,
    loop,
    error,
    activeRoute,
    useUserLocationAsStart,
    start,
    waypoints.length,
    maxWaypoints,
  ]);

  return {
    waypoints,
    route,
    loop,
    activeRoute,
    error,
    loading,
    statusText: getStatusText(),
    maxWaypoints,
    generateLoop,
    addWaypoint,
    resetRoute,
  };
}
