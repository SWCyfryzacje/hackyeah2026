import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase';
import {
  fetchGroupRouteLocation,
  groupRouteChannels,
  toGroupRouteLocation,
} from '@/lib/group-routes';
import {
  GROUP_ROUTE_LOCATION_INTERVAL_MS,
  type GroupRouteLocation,
  type GroupRouteLocationRow,
} from '@/types/group-routes';

export type UseLiveLocationResult = {
  /** null when the route isn't live, nothing was shared yet, or sharing ended */
  location: GroupRouteLocation | null;
};

/** Participant side: the creator's latest position, kept up to date via Realtime. */
export default function useLiveLocation(
  routeId: string
): UseLiveLocationResult {
  const supabase = useSupabase();
  const [location, setLocation] = useState<GroupRouteLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    // Bumped on every realtime event so a slower fetch can't overwrite it
    // (e.g. resurrect the marker after a DELETE).
    let version = 0;

    const refetch = () => {
      const started = version;
      fetchGroupRouteLocation(supabase, routeId)
        .then((l) => {
          if (!cancelled && started === version) setLocation(l);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          console.warn(
            'Live location error:',
            e instanceof Error ? e.message : e
          );
        });
    };

    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    refetch();

    // Unique topic: supabase-js reuses channels by topic, and removing a
    // shared one would kill the other subscriber.
    const topic = `${groupRouteChannels.location(routeId)}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_route_locations',
          filter: `route_id=eq.${routeId}`,
        },
        (payload) => {
          if (cancelled) return;
          version++;
          // DELETE carries only the PK — the route ended.
          setLocation(
            payload.eventType === 'DELETE'
              ? null
              : toGroupRouteLocation(payload.new as GroupRouteLocationRow)
          );
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          stopPolling();
          refetch(); // catch up on anything missed while connecting
        } else if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
          !poll
        ) {
          poll = setInterval(refetch, GROUP_ROUTE_LOCATION_INTERVAL_MS);
        }
      });

    return () => {
      cancelled = true;
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [routeId, supabase]);

  // Don't show the previous route's marker while the new one loads.
  return { location: location?.routeId === routeId ? location : null };
}
