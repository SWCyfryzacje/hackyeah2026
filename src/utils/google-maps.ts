import { Alert, Linking } from 'react-native';
import type { LatLng } from 'react-native-maps';
import type { RouteProfile } from '@/utils/oneWayRoute';

type NavigationParams = {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  profile?: RouteProfile;
};

/**
 * Downsamples waypoints to ensure we do not exceed Google Maps URL limits (up to 9 intermediate waypoints).
 */
export function downsampleWaypoints(points: LatLng[], max = 9): LatLng[] {
  if (points.length <= max) return points;
  if (max <= 0) return [];
  if (max === 1) return [points[0]];

  const result: LatLng[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }
  return result;
}

/**
 * Builds Google Maps navigation / directions URL supporting waypoints and profile.
 */
export function buildGoogleMapsUrl({
  origin,
  destination,
  waypoints = [],
  profile = 'walking',
}: NavigationParams): string {
  const originStr = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`;
  const destStr = `${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`;
  const travelMode = profile === 'driving' ? 'driving' : 'walking';

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=${travelMode}&dir_action=navigate`;

  if (waypoints.length > 0) {
    const capped = downsampleWaypoints(waypoints, 9);
    const waypointsStr = capped
      .map((wp) => `${wp.latitude.toFixed(6)},${wp.longitude.toFixed(6)}`)
      .join('%7C');
    url += `&waypoints=${waypointsStr}`;
  }

  return url;
}

/**
 * Safely opens Google Maps with route and waypoints without throwing unhandled exceptions.
 */
export async function openGoogleMapsNavigation(
  params: NavigationParams
): Promise<void> {
  const url = buildGoogleMapsUrl(params);

  try {
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback: try opening standard web directions without dir_action
      const fallbackUrl = url.replace('&dir_action=navigate', '');
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    console.warn('Failed to open Google Maps navigation:', error);
    Alert.alert(
      'Błąd nawigacji',
      'Nie udało się otworzyć Map Google. Sprawdź, czy masz zainstalowaną aplikację lub dostęp do przeglądarki.'
    );
  }
}
