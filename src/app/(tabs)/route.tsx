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
import {
  routeThrough,
  type Route,
  type RouteProfile,
} from '@/utils/routeThrough';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';
import RouteProfileToggle from '@/components/route-profile-toggle';
import useMonumentSuggestions from '@/hooks/useMonumentSuggestions';
import {
  MonumentSuggestionList,
  MonumentSuggestionMarkers,
} from '@/components/monument-suggestions';

// Configuration: easy to change start behavior in the future
const USE_USER_LOCATION_AS_START = true;
const MAX_WAYPOINTS = USE_USER_LOCATION_AS_START ? 1 : 2;

const INITIAL_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function RouteScreen() {
  const { granted, visibility, showModal, grantPermission, onAllow, onLater } =
    useLocationPermission();

  const mapRef = useRef<MapView>(null);
  const [start, setStart] = useState<LatLng | null>(null);
  const [waypoints, setWaypoints] = useState<LatLng[]>([]);
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<RouteProfile>('foot');
  const monuments = useMonumentSuggestions(route, waypoints);

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

    // Selected monuments become stops before the destination
    points.splice(points.length - 1, 0, ...monuments.stops);

    if (points.length < 2) {
      setRoute(null);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);

    routeThrough(points, ctrl.signal, profile)
      .then((r) => {
        setRoute(r);
        mapRef.current?.fitToCoordinates(r.coords, {
          edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
          animated: true,
        });
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        console.warn('Route error:', e instanceof Error ? e.message : e);
        setRoute(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [start, waypoints, monuments.stops, profile]);

  const onMapPress: ComponentProps<typeof MapView>['onPress'] = (e) => {
    if (waypoints.length >= MAX_WAYPOINTS) return;
    setWaypoints((w) => [...w, e.nativeEvent.coordinate]);
  };

  const handleReset = () => {
    setWaypoints([]);
    setRoute(null);
  };

  const getStatusText = () => {
    if (loading) return 'Calculating...';
    if (route) {
      const km = (route.distance / 1000).toFixed(1);
      const min = Math.round(route.duration / 60);
      return `${km} km · ${min} min`;
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
        <MonumentSuggestionMarkers {...monuments} />
        {route && (
          <Polyline
            coordinates={route.coords}
            strokeWidth={5}
            strokeColor='#2563eb'
          />
        )}
      </MapView>

      <View className='absolute right-4 bottom-8 left-4 gap-2 rounded-2xl bg-white p-4 shadow-lg'>
        <Text className='font-semibold'>{getStatusText()}</Text>
        <RouteProfileToggle
          profile={profile}
          onChange={setProfile}
        />
        <MonumentSuggestionList {...monuments} />
        <Pressable
          className='items-center rounded-xl bg-neutral-200 p-2'
          onPress={handleReset}>
          <Text>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}
