import MV, { type MapViewProps, type Region } from 'react-native-maps';
import { StyleSheet } from 'react-native';
import { forwardRef, type ReactNode } from 'react';
import { INITIAL_REGION } from '@/constants/map';

export type MapViewWrapperProps = Omit<MapViewProps, 'initialRegion'> & {
  permission?: boolean;
  children?: ReactNode;
  initialRegion?: Region;
};

// Default provider: Google Maps on Android, Apple Maps on iOS — both work in Expo Go.
const MapView = forwardRef<MV, MapViewWrapperProps>(function MapView(
  {
    permission = false,
    children,
    initialRegion = INITIAL_REGION,
    style = StyleSheet.absoluteFill,
    showsMyLocationButton = false,
    showsCompass = true,
    mapPadding = { top: 60, right: 5, bottom: 10, left: 5 },
    ...rest
  },
  ref
) {
  return (
    <MV
      ref={ref}
      style={style}
      initialRegion={initialRegion}
      showsUserLocation={permission}
      showsMyLocationButton={showsMyLocationButton}
      showsCompass={showsCompass}
      mapPadding={mapPadding}
      {...rest}>
      {children}
    </MV>
  );
});

export default MapView;
