import type { LatLng, Region } from 'react-native-maps';

export const DEFAULT_COORDINATES: LatLng = {
  latitude: 50.0614,
  longitude: 19.9366,
};

export const DEFAULT_DELTAS = {
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export const INITIAL_REGION: Region = {
  ...DEFAULT_COORDINATES,
  ...DEFAULT_DELTAS,
};

export const DEFAULT_LOOP_OPTIONS = [3, 5, 10];
