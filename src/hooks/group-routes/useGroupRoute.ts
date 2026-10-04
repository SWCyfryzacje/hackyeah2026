import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { useSupabase } from '@/lib/supabase';
import {
  fetchGroupRoute,
  fetchGroupRouteParticipants,
  groupRouteChannels,
} from '@/lib/group-routes';
import type {
  GroupRoute,
  GroupRouteParticipant,
  GroupRouteRole,
} from '@/types/group-routes';

const POLL_INTERVAL_MS = 10_000;

/**
 * One shared route with its participants, kept in sync via Realtime
 * (status changes, joins/leaves). Falls back to polling when Realtime fails.
 */
export default function useGroupRoute(id: string) {
  const supabase = useSupabase();
  const { userId } = useAuth();

  const [route, setRoute] = useState<GroupRoute | null>(null);
  const [participants, setParticipants] = useState<GroupRouteParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ignore responses that arrive after a newer request was started
  const routeRequest = useRef(0);
  const participantsRequest = useRef(0);

  // setState only in promise callbacks (keeps react-hooks/set-state-in-effect happy)
  const loadRoute = useCallback(() => {
    const request = ++routeRequest.current;
    return fetchGroupRoute(supabase, id).then(
      (next) => {
        if (request !== routeRequest.current) return;
        setRoute(next);
        setError(null);
      },
      (e: unknown) => {
        if (request !== routeRequest.current) return;
        setError(
          e instanceof Error ? e.message : 'Nie udało się pobrać trasy.'
        );
      }
    );
  }, [supabase, id]);

  // Throws for non-members (RLS) -> treated as "no participants visible"
  const loadParticipants = useCallback(() => {
    const request = ++participantsRequest.current;
    return fetchGroupRouteParticipants(supabase, id)
      .catch((): GroupRouteParticipant[] => [])
      .then((next) => {
        if (request === participantsRequest.current) setParticipants(next);
      });
  }, [supabase, id]);

  const refresh = useCallback(
    () =>
      Promise.all([loadRoute(), loadParticipants()]).then(() =>
        setLoading(false)
      ),
    [loadRoute, loadParticipants]
  );

  // Initial state first, then subscribe (ARCHITECTURE §3)
  useEffect(() => {
    if (!id) return;
    void refresh();

    let poll: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    // Unique topic: supabase-js reuses channels with the same name
    const topic = `${groupRouteChannels.route(id)}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_routes',
          filter: `id=eq.${id}`,
        },
        () => void loadRoute()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_route_participants',
          filter: `route_id=eq.${id}`,
        },
        () => void loadParticipants()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_route_participants',
          filter: `route_id=eq.${id}`,
        },
        // Also fires when the creator deletes the whole route (cascade)
        () => void refresh()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          stopPolling();
        } else if (
          (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') &&
          !poll
        ) {
          poll = setInterval(() => void refresh(), POLL_INTERVAL_MS);
        }
      });

    return () => {
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [supabase, id, loadRoute, loadParticipants, refresh]);

  const myRole: GroupRouteRole | null =
    participants.find((p) => p.userId === userId)?.role ?? null;

  return { route, participants, myRole, loading, error, refresh };
}
