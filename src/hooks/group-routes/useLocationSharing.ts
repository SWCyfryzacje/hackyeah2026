import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useSupabase } from '@/lib/supabase';
import { updateGroupRouteLocation } from '@/lib/group-routes';
import { GROUP_ROUTE_LOCATION_INTERVAL_MS } from '@/types/group-routes';

export type UseLocationSharingOptions = {
  routeId: string;
  /** true only for the creator while the route is live */
  enabled: boolean;
};

export type UseLocationSharingResult = {
  error: string | null;
  lastSentAt: Date | null;
};

const PERMISSION_ERROR =
  'Brak zgody na lokalizację — uczestnicy nie widzą Twojej pozycji.';
const WATCH_ERROR =
  'Nie udało się odczytać lokalizacji — sprawdź, czy GPS jest włączony.';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Creator side: while `enabled` and the app is in the foreground, sends the
 * current position every GROUP_ROUTE_LOCATION_INTERVAL_MS via
 * update_group_route_location.
 */
export default function useLocationSharing({
  routeId,
  enabled,
}: UseLocationSharingOptions): UseLocationSharingResult {
  const supabase = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [appActive, setAppActive] = useState(
    AppState.currentState === 'active'
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) =>
      setAppActive(s === 'active')
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !appActive) return;

    let cancelled = false;
    let watch: Location.LocationSubscription | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let latest: Location.LocationObjectCoords | null = null;
    let sending = false;

    const send = async () => {
      if (cancelled || sending || !latest) return;
      sending = true;
      const { latitude, longitude, accuracy } = latest;
      try {
        await updateGroupRouteLocation(supabase, routeId, {
          latitude,
          longitude,
          accuracy,
        });
        if (cancelled) return;
        setLastSentAt(new Date());
        setError(null);
      } catch (e) {
        if (!cancelled) setError(`Nie udało się wysłać pozycji: ${message(e)}`);
      } finally {
        sending = false;
      }
    };

    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted' && !cancelled)
          ({ status } = await Location.requestForegroundPermissionsAsync());
        if (cancelled) return;
        if (status !== 'granted') {
          setError(PERMISSION_ERROR);
          return;
        }

        // iOS ignores timeInterval, so the watch only keeps the latest fix
        // and the timer below decides when to send it.
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: GROUP_ROUTE_LOCATION_INTERVAL_MS,
            distanceInterval: 0,
          },
          (loc) => {
            const first = !latest;
            latest = loc.coords;
            if (first) void send();
          }
        );
        if (cancelled) {
          sub.remove();
          return;
        }
        watch = sub;
        timer = setInterval(
          () => void send(),
          GROUP_ROUTE_LOCATION_INTERVAL_MS
        );
      } catch (e) {
        console.warn('Location sharing error:', message(e));
        if (!cancelled) setError(WATCH_ERROR);
      }
    })();

    return () => {
      cancelled = true;
      watch?.remove();
      if (timer) clearInterval(timer);
    };
  }, [enabled, appActive, routeId, supabase]);

  // A stale error from a previous live session shouldn't linger.
  return { error: enabled ? error : null, lastSentAt };
}
