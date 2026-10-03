import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import { fetchUpcomingEvents } from '@/lib/group-routes';
import type { GroupRouteEvent } from '@/types/group-routes';

/** Events that haven't ended yet, for linking a new route to one. */
export default function useUpcomingEvents() {
  const supabase = useSupabase();
  const [events, setEvents] = useState<GroupRouteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchUpcomingEvents(supabase)
      .then((next) => {
        if (!active) return;
        setEvents(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(
          e instanceof Error ? e.message : 'Nie udało się pobrać wydarzeń.'
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [supabase]);

  return { events, loading, error };
}
