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

export type LoopPreset = {
  minKm: number;
  maxKm: number;
  label: string;
};

export const DEFAULT_LOOP_OPTIONS: LoopPreset[] = [
  { minKm: 2, maxKm: 4, label: '2-4 km' },
  { minKm: 4, maxKm: 8, label: '4-8 km' },
  { minKm: 8, maxKm: 15, label: '8-15 km' },
];
