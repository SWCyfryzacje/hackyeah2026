import { useEffect, useMemo, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import { useSupabase } from '@/lib/supabase';
import { fetchMonumentsAlongRoute, type Monument } from '@/utils/monuments';
import type { Route } from '@/utils/oneWayRoute';

// How far from the route (meters) a monument may be to be suggested
const SUGGESTION_BUFFER_M = 300;

const NO_STOPS: LatLng[] = [];

/**
 * Monuments near the route that the user can add as stops.
 *
 * Suggestions are fetched once per set of waypoints, from the first route
 * computed for them (no stops yet), so they don't shift when stops are added.
 * Selecting a monument calls `onStopsChange` with the selected monuments in
 * the order they appear along the route; pass those as route stops.
 * Call `clear()` when the route is reset.
 */
export default function useMonumentSuggestions(
  route: Route | null,
  waypoints: LatLng[],
  onStopsChange: (stops: LatLng[]) => void
) {
  const supabase = useSupabase();
  const key = JSON.stringify(waypoints);

  const [found, setFound] = useState<{ key: string; items: Monument[] }>();
  const [selection, setSelection] = useState<{ key: string; ids: number[] }>();

  const suggestions = useMemo(
    () => (found?.key === key ? found.items : []),
    [found, key]
  );
  const selectedIds = useMemo(
    () => new Set(selection?.key === key ? selection.ids : []),
    [selection, key]
  );

  useEffect(() => {
    if (!route || found?.key === key) return;

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
        .map((m) => ({ latitude: m.latitude, longitude: m.longitude }))
    );
  };

  const clear = () => {
    setSelection(undefined);
    onStopsChange(NO_STOPS);
  };

  return { suggestions, selectedIds, toggle, clear };
}

export type MonumentSuggestions = ReturnType<typeof useMonumentSuggestions>;
