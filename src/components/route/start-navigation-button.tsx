import React from 'react';
import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LatLng } from 'react-native-maps';
import type { LoopResult } from '@/utils/loopRoute';
import type { RouteProfile } from '@/utils/oneWayRoute';
import type { RouteStop, Waypoint } from '@/hooks/useRouteCalculation';
import { openGoogleMapsNavigation } from '@/utils/google-maps';

type Props = {
  start: LatLng | null;
  route: { coords: LatLng[]; distance: number; duration: number } | null;
  loop: LoopResult | null;
  waypoints?: Waypoint[];
  stops?: RouteStop[];
  profile?: RouteProfile;
};

function isSameCoord(a: LatLng, b: LatLng): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < 0.00001 &&
    Math.abs(a.longitude - b.longitude) < 0.00001
  );
}

export default function StartNavigationButton({
  start,
  route,
  loop,
  waypoints = [],
  stops = [],
  profile = 'walking',
}: Props) {
  const disabled = !route || route.coords.length < 2;

  const handlePress = async () => {
    if (!route || disabled) return;

    const origin: LatLng = start || route.coords[0];
    let destination: LatLng;
    let intermediateWaypoints: LatLng[] = [];

    if (loop) {
      destination = start || route.coords[route.coords.length - 1];

      const rawWaypoints: LatLng[] = [];

      if (loop.ring && loop.ring.length > 0) {
        rawWaypoints.push(...loop.ring);
      }
      if (stops.length > 0) {
        rawWaypoints.push(
          ...stops.map((s) => ({
            latitude: s.latitude,
            longitude: s.longitude,
          }))
        );
      }

      // If loop has no ring or stops, sample milestone points along geometry
      if (rawWaypoints.length === 0 && route.coords.length >= 4) {
        const c = route.coords;
        const q1 = c[Math.floor(c.length * 0.25)];
        const q2 = c[Math.floor(c.length * 0.5)];
        const q3 = c[Math.floor(c.length * 0.75)];
        rawWaypoints.push(q1, q2, q3);
      }

      intermediateWaypoints = rawWaypoints;
    } else {
      destination =
        waypoints.length > 0
          ? waypoints[waypoints.length - 1]
          : route.coords[route.coords.length - 1];

      const intermediateExplicit =
        waypoints.length > 1 ? waypoints.slice(0, -1) : [];
      const intermediateStops = stops.map((s) => ({
        latitude: s.latitude,
        longitude: s.longitude,
      }));

      intermediateWaypoints = [...intermediateExplicit, ...intermediateStops];
    }

    // Exclude points that match origin or destination
    const cleanWaypoints = intermediateWaypoints.filter(
      (wp) => !isSameCoord(wp, origin) && !isSameCoord(wp, destination)
    );

    await openGoogleMapsNavigation({
      origin,
      destination,
      waypoints: cleanWaypoints,
      profile,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`h-11 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 active:bg-emerald-700 active:scale-[0.99] shadow-xs ${
        disabled ? 'opacity-40' : ''
      }`}>
      <Ionicons
        name='navigate'
        size={16}
        color='#ffffff'
      />
      <Text className='text-sm font-bold text-white'>
        Rozpocznij nawigację
      </Text>
    </Pressable>
  );
}
