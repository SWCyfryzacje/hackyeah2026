import { useEffect, useState } from 'react';
import type { Region } from 'react-native-maps';
import { useSupabase } from '@/lib/supabase';
import useMapLayers from '@/hooks/useMapLayers';
import { RECREATION_ZOOM_LEVELS } from '@/constants/recreation';
import { regionRadiusM } from '@/utils/monuments';
import { fetchRecreationNear, type RecreationArea } from '@/utils/recreation';

const REGION_DEBOUNCE_MS = 500;

// Kraków, until the map reports its first region
const DEFAULT_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

/**
 * Recreation areas in the visible map area. Pass `onRegionChangeComplete`
 * to the map; areas are refetched when the user stops panning. Which categories
 * are shown (and whether outlines are) depends on the zoom level.
 */
export default function useNearbyRecreation() {
  const supabase = useSupabase();
  const [{ recreation: visible }] = useMapLayers();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [areas, setAreas] = useState<RecreationArea[]>([]);

  useEffect(() => {
    if (!visible) return;

    const zoom = RECREATION_ZOOM_LEVELS.find(
      (z) => region.latitudeDelta <= z.maxLatitudeDelta
    )!;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchRecreationNear(
        supabase,
        region,
        regionRadiusM(region.latitudeDelta),
        { categories: zoom.categories, withShapes: zoom.withShapes },
        ctrl.signal
      )
        .then(setAreas)
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          console.warn('Recreation error:', e instanceof Error ? e.message : e);
        });
    }, REGION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [region, supabase, visible]);

  return { areas, onRegionChangeComplete: setRegion };
}
