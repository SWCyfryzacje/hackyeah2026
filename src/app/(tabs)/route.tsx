import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { View } from 'react-native';
import RNMapView, { Marker, Polyline, type LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import LocationModal from '@/components/location-modal';
import useLocationPermission from '@/hooks/useLocationPermission';
import MapView from '@/components/map-view';
import {
  useRouteCalculation,
  type RouteStop,
} from '@/hooks/useRouteCalculation';
import RouteControlPanel from '@/components/route/route-control-panel';
import { DEFAULT_LOOP_OPTIONS } from '@/constants/map';
import { StatusBar } from 'expo-status-bar';
import useMonumentSuggestions from '@/hooks/useMonumentSuggestions';
import {
  MonumentSuggestionList,
  MonumentSuggestionMarkers,
} from '@/components/monument-suggestions';
import CreateGroupRouteButton from '@/components/group-routes/create-group-route-button';
import useEventSuggestions from '@/hooks/useEventSuggestions';
import {
  EventSuggestionList,
  EventSuggestionMarkers,
} from '@/components/event-suggestions';
import MapLayerToggles, { MapLayerGate } from '@/components/map-layer-toggles';
import { MAX_ROUTE_DAYS_AHEAD } from '@/components/group-routes/new-group-route-schema';
import useRouteObstacles from '@/hooks/useRouteObstacles';
import {
  RouteObstacleCard,
  RouteObstacleOverlays,
} from '@/components/route-obstacles';

export default function RouteScreen() {
  const { granted, visibility, onAllow, onLater } = useLocationPermission();

  const mapRef = useRef<RNMapView>(null);
  const [start, setStart] = useState<LatLng | null>(null);
  const [monumentStops, setMonumentStops] = useState<RouteStop[]>([]);
  const [eventStops, setEventStops] = useState<RouteStop[]>([]);
  // Selected monuments and events, in order along the route
  const stops = useMemo(
    () =>
      [...monumentStops, ...eventStops].sort(
        (a, b) => (a.routeFraction ?? 0) - (b.routeFraction ?? 0)
      ),
    [monumentStops, eventStops]
  );

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
    stops,
  });

  const routeKey = loop
    ? `loop-${loop.bearing}`
    : waypoints.length > 0
      ? JSON.stringify(waypoints)
      : '';

  const monuments = useMonumentSuggestions(
    activeRoute,
    routeKey,
    setMonumentStops
  );
  const events = useEventSuggestions(
    activeRoute,
    routeKey,
    { days: MAX_ROUTE_DAYS_AHEAD },
    setEventStops
  );
  // Obstacles nearby; the route goes around them, otherwise unchanged
  const obstacles = useRouteObstacles(activeRoute);
  const plannedRoute = obstacles.rerouted ?? activeRoute;

  // Fetch initial location when permission is granted
  useEffect(() => {
    if (!granted) return;

    let cancelled = false;

    (async () => {
      try {
        // Step 1: Instantly retrieve cached location if available
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 60000,
        });

        if (!cancelled && lastKnown) {
          const cachedLoc = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };

          setStart(cachedLoc);
          mapRef.current?.animateToRegion({
            ...cachedLoc,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }

        // Step 2: Concurrently fetch fresh position with balanced accuracy for fast resolution
        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          const freshLoc = {
            latitude: fresh.coords.latitude,
            longitude: fresh.coords.longitude,
          };

          setStart(freshLoc);
          mapRef.current?.animateToRegion({
            ...freshLoc,
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
    const action = (e.nativeEvent as { action?: string })?.action;
    if (action === 'marker-press' || action === 'callout-press') return;
    if (loop || activeRoute) return;
    addWaypoint(e.nativeEvent.coordinate);
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
        permission={granted}
        onPress={onMapPress}
        onLongPress={(e) => obstacles.report(e.nativeEvent.coordinate)}>
        {waypoints.map((w, i) => (
          <Marker
            key={`${w.latitude}-${w.longitude}-${i}`}
            coordinate={w}
            title={maxWaypoints === 1 ? 'Destination' : `Waypoint ${i + 1}`}
          />
        ))}

        <MapLayerGate layer='monuments'>
          <MonumentSuggestionMarkers {...monuments} />
        </MapLayerGate>
        <MapLayerGate layer='events'>
          <EventSuggestionMarkers {...events} />
        </MapLayerGate>

        <Polyline
          coordinates={route?.coords ?? []}
          strokeWidth={route ? 5 : 0}
          strokeColor={route ? '#2563eb' : 'transparent'}
        />

        <Polyline
          coordinates={loop?.coords ?? []}
          strokeWidth={loop ? 5 : 0}
          strokeColor={loop ? '#16a34a' : 'transparent'}
        />

        <RouteObstacleOverlays {...obstacles} />
      </MapView>

      <MapLayerToggles className='absolute top-14 left-4' />

      <RouteControlPanel
        statusText={statusText}
        isError={!!error}
        disabled={loading || !start}
        loopOptions={DEFAULT_LOOP_OPTIONS}
        onSelectLoop={(km) => {
          monuments.clear();
          events.clear();
          generateLoop(km);
        }}
        onReset={() => {
          monuments.clear();
          events.clear();
          resetRoute();
        }}>
        <MonumentSuggestionList {...monuments} />
        <RouteObstacleCard {...obstacles} />
        <EventSuggestionList {...events} />
        <CreateGroupRouteButton
          route={plannedRoute}
          stops={stops}
        />
      </RouteControlPanel>
    </View>
  );
}
