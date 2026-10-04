import { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import {
  fetchRecreationAlongRoute,
  type RecreationArea,
} from '@/utils/recreation';
import type { Route } from '@/utils/oneWayRoute';
import type { RouteStop } from '@/hooks/useRouteCalculation';

// How far from the route (meters) an area's edge may be to be suggested
const SUGGESTION_BUFFER_M = 200;

const NO_STOPS: RouteStop[] = [];

/**
 * Parks, skateparks, bathing spots etc. near the route that the user can add as stops.
 *
 * Works like useMonumentSuggestions: fetched once per route key from the first
 * route computed for it, so suggestions don't shift when stops are added. A selected
 * area becomes a stop at its point closest to the route, not at its centre.
 * Call `clear()` when the route is reset.
 */
export default function useRecreationSuggestions(
  route: Route | null,
  routeKey: string,
  onStopsChange: (stops: RouteStop[]) => void
) {
  const supabase = useSupabase();
  const [found, setFound] = useState<{
    key: string;
    items: RecreationArea[];
  }>();
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>();

  const suggestions = useMemo(
    () => (found?.key === routeKey ? found.items : []),
    [found, routeKey]
  );
  const selectedIds = useMemo(
    () => new Set(selection?.key === routeKey ? selection.ids : []),
    [selection, routeKey]
  );

  useEffect(() => {
    if (!route || !routeKey || found?.key === routeKey) return;

    const ctrl = new AbortController();
    fetchRecreationAlongRoute(supabase, route, SUGGESTION_BUFFER_M, ctrl.signal)
      .then((items) => setFound({ key: routeKey, items }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Recreation error:', e instanceof Error ? e.message : e);
      });

    return () => ctrl.abort();
  }, [route, routeKey, found, supabase]);

  const toggle = (id: number) => {
    const ids = selectedIds.has(id)
      ? [...selectedIds].filter((x) => x !== id)
      : [...selectedIds, id];
    setSelection({ key: routeKey, ids });
    onStopsChange(
      suggestions
        .filter((a) => ids.includes(a.id))
        .sort((a, b) => (a.routeFraction ?? 0) - (b.routeFraction ?? 0))
        .map((a) => ({
          ...(a.stop ?? { latitude: a.latitude, longitude: a.longitude }),
          routeFraction: a.routeFraction,
        }))
    );
  };

  const clear = () => {
    setSelection(undefined);
    onStopsChange(NO_STOPS);
  };

  return { suggestions, selectedIds, toggle, clear };
}

export type RecreationSuggestions = ReturnType<typeof useRecreationSuggestions>;
