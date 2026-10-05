import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import SafeView, { TAB_SCREEN_EDGES } from '@/components/safe-view';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';
import useGroupRoutes from '@/hooks/group-routes/useGroupRoutes';

import { useSupabase } from '@/lib/supabase';
import MonumentRouteModal from '@/components/route/monument-route-modal';
import type { RouteType } from '@/hooks/useRouteCalculation';
import HeroQuickStart from '@/components/home/hero-quick-start';
import { fetchMonumentsNear } from '@/utils/monuments';
import HomeNearbyMonuments from '@/components/home/home-nearby-monuments';
import { DEFAULT_COORDS } from '@/constants/default';
import { Monument } from '@/types/monuments';
import HomeGroupRoutes from '@/components/home/home-group-routes';
import HomeDailyChallenge from '@/components/home/home-daily-challenge';
import HomeLiveLocation from '@/components/home/home-live-location';

export default function Home() {
  const router = useRouter();
  const { user } = useUser();

  const { granted, visibility, onAllow, onLater } = useLocationPermission({
    autoRequest: false,
  });

  const { refresh: refreshGroupRoutes } = useGroupRoutes();

  const supabase = useSupabase();

  const [refreshing, setRefreshing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [nearbyMonuments, setNearbyMonuments] = useState<Monument[]>([]);
  const [monumentsLoading, setMonumentsLoading] = useState(false);

  const [selectedMonumentForRoute, setSelectedMonumentForRoute] =
    useState<Monument | null>(null);

  const handleSelectMonumentRouteType = useCallback(
    (type: RouteType) => {
      if (!selectedMonumentForRoute) return;

      const target = selectedMonumentForRoute;

      setSelectedMonumentForRoute(null);

      router.push({
        pathname: '/(tabs)/route',
        params: {
          targetLat: target.latitude.toString(),
          targetLng: target.longitude.toString(),
          targetName: target.name,
          targetDescription: target.description ?? '',
          targetType: type,
          targetMonumentId: target.id.toString(),
        },
      });
    },
    [selectedMonumentForRoute, router]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Dzień dobry';
    return 'Dobry wieczór';
  }, []);

  const loadNearbyMonuments = useCallback(
    async (coords?: { latitude: number; longitude: number }) => {
      const center = coords || DEFAULT_COORDS;
      try {
        setMonumentsLoading(true);
        const results = await fetchMonumentsNear(supabase, center, 3500, 3);
        setNearbyMonuments(results.slice(0, 8));
      } catch (err) {
        console.warn('Error loading nearby monuments:', err);
      } finally {
        setMonumentsLoading(false);
      }
    },
    [supabase]
  );

  // Fetch human-readable location address if granted
  const fetchAddress = useCallback(async () => {
    if (!granted) return;

    try {
      setLocationLoading(true);

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await loadNearbyMonuments({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (place) {
        const parts = [place.city || place.subregion, place.country].filter(
          Boolean
        );

        setCurrentAddress(parts.join(', ') || 'Bieżąca lokalizacja');
      } else {
        setCurrentAddress('Bieżąca lokalizacja');
      }
    } catch {
      setCurrentAddress('Lokalizacja gotowa');
    } finally {
      setLocationLoading(false);
    }
  }, [granted, loadNearbyMonuments]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (granted) {
        try {
          setLocationLoading(true);
          const { coords } = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          if (!active) return;

          try {
            setMonumentsLoading(true);

            const results = await fetchMonumentsNear(
              supabase,
              { latitude: coords.latitude, longitude: coords.longitude },
              3500,
              3
            );

            if (active) setNearbyMonuments(results.slice(0, 8));
          } catch (err) {
            console.warn('Error loading nearby monuments:', err);
          } finally {
            if (active) setMonumentsLoading(false);
          }

          const [place] = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });

          if (!active) return;

          if (place) {
            const parts = [place.city || place.subregion, place.country].filter(
              Boolean
            );
            setCurrentAddress(parts.join(', ') || 'Bieżąca lokalizacja');
          } else {
            setCurrentAddress('Bieżąca lokalizacja');
          }
        } catch {
          if (active) setCurrentAddress('Lokalizacja gotowa');
        } finally {
          if (active) setLocationLoading(false);
        }
      } else {
        try {
          setMonumentsLoading(true);

          const results = await fetchMonumentsNear(
            supabase,
            DEFAULT_COORDS,
            3500,
            3
          );

          if (active) setNearbyMonuments(results.slice(0, 8));
        } catch (err) {
          console.warn('Error loading initial monuments:', err);
        } finally {
          if (active) setMonumentsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [granted, supabase]);

  const onRefresh = async () => {
    setRefreshing(true);

    await Promise.allSettled([
      granted ? fetchAddress() : loadNearbyMonuments(DEFAULT_COORDS),
      refreshGroupRoutes(),
    ]);

    setRefreshing(false);
  };

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Biegacz';

  return (
    <SafeView
      className='flex-1 bg-slate-50'
      edges={TAB_SCREEN_EDGES}>
      <LocationModal
        visible={visibility}
        onAllow={onAllow}
        onLater={onLater}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#4f46e5'
          />
        }>
        <View className='flex-row items-center justify-between px-5 pt-4 pb-3'>
          {/* Greeting */}
          <View className='flex-1 flex-row items-center gap-2 pr-3'>
            <Text className='text-lg font-medium text-slate-500'>
              {greeting},
            </Text>
            <Text
              className='text-xl font-extrabold tracking-tight text-slate-900'
              numberOfLines={1}>
              {displayName}
            </Text>
            <Text className='text-xl'>👋</Text>
          </View>

          {/* Avatar */}
          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            className='h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-xs active:scale-95'>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit='cover'
              />
            ) : (
              <Ionicons
                name='person'
                size={20}
                color='#4f46e5'
              />
            )}
          </Pressable>
        </View>

        {/* Live Location */}
        <HomeLiveLocation
          currentAddress={currentAddress}
          locationLoading={locationLoading}
          fetchAddress={fetchAddress}
        />

        {/* Hero Quick Start */}
        <HeroQuickStart />

        {/* Nearby Monuments */}
        <HomeNearbyMonuments
          setMonument={setSelectedMonumentForRoute}
          nearbyMonuments={nearbyMonuments}
          monumentsLoading={monumentsLoading}
        />

        {/* Group Routes */}
        <HomeGroupRoutes />

        {/* Daily Challenge */}
        <HomeDailyChallenge />
      </ScrollView>

      <MonumentRouteModal
        visible={Boolean(selectedMonumentForRoute)}
        monument={selectedMonumentForRoute}
        onClose={() => setSelectedMonumentForRoute(null)}
        onConfirm={handleSelectMonumentRouteType}
      />
    </SafeView>
  );
}
