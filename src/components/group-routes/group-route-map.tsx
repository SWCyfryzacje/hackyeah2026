import { useRef } from 'react';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import type { GroupRoute } from '@/types/group-routes';
import LiveLocationMarker from './live-location-marker';

type Props = {
  route: GroupRoute;
  /** Show the creator's live position (members of a live route only) */
  showLive: boolean;
};

const EDGE_PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

/** Region covering all points, so the map starts roughly framed before fitting. */
function regionFor(points: LatLng[]): Region {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.01),
  };
}

/** Route geometry with start/stop markers and the creator's live marker. */
export default function GroupRouteMap({ route, showLive }: Props) {
  const mapRef = useRef<MapView>(null);
  const points = route.geometry.length > 0 ? route.geometry : [route.start];

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      provider={PROVIDER_GOOGLE}
      initialRegion={regionFor(points)}
      onMapReady={() =>
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: EDGE_PADDING,
          animated: false,
        })
      }>
      <Polyline
        coordinates={route.geometry}
        strokeWidth={5}
        strokeColor='#2563eb'
      />
      <Marker
        coordinate={route.start}
        title='Start'
        pinColor='#16a34a'
      />
      {route.stops.map((s, i) => (
        <Marker
          key={`${s.latitude}-${s.longitude}-${i}`}
          coordinate={s}
          title={`Przystanek ${i + 1}`}
          pinColor='#d97706'
        />
      ))}
      {showLive && <LiveLocationMarker routeId={route.id} />}
    </MapView>
  );
}
