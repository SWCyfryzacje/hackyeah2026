import { useSyncExternalStore } from 'react';

export type MapLayer = 'monuments' | 'events' | 'recreation';
export type MapLayers = Record<MapLayer, boolean>;

// Shared across screens (map tab and route tab), kept in memory for the session.
// Events and recreation start hidden; users switch them on from the layer card.
let layers: MapLayers = { monuments: true, events: false, recreation: false };
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
