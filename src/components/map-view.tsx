import MV, {
  type MapStyleElement,
  type MapViewProps,
  type Region,
} from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { type ReactNode, type Ref } from 'react';
import { INITIAL_REGION } from '@/constants/map';

export type MapViewWrapperProps = Omit<MapViewProps, 'initialRegion'> & {
  permission?: boolean;
  children?: ReactNode;
  initialRegion?: Region;
  ref?: Ref<MV>;
};

export const cleanLightStyle: MapStyleElement[] = [
  // base: slightly darker grey so white roads pop
  { elementType: 'geometry', stylers: [{ color: '#e8eaee' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#ffffff' }, { weight: 3 }],
  },

  // hide clutter
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    stylers: [{ visibility: 'off' }],
  },

  // roads: pure white with a thin outline, so they stand out from the base
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#d1d5db' }, { weight: 0.6 }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: '#fde9b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e9cf94' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels',
    stylers: [{ visibility: 'simplified' }],
  },

  // clearer parks and water
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: '#cfe8d5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#b9d7f5' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#5f7d9c' }],
  },

  // stronger city labels and borders
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#111827' }],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#c4c9d2' }],
  },
];

// Default provider: Google Maps on Android, Apple Maps on iOS — both work in Expo Go.
export default function MapView({
  permission = false,
  children,
  initialRegion = INITIAL_REGION,
  style = StyleSheet.absoluteFill,
  showsMyLocationButton = false,
  showsCompass = true,
  mapPadding = { top: 60, right: 5, bottom: 10, left: 5 },
  ref,
  ...rest
}: MapViewWrapperProps) {
  return (
    <MV
      ref={ref}
      style={style}
      customMapStyle={cleanLightStyle}
      initialRegion={initialRegion}
      showsUserLocation={permission}
      showsMyLocationButton={showsMyLocationButton}
      showsCompass={showsCompass}
      mapPadding={mapPadding}
      {...rest}>
      {children}
    </MV>
  );
}
