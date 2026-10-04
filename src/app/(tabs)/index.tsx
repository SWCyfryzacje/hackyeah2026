import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import SafeView from '@/components/safe-view';
import useLocationPermission, {
  LocationModal,
} from '@/hooks/useLocationPermission';

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const { granted, visibility, onAllow, onLater, showModal } =
    useLocationPermission({
      autoRequest: false,
    });

  const [refreshing, setRefreshing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Time-appropriate greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Fetch human-readable location address if granted
  const fetchAddress = useCallback(async () => {
    if (!granted) return;
    try {
      setLocationLoading(true);
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (place) {
        const parts = [place.city || place.subregion, place.country].filter(
          Boolean
        );
        setCurrentAddress(parts.join(', ') || 'Current location');
      }
    } catch {
      setCurrentAddress('Location ready');
    } finally {
      setLocationLoading(false);
    }
  }, [granted]);

  useEffect(() => {
    if (!granted) return;

    let active = true;

    (async () => {
      try {
        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;

        const [place] = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (!active) return;

        if (place) {
          const parts = [place.city || place.subregion, place.country].filter(
            Boolean
          );
          setCurrentAddress(parts.join(', ') || 'Current location');
        }
      } catch {
        if (active) setCurrentAddress('Location ready');
      }
    })();

    return () => {
      active = false;
    };
  }, [granted]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (granted) {
      await fetchAddress();
    }
    setRefreshing(false);
  };

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Runner';

  const quickLoops = [
    {
      distance: 3,
      title: 'Quick 3 km',
      subtitle: 'Light walk ~18 min',
      icon: 'walk-outline',
      color: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-700',
    },
    {
      distance: 5,
      title: 'Standard 5 km',
      subtitle: 'Cardio loop ~28 min',
      icon: 'fitness-outline',
      color: 'bg-blue-600',
      lightBg: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
    },
    {
      distance: 10,
      title: 'Endurance 10 km',
      subtitle: 'Long walk ~55 min',
      icon: 'bicycle-outline',
      color: 'bg-amber-600',
      lightBg: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-700',
    },
  ];

  return (
    <SafeView className='flex-1 bg-neutral-50'>
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
          />
        }>
        {/* Top Header */}
        <View className='flex-row items-center justify-between px-5 pt-4 pb-3'>
          <View className='flex-1 flex-row items-center gap-2 pr-3'>
            <Text className='text-lg font-medium text-neutral-500'>
              {greeting},
            </Text>
            <Text
              className='text-xl font-bold tracking-tight text-neutral-900'
              numberOfLines={1}>
              {displayName ?? ' '}
            </Text>
            <Text className='text-xl'>👋</Text>
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/settings')}
            className='h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm active:scale-95'>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                className='h-full w-full'
              />
            ) : (
              <Ionicons
                name='person'
                size={20}
                color='#2563eb'
              />
            )}
          </Pressable>
        </View>

        {/* Location Status Chip */}
        <View className='px-5 pb-4'>
          <Pressable
            onPress={() => (granted ? fetchAddress() : showModal())}
            className='flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 shadow-sm'>
            <View className='flex-1 flex-row items-center gap-2'>
              <Ionicons
                name={granted ? 'location' : 'location-outline'}
                size={18}
                color={granted ? '#16a34a' : '#d97706'}
              />
              <Text
                className='flex-1 text-xs font-medium text-neutral-700'
                numberOfLines={1}>
                {granted
                  ? locationLoading
                    ? 'Updating location...'
                    : currentAddress || 'GPS Location active'
                  : 'Enable GPS for automatic starting location'}
              </Text>
            </View>
            <Ionicons
              name={granted ? 'refresh' : 'arrow-forward'}
              size={14}
              color='#64748b'
            />
          </Pressable>
        </View>

        {/* Hero Quick Start Action Banner */}
        <View className='mb-6 px-5'>
          <View className='overflow-hidden rounded-3xl bg-blue-600 p-6 shadow-md'>
            <View className='flex-row items-start justify-between'>
              <View className='flex-1 pr-4'>
                <View className='mb-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-blue-500/40 px-2.5 py-0.5'>
                  <MaterialCommunityIcons
                    name='routes'
                    size={14}
                    color='#ffffff'
                  />
                  <Text className='text-xs font-semibold tracking-wider text-white uppercase'>
                    Smart Routing
                  </Text>
                </View>
                <Text className='text-2xl leading-tight font-black text-white'>
                  Ready for your next journey?
                </Text>
                <Text className='mt-1 text-sm text-blue-100'>
                  Generate intelligent closed-loop workouts or map out custom
                  paths.
                </Text>
              </View>
            </View>

            <View className='mt-5 flex-row gap-3'>
              <Pressable
                onPress={() => router.push('/(tabs)/route')}
                className='flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm active:bg-blue-50'>
                <Ionicons
                  name='navigate'
                  size={18}
                  color='#2563eb'
                />
                <Text className='text-sm font-bold text-blue-600'>
                  Plan Loop
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/map')}
                className='flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-blue-500/50 bg-blue-700 px-4 py-3 active:bg-blue-800'>
                <Ionicons
                  name='map'
                  size={18}
                  color='#ffffff'
                />
                <Text className='text-sm font-bold text-white'>Live Map</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Instant Loop Generator Section */}
        <View className='mb-6 px-5'>
          <View className='mb-3 flex-row items-center justify-between'>
            <View>
              <Text className='text-lg font-bold text-neutral-900'>
                Quick Loop Presets
              </Text>
              <Text className='text-xs text-neutral-500'>
                Instant round-trip calculation from your location
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/route')}>
              <Text className='text-xs font-semibold text-blue-600'>
                Custom
              </Text>
            </Pressable>
          </View>

          <View className='gap-3'>
            {quickLoops.map((loop) => (
              <Pressable
                key={loop.distance}
                onPress={() => router.push('/(tabs)/route')}
                className={`flex-row items-center justify-between rounded-2xl border bg-white p-4 ${loop.lightBg} shadow-sm active:opacity-90`}>
                <View className='flex-row items-center gap-3.5'>
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-xl ${loop.color} shadow-sm`}>
                    <Ionicons
                      name={loop.icon as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color='#ffffff'
                    />
                  </View>
                  <View>
                    <Text className='text-base font-bold text-neutral-900'>
                      {loop.title}
                    </Text>
                    <Text className='mt-0.5 text-xs text-neutral-600'>
                      {loop.subtitle}
                    </Text>
                  </View>
                </View>

                <View className='flex-row items-center gap-1.5'>
                  <Text className={`text-xs font-bold ${loop.textColor}`}>
                    Start
                  </Text>
                  <Ionicons
                    name='chevron-forward'
                    size={16}
                    color='#64748b'
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Features & Tools Grid */}
        <View className='mb-6 px-5'>
          <Text className='mb-3 text-lg font-bold text-neutral-900'>
            Explore Features
          </Text>

          <View className='flex-row gap-3'>
            {/* Feature 1 */}
            <Pressable
              onPress={() => router.push('/(tabs)/map')}
              className='flex-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm active:bg-neutral-50'>
              <View className='mb-3 h-10 w-10 items-center justify-center rounded-xl bg-indigo-100'>
                <Ionicons
                  name='compass'
                  size={22}
                  color='#4f46e5'
                />
              </View>
              <Text className='text-sm font-bold text-neutral-900'>
                Explore Map
              </Text>
              <Text className='mt-1 text-xs leading-4 text-neutral-500'>
                Inspect live GPS coordinates and local terrain.
              </Text>
            </Pressable>

            {/* Feature 2 */}
            <Pressable
              onPress={() => router.push('/(tabs)/route')}
              className='flex-1 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm active:bg-neutral-50'>
              <View className='mb-3 h-10 w-10 items-center justify-center rounded-xl bg-teal-100'>
                <MaterialCommunityIcons
                  name='map-marker-path'
                  size={22}
                  color='#0d9488'
                />
              </View>
              <Text className='text-sm font-bold text-neutral-900'>
                Waypoints
              </Text>
              <Text className='mt-1 text-xs leading-4 text-neutral-500'>
                Tap on any destination to find the fastest path.
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Activity Tips & Recommendations */}
        <View className='px-5'>
          <View className='rounded-2xl border border-amber-300/40 bg-amber-500/10 p-4'>
            <View className='mb-1.5 flex-row items-center gap-2'>
              <Ionicons
                name='sparkles'
                size={18}
                color='#d97706'
              />
              <Text className='text-sm font-bold text-amber-900'>
                Pro Tip for Outdoor Loops
              </Text>
            </View>
            <Text className='text-xs leading-5 text-amber-900/80'>
              The loop generator uses OpenStreetMap routing algorithms to craft
              realistic, continuous loop circuits without repeating paths when
              possible.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
