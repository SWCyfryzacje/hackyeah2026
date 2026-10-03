import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
} from 'react-native-maps';
import * as Location from 'expo-location';
import LocationModal from '@/components/location-modal';
import useLocationPermission from '@/hooks/useLocationPermission';
import { useRouteCalculation } from '@/hooks/useRouteCalculation';
import RouteControlPanel from '@/components/route/route-control-panel';
import { DEFAULT_LOOP_OPTIONS, INITIAL_REGION } from '@/constants/map';
import { StatusBar } from 'expo-status-bar';
import useMonumentSuggestions from '@/hooks/useMonumentSuggestions';
import {
  MonumentSuggestionList,
  MonumentSuggestionMarkers,
} from '@/components/monument-suggestions';
import CreateGroupRouteButton from '@/components/group-routes/create-group-route-button';

export default function RouteScreen() {
  const { granted, visibility, onAllow, onLater } = useLocationPermission();

  const mapRef = useRef<MapView>(null);
  const [start, setStart] = useState<LatLng | null>(null);
  const [monumentStops, setMonumentStops] = useState<LatLng[]>([]);

  const handleRouteCalculated = useCallback((coords: LatLng[]) => {
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 50, bottom: 120, left: 50 },
      animated: true,
    });
  }, []);

  const {
    waypoints,
    route,
    loop,
    activeRoute,
    error,
    loading,
    statusText,
    maxWaypoints,
    generateLoop,
    addWaypoint,
    resetRoute,
  } = useRouteCalculation({
    start,
    useUserLocationAsStart: true,
    onRouteCalculated: handleRouteCalculated,
    stops: monumentStops,
  });
  const monuments = useMonumentSuggestions(route, waypoints, setMonumentStops);

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

  const onMapPress: ComponentProps<typeof MapView>['onPress'] = (e) => {
    addWaypoint(e.nativeEvent.coordinate);
  };

  return (
    <View className='flex-1'>
      <StatusBar style='light' />

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
            title={maxWaypoints === 1 ? 'Destination' : `Waypoint ${i + 1}`}
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

        {loop && (
          <Polyline
            coordinates={loop.coords}
            strokeWidth={5}
            strokeColor='#16a34a'
          />
        )}
      </MapView>

      <RouteControlPanel
        statusText={statusText}
        isError={!!error}
        disabled={loading || !start}
        loopOptions={DEFAULT_LOOP_OPTIONS}
        onSelectLoop={(km) => {
          monuments.clear();
          generateLoop(km);
        }}
        onReset={() => {
          monuments.clear();
          resetRoute();
        }}>
        <MonumentSuggestionList {...monuments} />
        <CreateGroupRouteButton
          route={activeRoute}
          stops={monumentStops}
        />
      </RouteControlPanel>
    </View>
  );
}
