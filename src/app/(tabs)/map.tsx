import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import RNMapView from 'react-native-maps';
import SafeView from '@/components/safe-view';
import LocationModal from '@/components/location-modal';
import useLocationPermission from '@/hooks/useLocationPermission';
import MapView from '@/components/map-view';
import { StatusBar } from 'expo-status-bar';

export default function Map() {
  const { granted, visibility, onAllow, onLater } = useLocationPermission();
  const mapRef = useRef<RNMapView>(null);

  const goToMe = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateCamera({
        center: { latitude: coords.latitude, longitude: coords.longitude },
        zoom: 16,
      });
    } catch (e) {
      console.warn('Location error:', e instanceof Error ? e.message : e);
    }
  };

  return (
    <SafeView className='flex-1 items-center justify-center bg-amber-50'>
      <StatusBar style='light' />

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
