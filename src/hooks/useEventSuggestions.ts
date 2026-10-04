import { useMemo, useState } from 'react';
import type { LatLng } from 'react-native-maps';
import useMapEvents from '@/hooks/useMapEvents';
import {
  groupEventsByLocation,
  type EventHorizon,
  type MapEvent,
} from '@/utils/events';
import { locateOnRoute } from '@/utils/routeGeometry';
import type { Route } from '@/utils/oneWayRoute';
import type { RouteStop } from '@/hooks/useRouteCalculation';

// How far from the route (meters) an event may be to be suggested, as for monuments
const SUGGESTION_BUFFER_M = 300;

const NO_STOPS: RouteStop[] = [];

/** One event venue near the route; several events can share a place. */
export type EventSuggestion = {
  id: string; // location key
  events: MapEvent[]; // soonest first
  latitude: number;
  longitude: number;
  distanceM: number; // from the route
  routeFraction: number; // 0..1 position along the route
};

/**
 * Upcoming events near the route that the user can add as stops — the event
 * counterpart of `useMonumentSuggestions`.
 *
 * Suggestions come from the first route computed for a set of waypoints or loop
 * (no stops yet), so they don't shift when stops are added. Selecting an event
 * calls `onStopsChange` with the selected venues in route order; their events
 * are in `selectedEvents`.
 * Call `clear()` when the route is reset.
 */
export default function useEventSuggestions(
  route: Route | null,
  routeKey: string,
  horizon: EventHorizon,
  onStopsChange: (stops: RouteStop[]) => void
) {
  const events = useMapEvents(horizon);

  const [base, setBase] = useState<{ key: string; coords: LatLng[] }>();
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>();

  // Remember the first route for this key (adjusting state during render)
  if (route && routeKey && base?.key !== routeKey) {
    setBase({ key: routeKey, coords: route.coords });
  }
  const baseCoords = base?.key === routeKey ? base.coords : null;

  const suggestions = useMemo(() => {
    if (!baseCoords) return [];
    return groupEventsByLocation(events)
      .flatMap(([id, group]): EventSuggestion[] => {
        const [first] = group;
        const pos = locateOnRoute(first, baseCoords);
        if (!pos || pos.distanceM > SUGGESTION_BUFFER_M) return [];
        return [
          {
            id,
            events: group,
            latitude: first.latitude,
            longitude: first.longitude,
            ...pos,
          },
        ];
      })
      .sort((a, b) => a.routeFraction - b.routeFraction);
  }, [events, baseCoords]);

  const selectedIds = useMemo(
    () => new Set(selection?.key === routeKey ? selection.ids : []),
    [selection, routeKey]
  );

  // Events at the selected venues, in route order
  const selectedEvents = useMemo(
    () => suggestions.filter((s) => selectedIds.has(s.id)).map((s) => s.events),
    [suggestions, selectedIds]
  );

  const toggle = (id: string) => {
    const ids = selectedIds.has(id)
      ? [...selectedIds].filter((x) => x !== id)
      : [...selectedIds, id];
    setSelection({ key: routeKey, ids });
    onStopsChange(
      suggestions
        .filter((s) => ids.includes(s.id))
        .map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
          routeFraction: s.routeFraction,
        }))
    );
  };

  const clear = () => {
    setSelection(undefined);
    onStopsChange(NO_STOPS);
  };

  return { suggestions, selectedIds, selectedEvents, toggle, clear };
}

export type EventSuggestions = ReturnType<typeof useEventSuggestions>;
