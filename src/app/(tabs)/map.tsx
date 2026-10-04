import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import RNMapView from 'react-native-maps';
import SafeView, { TAB_SCREEN_EDGES } from '@/components/safe-view';
import LocationModal from '@/components/location-modal';
import useLocationPermission from '@/hooks/useLocationPermission';
import MapView from '@/components/map-view';
import useNearbyMonuments from '@/hooks/useNearbyMonuments';
import { MonumentMarkers } from '@/components/monument-marker';
import MonumentLevelPicker from '@/components/monument-level-picker';

export default function Map() {
  const { granted, visibility, onAllow, onLater } = useLocationPermission();
  const mapRef = useRef<RNMapView>(null);
  const nearby = useNearbyMonuments();

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
    <SafeView
      className='flex-1 items-center bg-slate-50'
      edges={TAB_SCREEN_EDGES}>
      <LocationModal
        visible={visibility}
        onAllow={onAllow}
        onLater={onLater}
      />

      <MonumentLevelPicker className='z-10 mx-6 mt-4' />

      <Pressable
        onPress={goToMe}
        className='absolute top-36 right-4 z-10 size-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-md active:scale-95'>
        <Ionicons
          name='locate'
          size={22}
          color='#4f46e5'
        />
      </Pressable>

      <MapView
        ref={mapRef}
        permission={granted}
        mapPadding={{ top: 140, right: 10, bottom: 20, left: 10 }}
        onRegionChangeComplete={nearby.onRegionChangeComplete}>
        <MonumentMarkers monuments={nearby.monuments} />
      </MapView>
    </SafeView>
  );
}
