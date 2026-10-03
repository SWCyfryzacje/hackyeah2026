import MapView, { type Region } from 'react-native-maps';
import { StyleSheet } from 'react-native';

// Kraków
const INITIAL_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// Default provider: Google Maps on Android, Apple Maps on iOS — both work in Expo Go.
export default function TripMap() {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={INITIAL_REGION}
      showsUserLocation={false}
      showsCompass
    />
  );
}
