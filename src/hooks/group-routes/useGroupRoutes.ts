import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSupabase } from '@/lib/supabase';
import { fetchGroupRoutes } from '@/lib/group-routes';
import type { GroupRouteListItem } from '@/types/group-routes';

/** Shared routes for the "Razem" tab; refetched whenever the screen gains focus. */
export default function useGroupRoutes() {
  const supabase = useSupabase();
  const [routes, setRoutes] = useState<GroupRouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ignore responses that arrive after a newer request was started
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    try {
      const next = await fetchGroupRoutes(supabase);
      if (request !== requestRef.current) return;
      setRoutes(next);
      setError(null);
    } catch (e) {
      if (request !== requestRef.current) return;
      setError(e instanceof Error ? e.message : 'Nie udało się pobrać tras.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [supabase]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { routes, loading, error, refresh };
}
