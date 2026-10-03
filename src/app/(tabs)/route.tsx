import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { routeBetween, type Route } from '@/utils/oneWayRoute';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';
import { loopOfLength, type LoopResult } from '@/utils/loopRoute';

// Configuration: easy to change start behavior in the future
const USE_USER_LOCATION_AS_START = true;
const MAX_WAYPOINTS = USE_USER_LOCATION_AS_START ? 1 : 2;

const INITIAL_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const LOOP_OPTIONS = [3, 5, 10]; // Loop lengths in kilometers

export default function RouteScreen() {
  const { granted, visibility, showModal, grantPermission, onAllow, onLater } =
    useLocationPermission();

  const mapRef = useRef<MapView>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [start, setStart] = useState<LatLng | null>(null);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [loop, setLoop] = useState<LoopResult | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showModal();
      } else {
        grantPermission();
      }
    })();
  }, [grantPermission, showModal]);

  // Fetch initial location when permission is granted
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

  // Point-to-point routing effect
  useEffect(() => {
    const points: LatLng[] = [];

    if (USE_USER_LOCATION_AS_START) {
      if (start) {
        points.push(start);
      }
      points.push(...waypoints);
    } else {
      points.push(...waypoints);
    }

    if (points.length < 2) {
      return;
    }

    let active = true;
    const ctrl = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      setLoop(null); // Clear any existing loop route

      try {
        const r = await routeBetween(points, ctrl.signal);

        if (!active) return;

        setRoute(r);

        mapRef.current?.fitToCoordinates(r.coords, {
          edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
          animated: true,
        });
      } catch (e: unknown) {
        if (!active) return;

        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Route calculation failed');
        setRoute(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      ctrl.abort();
    };
  }, [start, waypoints]);

  // Cleanup abort controller on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const generateLoop = async (km: number) => {
    if (!start) return;

    abortRef.current?.abort(); // Cancel any in-flight generation
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    setRoute(null);
    setWaypoints([]); // Clear waypoints when creating a loop

    try {
      const r = await loopOfLength({
        start,
        targetMeters: km * 1000,
        signal: ctrl.signal,
      });

      setLoop(r);

      mapRef.current?.fitToCoordinates(r.coords, {
        edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
        animated: true,
      });
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Could not generate loop route');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  const onMapPress: ComponentProps<typeof MapView>['onPress'] = (e) => {
    if (waypoints.length >= MAX_WAYPOINTS) return;
    setLoop(null); // Clear active loop when placing custom waypoints
    setError(null);
    setWaypoints((w) => [...w, e.nativeEvent.coordinate]);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setWaypoints([]);
    setRoute(null);
    setLoop(null);
    setError(null);
    setLoading(false);
  };

  const activeRoute = loop || route;

  const getStatusText = () => {
    if (loading) return loop ? 'Generating loop...' : 'Calculating route...';
    if (error) return error;

    if (activeRoute) {
      const km = (activeRoute.distance / 1000).toFixed(1);
      const min = Math.round(activeRoute.duration / 60);
      return `${loop ? 'Loop: ' : ''}${km} km · ${min} min`;
    }

    if (USE_USER_LOCATION_AS_START && !start) {
      return 'Waiting for location...';
    }

    if (waypoints.length < MAX_WAYPOINTS) {
      return MAX_WAYPOINTS === 1
        ? 'Tap map to set destination or pick a loop'
        : `Tap map to set waypoint ${waypoints.length + 1} of ${MAX_WAYPOINTS}`;
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
            title={MAX_WAYPOINTS === 1 ? 'Destination' : `Waypoint ${i + 1}`}
          />
        ))}

        {route && (
          <Polyline
            coordinates={route.coords}
            strokeWidth={5}
            strokeColor='#2563eb'
          />
        )}

        {loop && (
          <Polyline
            coordinates={loop.coords}
            strokeWidth={5}
            strokeColor='#16a34a'
          />
        )}
      </MapView>

      {/* Floating Bottom Control Panel */}
      <View className='absolute right-4 bottom-8 left-4 gap-3 rounded-2xl bg-white p-4 shadow-lg'>
        <Text
          className={`font-semibold ${
            error ? 'text-red-500' : 'text-neutral-900'
          }`}>
          {getStatusText()}
        </Text>

        {/* Quick Loop Route Generation */}
        <View className='flex-row gap-2'>
          {LOOP_OPTIONS.map((km) => (
            <Pressable
              key={km}
              disabled={loading || !start}
              className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
                loading || !start
                  ? 'bg-neutral-100 opacity-50'
                  : 'bg-blue-50 active:bg-blue-100'
              }`}
              onPress={() => generateLoop(km)}>
              <Text className='text-sm font-semibold text-blue-600'>
                {km} km loop
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          className='items-center justify-center rounded-xl bg-neutral-200 py-2.5 active:bg-neutral-300'
          onPress={handleReset}>
          <Text className='text-sm font-semibold text-neutral-800'>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}
