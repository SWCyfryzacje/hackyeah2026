import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import {
  fetchMapEvents,
  type EventHorizon,
  type MapEvent,
} from '@/utils/events';

/** Geocoded events between today and the end of the horizon, loaded once per screen. */
export default function useMapEvents(horizon: EventHorizon) {
  const supabase = useSupabase();
  const [events, setEvents] = useState<MapEvent[]>([]);
  // Primitive deps, so an inline `{ days: 2 }` doesn't refetch on every render.
  const days = 'days' in horizon ? horizon.days : undefined;
  const months = 'months' in horizon ? horizon.months : undefined;

  useEffect(() => {
    const ctrl = new AbortController();
    const h: EventHorizon =
      days !== undefined ? { days } : { months: months ?? 0 };

    fetchMapEvents(supabase, h, ctrl.signal)
      .then(setEvents)
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Events error:', e instanceof Error ? e.message : e);
      });

    return () => ctrl.abort();
  }, [supabase, days, months]);

  return events;
}
