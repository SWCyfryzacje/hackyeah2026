import { useSyncExternalStore } from 'react';

export type MapLayer = 'monuments' | 'events';
export type MapLayers = Record<MapLayer, boolean>;

// Shared across screens (map tab and route tab), kept in memory for the session.
let layers: MapLayers = { monuments: true, events: true };
const listeners = new Set<() => void>();

function setLayer(layer: MapLayer, visible: boolean) {
  layers = { ...layers, [layer]: visible };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Which marker layers are shown on the maps. */
export default function useMapLayers() {
  const value = useSyncExternalStore(subscribe, () => layers);
  return [value, setLayer] as const;
}
