import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  routeThrough,
  type Route,
  type RouteProfile,
} from '@/utils/routeThrough';
import { fetchMonumentsAlongRoute, type Monument } from '@/utils/monuments';
import MonumentMarker, { formatDistance } from '@/components/monument-marker';
import { useSupabase } from '@/lib/supabase';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';

// Configuration: easy to change start behavior in the future
const USE_USER_LOCATION_AS_START = true;
const MAX_WAYPOINTS = USE_USER_LOCATION_AS_START ? 1 : 2;

// How far from the route (meters) a monument may be to be suggested
const SUGGESTION_BUFFER_M = 300;

const INITIAL_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

export default function RouteScreen() {
  const { granted, visibility, showModal, grantPermission, onAllow, onLater } =
    useLocationPermission();
  const supabase = useSupabase();

  const mapRef = useRef<MapView>(null);
  const [start, setStart] = useState<LatLng | null>(null);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [profile, setProfile] = useState<RouteProfile>('foot');
  // Async results are stored together with the input they were computed for,
  // so stale results are ignored instead of being reset inside effects.
  // The base route goes through the user's points only; suggestions come from
  // it so they don't shift when monuments get added as stops.
  const [base, setBase] = useState<{ key: string; route: Route | null }>();
  const [found, setFound] = useState<{ base: Route; items: Monument[] }>();
  const [selection, setSelection] = useState<{ base: Route; ids: number[] }>();
  const [withStops, setWithStops] = useState<{
    key: string;
    route: Route | null;
  }>();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showModal();
      } else {
        grantPermission();
      }
    })();
  }, []);

  useEffect(() => {
    if (!granted) return;

    let cancelled = false;

    (async () => {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          const userLoc = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          setStart(userLoc);
          mapRef.current?.animateToRegion({
            ...userLoc,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch (e) {
        console.warn('Location error:', e instanceof Error ? e.message : e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [granted]);

  const basePoints: LatLng[] = [];
  if (USE_USER_LOCATION_AS_START && start) basePoints.push(start);
  basePoints.push(...waypoints);

  const baseKey =
    basePoints.length >= 2 ? `${profile}|${JSON.stringify(basePoints)}` : null;
  const baseRoute = baseKey && base?.key === baseKey ? base.route : null;

  const suggestions =
    baseRoute && found?.base === baseRoute ? found.items : [];
  const selectedIds = new Set(
    baseRoute && selection?.base === baseRoute ? selection.ids : []
  );

  // Selected monuments go before the destination, in the order they appear
  // along the base route.
  const stops = suggestions
    .filter((m) => selectedIds.has(m.id))
    .sort((a, b) => (a.routeFraction ?? 0) - (b.routeFraction ?? 0))
    .map((m) => ({ latitude: m.latitude, longitude: m.longitude }));
  const stopsKey =
    baseKey && stops.length > 0 ? `${baseKey}|${JSON.stringify(stops)}` : null;

  const route =
    (stopsKey && withStops?.key === stopsKey && withStops.route) || baseRoute;
  const loading =
    (baseKey !== null && base?.key !== baseKey) ||
    (stopsKey !== null && withStops?.key !== stopsKey);

  // 1. Base route through the user's points.
  useEffect(() => {
    if (!baseKey) return;

    const ctrl = new AbortController();
    routeThrough(basePoints, ctrl.signal, profile)
      .then((r) => setBase({ key: baseKey, route: r }))
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        console.warn('Route error:', e instanceof Error ? e.message : e);
        setBase({ key: baseKey, route: null });
      });

    return () => ctrl.abort();
  }, [baseKey]);

  // 2. Monuments near the base route.
  useEffect(() => {
    if (!baseRoute) return;

    const ctrl = new AbortController();
    fetchMonumentsAlongRoute(
      supabase,
      baseRoute,
      SUGGESTION_BUFFER_M,
      ctrl.signal
    )
      .then((items) => setFound({ base: baseRoute, items }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        console.warn('Monuments error:', e instanceof Error ? e.message : e);
      });

    return () => ctrl.abort();
  }, [baseRoute, supabase]);

  // 3. Route through the selected monuments.
  useEffect(() => {
    if (!stopsKey) return;

    const points = [
      ...basePoints.slice(0, -1),
      ...stops,
      basePoints[basePoints.length - 1],
    ];

    const ctrl = new AbortController();
    routeThrough(points, ctrl.signal, profile)
      .then((r) => setWithStops({ key: stopsKey, route: r }))
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        console.warn('Route error:', e instanceof Error ? e.message : e);
        setWithStops({ key: stopsKey, route: null });
      });

    return () => ctrl.abort();
  }, [stopsKey]);

  useEffect(() => {
    if (!route) return;
    mapRef.current?.fitToCoordinates(route.coords, {
      edgePadding: { top: 80, right: 50, bottom: 320, left: 50 },
      animated: true,
    });
  }, [route]);

  const onMapPress: ComponentProps<typeof MapView>['onPress'] = (e) => {
    // Taps on markers also bubble up as map presses on iOS
    if (e.nativeEvent.action === 'marker-press') return;
    if (waypoints.length >= MAX_WAYPOINTS) return;
    setWaypoints((w) => [...w, e.nativeEvent.coordinate]);
  };

  const toggleMonument = (id: number) => {
    if (!baseRoute) return;
    const ids = selectedIds.has(id)
      ? [...selectedIds].filter((x) => x !== id)
      : [...selectedIds, id];
    setSelection({ base: baseRoute, ids });
  };

  const handleReset = () => {
    setWaypoints([]);
  };

  const getStatusText = () => {
    if (loading) return 'Calculating...';
    if (route) {
      const km = (route.distance / 1000).toFixed(1);
      const min = Math.round(route.duration / 60);
      const n = selectedIds.size;
      return `${km} km · ${min} min${n ? ` · ${n} monument${n > 1 ? 's' : ''}` : ''}`;
    }
    if (USE_USER_LOCATION_AS_START && !start) {
      return 'Waiting for location...';
    }
    if (waypoints.length < MAX_WAYPOINTS) {
      if (MAX_WAYPOINTS === 1) {
        return 'Tap the map to set destination';
      }
      return `Tap the map to set waypoint ${waypoints.length + 1} of ${MAX_WAYPOINTS}`;
    }
    return 'No route found';
  };

  return (
    <View className='flex-1'>
      <LocationModal
        visible={visibility}
        onAllow={onAllow}
        onLater={onLater}
      />

      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={INITIAL_REGION}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={granted}
        onPress={onMapPress}>
        {waypoints.map((w, i) => (
          <Marker
            key={`${w.latitude}-${w.longitude}-${i}`}
            coordinate={w}
            title={
              MAX_WAYPOINTS === 1 ? 'Destination' : `Waypoint ${i + 1}`
            }
          />
        ))}
        {suggestions.map((m) => (
          <MonumentMarker
            key={m.id}
            monument={m}
            color={selectedIds.has(m.id) ? '#16a34a' : '#d97706'}
            onPress={() => toggleMonument(m.id)}
          />
        ))}
        {route && (
          <Polyline
            coordinates={route.coords}
            strokeWidth={5}
            strokeColor='#2563eb'
          />
        )}
      </MapView>

      <View className='absolute right-4 bottom-8 left-4 gap-2 rounded-2xl bg-white p-4 shadow-lg'>
        <View className='flex-row items-center justify-between'>
          <Text className='font-semibold'>{getStatusText()}</Text>
          <View className='flex-row rounded-xl bg-neutral-200 p-1'>
            {(['foot', 'driving'] as const).map((p) => (
              <Pressable
                key={p}
                className={`rounded-lg px-2 py-1 ${profile === p ? 'bg-white' : ''}`}
                onPress={() => setProfile(p)}>
                <Ionicons
                  name={p === 'foot' ? 'walk' : 'car'}
                  size={18}
                  color={profile === p ? '#2563eb' : '#525252'}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {suggestions.length > 0 && (
          <>
            <Text className='text-sm text-neutral-500'>
              Monuments along the way — tap to add
            </Text>
            <ScrollView className='max-h-40'>
              {suggestions.map((m) => {
                const selected = selectedIds.has(m.id);
                return (
                  <Pressable
                    key={m.id}
                    className='flex-row items-center gap-2 py-1.5'
                    onPress={() => toggleMonument(m.id)}>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={selected ? '#16a34a' : '#a3a3a3'}
                    />
                    <Text
                      className='flex-1'
                      numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text className='text-xs text-neutral-500'>
                      {formatDistance(m.distanceM)} off
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        <Pressable
          className='items-center rounded-xl bg-neutral-200 p-2'
          onPress={handleReset}>
          <Text>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}
