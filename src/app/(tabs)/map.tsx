import SafeView from '@/components/safe-view';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect } from 'react';
import RNMapView from 'react-native-maps';
import MapView from '@/components/map-view';

export default function Map() {
  const { granted, visibility, showModal, grantPermission, onAllow, onLater } =
    useLocationPermission();

  const mapRef = React.useRef<RNMapView>(null);

  const goToMe = async () => {
    const { coords } = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateCamera({
      center: { latitude: coords.latitude, longitude: coords.longitude },
      zoom: 16,
    });
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showModal();
      } else {
        grantPermission();
      }
    })();
  }, [grantPermission, showModal]);

  return (
    <SafeView className='flex-1 items-center justify-center bg-amber-50'>
      <LocationModal
        visible={visibility}
        onAllow={onAllow}
        onLater={onLater}
      />
      <Pressable
        onPress={goToMe}
        className='absolute right-4 bottom-8 z-10 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg'>
        <Ionicons
          name='locate'
          size={24}
          color='#2563eb'
        />
      </Pressable>
      <MapView
        ref={mapRef}
        permission={granted}
      />
    </SafeView>
  );
}
