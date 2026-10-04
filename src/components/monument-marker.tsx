import { Platform, Text, View } from 'react-native';
import { Callout, CalloutSubview, Marker } from 'react-native-maps';
import type { Monument } from '@/utils/monuments';

type Props = {
  monument: Monument;
  color?: string;
  onPress?: () => void;
  onCalloutPress?: () => void;
  isSelected?: boolean;
  showAddButton?: boolean;
};

export const formatDistance = (m: number) =>
  m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

export default function MonumentMarker({
  monument,
  color = '#d97706',
  onPress,
  onCalloutPress,
  isSelected = false,
  showAddButton = false,
}: Props) {
  const distanceStr =
    typeof monument.distanceM === 'number'
      ? formatDistance(monument.distanceM)
      : null;

  const description = [monument.description, distanceStr]
    .filter(Boolean)
    .join(' · ');

  return (
    <Marker
      // pinColor changes are ignored on Android unless the marker remounts
      key={`${monument.id}-${color}-${isSelected ? 'selected' : 'unselected'}`}
      coordinate={{
        latitude: monument.latitude,
        longitude: monument.longitude,
      }}
      title={showAddButton ? undefined : monument.name}
      description={showAddButton ? undefined : description}
      pinColor={color}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress?.();
      }}>
      {showAddButton && (
        <Callout
          tooltip={false}
          onPress={
            Platform.OS === 'android'
              ? (e) => {
                  e?.stopPropagation?.();
                  onCalloutPress?.();
                }
              : undefined
          }>
          <View style={{ minWidth: 150, maxWidth: 240, padding: 4 }}>
            <Text
              style={{ fontWeight: '700', fontSize: 14, color: '#171717' }}
              numberOfLines={2}>
              {monument.name}
            </Text>

            {distanceStr && (
              <Text style={{ fontSize: 12, color: '#525252', marginTop: 2 }}>
                {distanceStr} od trasy
              </Text>
            )}

            {monument.description ? (
              <Text
                style={{ fontSize: 11, color: '#737373', marginTop: 2 }}
                numberOfLines={2}>
                {monument.description}
              </Text>
            ) : null}

            {Platform.OS === 'ios' ? (
              <CalloutSubview
                onPress={() => onCalloutPress?.()}
                style={{
                  marginTop: 8,
                  backgroundColor: isSelected ? '#dc2626' : '#16a34a',
                  borderRadius: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                  {isSelected ? 'Usuń z trasy' : '+ Dodaj do trasy'}
                </Text>
              </CalloutSubview>
            ) : (
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: isSelected ? '#dc2626' : '#16a34a',
                  borderRadius: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text
                  style={{
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                  {isSelected ? 'Usuń z trasy' : '+ Dodaj do trasy'}
                </Text>
              </View>
            )}
          </View>
        </Callout>
      )}
    </Marker>
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
