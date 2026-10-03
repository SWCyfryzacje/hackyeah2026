import { Marker } from 'react-native-maps';
import type { Monument } from '@/utils/monuments';

type Props = {
  monument: Monument;
  color?: string;
  onPress?: () => void;
};

export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export default function MonumentMarker({
  monument,
  color = '#d97706',
  onPress,
}: Props) {
  const description = [monument.description, formatDistance(monument.distanceM)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Marker
      // pinColor changes are ignored on Android unless the marker remounts
      key={`${monument.id}-${color}`}
      coordinate={{
        latitude: monument.latitude,
        longitude: monument.longitude,
      }}
      title={monument.name}
      description={description}
      pinColor={color}
      onPress={onPress}
    />
  );
}

/** Plain markers for a list of monuments (e.g. nearby ones on the map tab). */
export function MonumentMarkers({ monuments }: { monuments: Monument[] }) {
  return monuments.map((m) => (
    <MonumentMarker
      key={m.id}
      monument={m}
    />
  ));
}
