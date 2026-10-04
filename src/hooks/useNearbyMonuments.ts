import { useEffect, useMemo, useState } from 'react';
import type { Region } from 'react-native-maps';
import { useSupabase } from '@/lib/supabase';
import useMonumentLevel from '@/hooks/useMonumentLevel';
import {
  fetchMonumentsNear,
  regionRadiusM,
  type Monument,
} from '@/utils/monuments';

const REGION_DEBOUNCE_MS = 500;

// Kraków, until the map reports its first region
const DEFAULT_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

/**
 * Monuments in the visible map area. Pass `onRegionChangeComplete`
 * to the map; monuments are refetched when the user stops panning.
 */
export default function useNearbyMonuments() {
  const supabase = useSupabase();
  const [minScore] = useMonumentLevel();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [allMonuments, setAllMonuments] = useState<Monument[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchMonumentsNear(
        supabase,
        region,
        regionRadiusM(region.latitudeDelta),
        0,
        ctrl.signal
      )
        .then(setAllMonuments)
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          console.warn('Monuments error:', e instanceof Error ? e.message : e);
        });
    }, REGION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [region, supabase]);

  const monuments = useMemo(
    () => allMonuments.filter((m) => m.score >= minScore),
    [allMonuments, minScore]
  );

  return { monuments, onRegionChangeComplete: setRegion };
}
