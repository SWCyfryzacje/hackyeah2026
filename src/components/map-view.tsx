import MV, { type Region } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { Ref } from 'react';

type Props = {
  permission: boolean;
  ref?: Ref<MV>;
};

// Kraków
const INITIAL_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// Default provider: Google Maps on Android, Apple Maps on iOS — both work in Expo Go.
export default function MapView({ permission, ref }: Props) {
  return (
    <MV
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      showsUserLocation={permission}
      showsMyLocationButton={false}
      showsCompass
      mapPadding={{ top: 60, right: 5, bottom: 10, left: 5 }}
    />
  );
}
