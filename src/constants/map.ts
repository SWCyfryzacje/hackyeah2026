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

export type RoutePreset = {
  minKm: number;
  maxKm: number;
  label: string;
  tag?: string;
  description?: string;
};

export type LoopPreset = RoutePreset;

export const DEFAULT_ROUTE_DISTANCE_OPTIONS: RoutePreset[] = [
  {
    minKm: 2,
    maxKm: 4,
    label: '2-4 km',
    tag: 'Krótki',
    description: 'Szybki spacer lub bieg',
  },
  {
    minKm: 4,
    maxKm: 8,
    label: '4-8 km',
    tag: 'Średni',
    description: 'Umiarkowany dystans',
  },
  {
    minKm: 8,
    maxKm: 12,
    label: '8-12 km',
    tag: 'Długi',
    description: 'Długa trasa',
  },
];

export const DEFAULT_LOOP_OPTIONS: LoopPreset[] = DEFAULT_ROUTE_DISTANCE_OPTIONS;
