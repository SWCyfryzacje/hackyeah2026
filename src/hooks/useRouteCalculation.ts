import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import { useSupabase } from '@/lib/supabase';
import {
  routeBetween,
  type Route,
  type RouteProfile,
} from '@/utils/oneWayRoute';
import {
  loopOfLength,
  loopThroughPoint,
  oneWayOfLength,
  type LoopResult,
} from '@/utils/loopRoute';

export { type RouteProfile } from '@/utils/oneWayRoute';

export type RouteStop = LatLng & {
  routeFraction?: number;
  name?: string;
};

export type Waypoint = LatLng & {
  name?: string;
  description?: string;
  id?: number;
};

export type RouteType = 'loop' | 'one_way';

export type RoutePreferences = {
  type: RouteType;
  minKm: number;
  maxKm: number;
  profile: RouteProfile;
};

export type UseRouteCalculationOptions = {
  start: LatLng | null;
  useUserLocationAsStart?: boolean;
  onRouteCalculated?: (coords: LatLng[]) => void;
  /** Extra stops inserted before the destination or into the loop (e.g. selected monuments) */
  stops?: RouteStop[];
  initialProfile?: RouteProfile;
};

const NO_STOPS: RouteStop[] = [];

type BaseLoop = {
  start: LatLng;
  ring: LatLng[];
  bearing: number;
  initialResult: LoopResult;
};

function mergeLoopWaypoints(
  start: LatLng,
  ring: LatLng[],
  stops: RouteStop[]
): LatLng[] {
  const n = ring.length;
  // Assign each ring point an approximate fraction along the loop (0 < fraction < 1)
  const ringWithFractions = ring.map((pt, i) => ({
    point: pt,
    fraction: (i + 1) / (n + 1),
  }));

  const stopsWithFractions = stops.map((s, i) => ({
    point: { latitude: s.latitude, longitude: s.longitude },
    fraction: s.routeFraction ?? (i + 1) / (stops.length + 1),
  }));

  const allPoints = [...ringWithFractions, ...stopsWithFractions].sort(
    (a, b) => a.fraction - b.fraction
  );

  return [start, ...allPoints.map((p) => p.point), start];
}

export type LoopTarget =
  | number
  | {
      minKm: number;
      maxKm: number;
      label?: string;
    };

export function useRouteCalculation({
  start,
  useUserLocationAsStart = true,
  onRouteCalculated,
  stops = NO_STOPS,
  initialProfile = 'walking',
}: UseRouteCalculationOptions) {
  const maxWaypoints = useUserLocationAsStart ? 1 : 2;
  const supabase = useSupabase();

  const [profile, setProfile] = useState<RouteProfile>(initialProfile);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [detourRoute, setDetourRoute] = useState<Route | null>(null);
  const [baseLoop, setBaseLoop] = useState<BaseLoop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);

  const loopAbortRef = useRef<AbortController | null>(null);
  const prevWaypointsRef = useRef<LatLng[]>([]);

  const loop: LoopResult | null = useMemo(
    () =>
      baseLoop
        ? stops.length > 0 && detourRoute
          ? {
              ...detourRoute,
              bearing: baseLoop.bearing,
              ring: baseLoop.ring,
            }
          : baseLoop.initialResult
        : null,
    [baseLoop, stops.length, detourRoute]
  );

  // Point-to-point routing effect
  useEffect(() => {
    // Only calculate point-to-point if we have destination waypoints and no active baseLoop
    if (baseLoop) return;

    const points: LatLng[] = [];

    if (useUserLocationAsStart) {
      if (start) {
        points.push(start);
      }
      points.push(...waypoints);
    } else {
      points.push(...waypoints);
    }

    points.splice(points.length - 1, 0, ...stops);

    if (points.length < 2) {
      return;
    }

    const waypointsChanged = prevWaypointsRef.current !== waypoints;
    prevWaypointsRef.current = waypoints;
    const isNewRoute = waypointsChanged;

    let active = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      if (isNewRoute) {
        setIsGeneratingRoute(true);
      }
      setError(null);

      try {
        const r = await routeBetween(points, ctrl.signal, undefined, profile);
        if (!active) return;

        setRoute(r);
        onRouteCalculated?.(r.coords);
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Route calculation failed');
        setRoute(null);
      } finally {
        if (active) {
          setLoading(false);
          setIsGeneratingRoute(false);
        }
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [
    start,
    waypoints,
    stops,
    useUserLocationAsStart,
    onRouteCalculated,
    baseLoop,
    profile,
  ]);

  // Recalculate loop route when stops change on an active baseLoop
  useEffect(() => {
    if (!baseLoop || stops.length === 0) return;

    let active = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const mergedPoints = mergeLoopWaypoints(
          baseLoop.start,
          baseLoop.ring,
          stops
        );
        const r = await routeBetween(
          mergedPoints,
          ctrl.signal,
          undefined,
          profile
        );
        if (!active) return;

        setDetourRoute(r);
        onRouteCalculated?.(r.coords);
      } catch (e: unknown) {
        if (!active) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Could not recalculate loop');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [baseLoop, stops, onRouteCalculated, profile]);

  // Cleanup abort controller on unmount
  useEffect(() => () => loopAbortRef.current?.abort(), []);

  const generateLoop = useCallback(
    async (target: LoopTarget, targetProfile: RouteProfile = profile) => {
      if (!start) return;

      setProfile(targetProfile);
      loopAbortRef.current?.abort();
      const ctrl = new AbortController();
      loopAbortRef.current = ctrl;

      setLoading(true);
      setIsGeneratingRoute(true);
      setError(null);
      setRoute(null);
      setDetourRoute(null);
      setWaypoints([]);
      prevWaypointsRef.current = [];
      setBaseLoop(null);

      try {
        const loopParams =
          typeof target === 'number'
            ? {
                start,
                targetMeters: target * 1000,
                signal: ctrl.signal,
                profile: targetProfile,
              }
            : {
                start,
                minMeters: target.minKm * 1000,
                maxMeters: target.maxKm * 1000,
                targetMeters: ((target.minKm + target.maxKm) / 2) * 1000,
                signal: ctrl.signal,
                profile: targetProfile,
              };

        const r = await loopOfLength(loopParams);

        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;

        setBaseLoop({
          start,
          ring: r.ring,
          bearing: r.bearing,
          initialResult: r,
        });
        onRouteCalculated?.(r.coords);
      } catch (e) {
        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(
          e instanceof Error ? e.message : 'Nie udało się wygenerować trasy pętli'
        );
      } finally {
        if (loopAbortRef.current === ctrl) {
          setLoading(false);
          setIsGeneratingRoute(false);
        }
      }
    },
    [start, onRouteCalculated, profile]
  );

  const generateOneWay = useCallback(
    async (
      target: { minKm: number; maxKm: number },
      targetProfile: RouteProfile = profile
    ) => {
      if (!start) return;

      setProfile(targetProfile);
      loopAbortRef.current?.abort();
      const ctrl = new AbortController();
      loopAbortRef.current = ctrl;

      setLoading(true);
      setIsGeneratingRoute(true);
      setError(null);
      setRoute(null);
      setDetourRoute(null);
      setBaseLoop(null);
      setWaypoints([]);
      prevWaypointsRef.current = [];

      try {
        const r = await oneWayOfLength({
          start,
          minMeters: target.minKm * 1000,
          maxMeters: target.maxKm * 1000,
          profile: targetProfile,
          signal: ctrl.signal,
          supabase,
        });

        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;

        setWaypoints([r.destination]);
        prevWaypointsRef.current = [r.destination];
        setRoute({
          coords: r.coords,
          distance: r.distance,
          duration: r.duration,
        });
        onRouteCalculated?.(r.coords);
      } catch (e) {
        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Nie udało się wygenerować trasy');
      } finally {
        if (loopAbortRef.current === ctrl) {
          setLoading(false);
          setIsGeneratingRoute(false);
        }
      }
    },
    [start, onRouteCalculated, profile, supabase]
  );

  const generateRoute = useCallback(
    async (prefs: RoutePreferences) => {
      if (prefs.type === 'loop') {
        return generateLoop(
          { minKm: prefs.minKm, maxKm: prefs.maxKm },
          prefs.profile
        );
      } else {
        return generateOneWay(
          { minKm: prefs.minKm, maxKm: prefs.maxKm },
          prefs.profile
        );
      }
    },
    [generateLoop, generateOneWay]
  );

  const generateLoopThroughPoint = useCallback(
    async (via: Waypoint, targetProfile: RouteProfile = profile) => {
      if (!start) return;

      setProfile(targetProfile);
      loopAbortRef.current?.abort();
      const ctrl = new AbortController();
      loopAbortRef.current = ctrl;

      setLoading(true);
      setIsGeneratingRoute(true);
      setError(null);
      setRoute(null);
      setDetourRoute(null);
      setWaypoints([via]);
      prevWaypointsRef.current = [via];
      setBaseLoop(null);

      try {
        const r = await loopThroughPoint({
          start,
          via,
          profile: targetProfile,
          signal: ctrl.signal,
        });

        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;

        setBaseLoop({
          start,
          ring: r.ring,
          bearing: r.bearing,
          initialResult: r,
        });
        onRouteCalculated?.(r.coords);
      } catch (e) {
        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(
          e instanceof Error ? e.message : 'Nie udało się wygenerować trasy pętli'
        );
      } finally {
        if (loopAbortRef.current === ctrl) {
          setLoading(false);
          setIsGeneratingRoute(false);
        }
      }
    },
    [start, onRouteCalculated, profile]
  );

  const generateOneWayToDestination = useCallback(
    async (destination: Waypoint, targetProfile: RouteProfile = profile) => {
      if (!start) return;

      setProfile(targetProfile);
      loopAbortRef.current?.abort();
      const ctrl = new AbortController();
      loopAbortRef.current = ctrl;

      setLoading(true);
      setIsGeneratingRoute(true);
      setError(null);
      setRoute(null);
      setDetourRoute(null);
      setBaseLoop(null);
      setWaypoints([destination]);
      prevWaypointsRef.current = [destination];

      try {
        const r = await routeBetween(
          [start, destination],
          ctrl.signal,
          undefined,
          targetProfile
        );

        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;

        setRoute(r);
        onRouteCalculated?.(r.coords);
      } catch (e) {
        if (ctrl.signal.aborted || loopAbortRef.current !== ctrl) return;
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(
          e instanceof Error ? e.message : 'Nie udało się wyznaczyć trasy'
        );
      } finally {
        if (loopAbortRef.current === ctrl) {
          setLoading(false);
          setIsGeneratingRoute(false);
        }
      }
    },
    [start, onRouteCalculated, profile]
  );

  const addWaypoint = useCallback(
    (coordinate: LatLng) => {
      if (baseLoop) return;
      if (waypoints.length >= maxWaypoints) return;
      setError(null);
      setWaypoints((w) => [...w, coordinate]);
    },
    [baseLoop, waypoints.length, maxWaypoints]
  );

  const resetRoute = useCallback(() => {
    loopAbortRef.current?.abort();
    setBaseLoop(null);
    setDetourRoute(null);
    setWaypoints([]);
    prevWaypointsRef.current = [];
    setRoute(null);
    setError(null);
    setLoading(false);
    setIsGeneratingRoute(false);
  }, []);

  const activeRoute = loop || route;

  const getStatusText = useCallback(() => {
    if (isGeneratingRoute)
      return loop || baseLoop ? 'Generowanie pętli...' : 'Generowanie trasy...';
    if (loading) return 'Aktualizowanie trasy...';
    if (error) return error;

    if (activeRoute) {
      const km = (activeRoute.distance / 1000).toFixed(1);
      const min = Math.round(activeRoute.duration / 60);
      const profileIcon = profile === 'driving' ? 'Jazda' : 'Spacer';
      return `${profileIcon} · ${loop ? 'Pętla: ' : ''}${km} km · ${min} min`;
    }

    if (useUserLocationAsStart && !start) {
      return 'Oczekiwanie na lokalizację...';
    }

    if (waypoints.length < maxWaypoints) {
      return maxWaypoints === 1
        ? 'Wybierz preferencje lub wskaż cel na mapie'
        : `Wskaż punkt ${waypoints.length + 1} z ${maxWaypoints}`;
    }

    return 'Brak trasy';
  }, [
    isGeneratingRoute,
    loading,
    loop,
    baseLoop,
    error,
    activeRoute,
    profile,
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
    isGeneratingRoute,
    statusText: getStatusText(),
    maxWaypoints,
    profile,
    setProfile,
    generateRoute,
    generateLoop,
    generateOneWay,
    generateLoopThroughPoint,
    generateOneWayToDestination,
    addWaypoint,
    resetRoute,
  };
}
