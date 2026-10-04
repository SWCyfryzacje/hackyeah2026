import { useEffect, useMemo, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import { useSupabase } from '@/lib/supabase';
import useMonumentLevel from '@/hooks/useMonumentLevel';
import { fetchMonumentsAlongRoute, type Monument } from '@/utils/monuments';
import type { Route } from '@/utils/oneWayRoute';
import type { RouteStop } from '@/hooks/useRouteCalculation';

// How far from the route (meters) a monument may be to be suggested
const SUGGESTION_BUFFER_M = 300;

const NO_STOPS: RouteStop[] = [];

/**
 * Monuments near the route that the user can add as stops.
 *
 * Suggestions are fetched once per set of waypoints or loop route, from the first route
 * computed for them (no stops yet), so they don't shift when stops are added.
 * Selecting a monument calls `onStopsChange` with the selected monuments in
 * the order they appear along the route; pass those as route stops.
 * Call `clear()` when the route is reset.
 */
export default function useMonumentSuggestions(
  route: Route | null,
  routeKeyOrWaypoints: string | LatLng[],
  onStopsChange: (stops: RouteStop[]) => void
) {
  const supabase = useSupabase();
  const key =
    typeof routeKeyOrWaypoints === 'string'
      ? routeKeyOrWaypoints
      : JSON.stringify(routeKeyOrWaypoints);

  const [found, setFound] = useState<{ key: string; items: Monument[] }>();
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>();

  const [minScore] = useMonumentLevel();

  const selectedIds = useMemo(
    () => new Set(selection?.key === key ? selection.ids : []),
    [selection, key]
  );
  // Filtered by the chosen level; already selected stops stay visible
  const suggestions = useMemo(
    () =>
      (found?.key === key ? found.items : []).filter(
        (m) => m.score >= minScore || selectedIds.has(m.id)
      ),
    [found, key, minScore, selectedIds]
  );

  useEffect(() => {
    if (!route || !key || key === '[]' || found?.key === key) return;

    const ctrl = new AbortController();
    fetchMonumentsAlongRoute(supabase, route, SUGGESTION_BUFFER_M, ctrl.signal)
      .then((items) => setFound({ key, items }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Monuments error:', e instanceof Error ? e.message : e);
      });

    return () => ctrl.abort();
  }, [route, key, found, supabase]);

  const toggle = (id: number) => {
    const ids = selectedIds.has(id)
      ? [...selectedIds].filter((x) => x !== id)
      : [...selectedIds, id];
    setSelection({ key, ids });
    onStopsChange(
      suggestions
        .filter((m) => ids.includes(m.id))
        .sort((a, b) => (a.routeFraction ?? 0) - (b.routeFraction ?? 0))
        .map((m) => ({
          latitude: m.latitude,
          longitude: m.longitude,
          routeFraction: m.routeFraction,
        }))
    );
  };

  const clear = () => {
    setSelection(undefined);
    onStopsChange(NO_STOPS);
  };

  // Monuments near the route at any level (0 = nothing to suggest)
  const total = found?.key === key ? found.items.length : 0;

  return { suggestions, total, selectedIds, toggle, clear };
}

export type MonumentSuggestions = ReturnType<typeof useMonumentSuggestions>;
