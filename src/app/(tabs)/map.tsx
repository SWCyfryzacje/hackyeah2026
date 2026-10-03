import SafeView from '@/components/safe-view';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import RNMapView, { type Region } from 'react-native-maps';
import MapView from '@/components/map-view';
import MonumentMarker from '@/components/monument-marker';
import { useSupabase } from '@/lib/supabase';
import {
  fetchMonumentsNear,
  regionRadiusM,
  type Monument,
} from '@/utils/monuments';

const REGION_DEBOUNCE_MS = 500;

export default function Map() {
  const { granted, visibility, showModal, grantPermission, onAllow, onLater } =
    useLocationPermission();
  const supabase = useSupabase();

  const mapRef = React.useRef<RNMapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [monuments, setMonuments] = useState<Monument[]>([]);

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
  }, []);

  // Center on the user once, which also triggers the first monuments fetch.
  useEffect(() => {
    if (granted) goToMe().catch(() => {});
  }, [granted]);

  useEffect(() => {
    if (!region) return;

    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchMonumentsNear(
        supabase,
        region,
        regionRadiusM(region.latitudeDelta),
        ctrl.signal
      )
        .then(setMonuments)
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          console.warn('Monuments error:', e instanceof Error ? e.message : e);
        });
    }, REGION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [region, supabase]);

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
        onRegionChangeComplete={setRegion}>
        {monuments.map((m) => (
          <MonumentMarker
            key={m.id}
            monument={m}
          />
        ))}
      </MapView>
    </SafeView>
  );
}
