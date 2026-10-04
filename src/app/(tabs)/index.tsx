import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
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
import StatusBadge from '@/components/group-routes/status-badge';
import {
  formatParticipants,
  formatRouteSize,
  formatTimeRange,
} from '@/utils/group-route-format';
import { useSupabase } from '@/lib/supabase';
import { fetchMonumentsNear, type Monument } from '@/utils/monuments';
import { formatDistance } from '@/components/monument-marker';
import MonumentRouteModal from '@/components/route/monument-route-modal';
import type { RouteType } from '@/hooks/useRouteCalculation';

// Default Kraków coordinates if user location is not yet ready
const DEFAULT_COORDS = { latitude: 50.0614, longitude: 19.9366 };

function MonumentCard({
  monument,
  onPress,
}: {
  monument: Monument;
  onPress?: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  const hasImage = Boolean(monument.imageUrl) && !imageError;

  return (
    <Pressable
      onPress={onPress}
      className='w-64 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm active:scale-[0.99]'>
      {hasImage ? (
        <View className='relative h-32 w-full overflow-hidden bg-slate-100'>
          <Image
            source={{ uri: monument.imageUrl! }}
            style={{ width: '100%', height: '100%' }}
            contentFit='cover'
            transition={200}
            onError={() => setImageError(true)}
          />
          <View className='absolute top-2.5 right-2.5 rounded-full bg-slate-900/70 px-2.5 py-0.5 backdrop-blur-sm'>
            <Text className='text-[10px] font-bold text-amber-300'>
              {monument.score >= 10
                ? '★ Top'
                : monument.score >= 5
                  ? '★ Popularny'
                  : '★ Zabytek'}
            </Text>
          </View>
          {monument.kind && (
            <View className='absolute bottom-2.5 left-2.5 rounded-lg bg-white/95 px-2 py-0.5 shadow-xs'>
              <Text
                className='text-[10px] font-bold text-slate-800 capitalize'
                numberOfLines={1}>
                {monument.kind}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className='relative h-28 w-full items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 p-4'>
          <MaterialCommunityIcons
            name='pillar'
            size={36}
            color='#ffffff'
          />
          <View className='absolute top-2.5 right-2.5 rounded-full bg-black/30 px-2 py-0.5'>
            <Text className='text-[10px] font-bold text-amber-100'>
              {monument.score >= 10 ? '★ Top' : '★ Zabytek'}
            </Text>
          </View>
          {monument.kind && (
            <View className='absolute bottom-2.5 left-2.5 rounded-lg bg-black/20 px-2 py-0.5'>
              <Text
                className='text-[10px] font-medium text-white capitalize'
                numberOfLines={1}>
                {monument.kind}
              </Text>
            </View>
          )}
        </View>
      )}

      <View className='p-3.5'>
        <Text
          className='text-sm font-bold text-slate-900'
          numberOfLines={1}>
          {monument.name}
        </Text>

        <View className='mt-1.5 flex-row items-center gap-1.5'>
          <Ionicons
            name='location-outline'
            size={13}
            color='#64748b'
          />
          <Text className='text-xs font-medium text-slate-600'>
            {formatDistance(monument.distanceM)} od Ciebie
          </Text>
        </View>

        {monument.description ? (
          <Text
            className='mt-1.5 text-xs text-slate-500'
            numberOfLines={2}>
            {monument.description}
          </Text>
        ) : null}

        <View className='mt-3 flex-row items-center justify-between border-t border-slate-100 pt-2'>
          <Text className='text-[11px] font-bold text-indigo-600'>
            Zaplanuj trasę
          </Text>
          <Ionicons
            name='arrow-forward'
            size={12}
            color='#4f46e5'
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const { granted, visibility, onAllow, onLater, showModal } =
    useLocationPermission({
      autoRequest: false,
    });

  const {
    routes: groupRoutes,
    loading: groupRoutesLoading,
    refresh: refreshGroupRoutes,
  } = useGroupRoutes();

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

  // Time-appropriate greeting
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
      void loadNearbyMonuments({
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

    const init = async () => {
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
    };

    void init();

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

  // Highlighted group route (prioritizing live or earliest scheduled route)
  const featuredRoute = useMemo(() => {
    if (!groupRoutes.length) return null;
    const liveRoute = groupRoutes.find((r) => r.status === 'live');
    if (liveRoute) return liveRoute;
    const scheduled = groupRoutes.filter((r) => r.status === 'scheduled');
    return scheduled.length > 0 ? scheduled[0] : groupRoutes[0];
  }, [groupRoutes]);

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
        {/* Top Header */}
        <View className='flex-row items-center justify-between px-5 pb-3'>
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

        {/* Location Status Chip */}
        <View className='px-5 pb-4'>
          <Pressable
            onPress={() => (granted ? fetchAddress() : showModal())}
            className='flex-row items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs active:scale-[0.99]'>
            <View className='flex-1 flex-row items-center gap-2.5'>
              <Ionicons
                name={granted ? 'location' : 'location-outline'}
                size={18}
                color={granted ? '#10b981' : '#f59e0b'}
              />
              <Text
                className='flex-1 text-xs font-semibold text-slate-700'
                numberOfLines={1}>
                {granted
                  ? locationLoading
                    ? 'Aktualizowanie lokalizacji...'
                    : currentAddress || 'Lokalizacja GPS aktywna'
                  : 'Włącz GPS, aby automatycznie ustalić punkt startowy'}
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
          <View className='overflow-hidden rounded-3xl bg-indigo-600 p-6 shadow-md'>
            <View className='flex-row items-start justify-between'>
              <View className='flex-1 pr-4'>
                <View className='mb-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-indigo-500/50 px-3 py-1'>
                  <MaterialCommunityIcons
                    name='routes'
                    size={14}
                    color='#ffffff'
                  />
                  <Text className='text-xs font-bold tracking-wider text-white uppercase'>
                    Inteligentne trasy
                  </Text>
                </View>
                <Text className='text-2xl leading-tight font-extrabold text-white'>
                  Gotowy na kolejną trasę?
                </Text>
                <Text className='mt-1.5 text-sm text-indigo-100 leading-5'>
                  Generuj inteligentne pętle treningowe, odkrywaj zabytki
                  i dołączaj do wspólnych biegów.
                </Text>
              </View>
            </View>

            <View className='mt-5 flex-row gap-2.5'>
              <Pressable
                onPress={() => router.push('/(tabs)/route')}
                className='flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-3 shadow-xs active:bg-indigo-50'>
                <Ionicons
                  name='navigate'
                  size={16}
                  color='#4f46e5'
                />
                <Text className='text-xs font-bold text-indigo-600 sm:text-sm'>
                  Zaplanuj pętlę
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/together')}
                className='flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-indigo-500/60 bg-indigo-700 px-3 py-3 active:bg-indigo-800'>
                <Ionicons
                  name='people'
                  size={16}
                  color='#ffffff'
                />
                <Text className='text-xs font-bold text-white sm:text-sm'>
                  Razem
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/map')}
                className='flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-indigo-500/60 bg-indigo-700 px-3 py-3 active:bg-indigo-800'>
                <Ionicons
                  name='map'
                  size={16}
                  color='#ffffff'
                />
                <Text className='text-xs font-bold text-white sm:text-sm'>
                  Mapa
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Community & Group Routes Section (Razem) */}
        <View className='mb-6 px-5'>
          <View className='mb-3 flex-row items-center justify-between'>
            <View className='flex-1 pr-2'>
              <View className='flex-row items-center gap-2'>
                <Text className='text-lg font-bold text-slate-900'>
                  Wspólne trasy (Razem)
                </Text>
                {featuredRoute?.status === 'live' && (
                  <View className='flex-row items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5'>
                    <View className='h-2 w-2 rounded-full bg-emerald-600' />
                    <Text className='text-[10px] font-bold text-emerald-700 uppercase'>
                      Na żywo
                    </Text>
                  </View>
                )}
              </View>
              <Text className='text-xs text-slate-500'>
                Dołącz do tras biegowych i spacerów ze społecznością
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/together')}>
              <Text className='text-xs font-bold text-indigo-600'>
                Wszystkie
              </Text>
            </Pressable>
          </View>

          {groupRoutesLoading && groupRoutes.length === 0 ? (
            <View className='items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs'>
              <ActivityIndicator
                size='small'
                color='#4f46e5'
              />
              <Text className='mt-2 text-xs text-slate-500'>
                Ładowanie tras grupowych...
              </Text>
            </View>
          ) : featuredRoute ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/group-routes/[id]',
                  params: { id: featuredRoute.id },
                })
              }
              className={`rounded-3xl border p-4 shadow-xs active:scale-[0.99] ${
                featuredRoute.status === 'live'
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-slate-200/80 bg-white'
              }`}>
              <View className='flex-row items-start justify-between gap-3'>
                <Text
                  className='flex-1 text-base font-bold text-slate-900'
                  numberOfLines={1}>
                  {featuredRoute.title}
                </Text>
                <StatusBadge status={featuredRoute.status} />
              </View>

              <View className='mt-2.5 gap-1.5'>
                <View className='flex-row items-center gap-1.5'>
                  <Ionicons
                    name='time-outline'
                    size={14}
                    color='#64748b'
                  />
                  <Text
                    className='text-xs font-medium text-slate-600'
                    numberOfLines={1}>
                    {formatTimeRange(
                      featuredRoute.plannedStart,
                      featuredRoute.plannedEnd
                    )}
                  </Text>
                </View>

                <View className='flex-row items-center gap-1.5'>
                  <Ionicons
                    name='person-outline'
                    size={14}
                    color='#64748b'
                  />
                  <Text
                    className='text-xs font-medium text-slate-600'
                    numberOfLines={1}>
                    {`${featuredRoute.creatorNick} · ${formatParticipants(featuredRoute.participantCount)}`}
                  </Text>
                </View>

                {featuredRoute.distanceM != null && (
                  <View className='flex-row items-center gap-1.5'>
                    <Ionicons
                      name='walk-outline'
                      size={14}
                      color='#64748b'
                    />
                    <Text
                      className='text-xs font-medium text-slate-600'
                      numberOfLines={1}>
                      {formatRouteSize(
                        featuredRoute.distanceM,
                        featuredRoute.durationS
                      )}
                    </Text>
                  </View>
                )}
              </View>

              <View className='mt-3 flex-row items-center justify-between border-t border-slate-100 pt-2.5'>
                <Text className='text-xs font-bold text-indigo-600'>
                  Zobacz trasę i dołącz
                </Text>
                <Ionicons
                  name='arrow-forward'
                  size={14}
                  color='#4f46e5'
                />
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/(tabs)/together')}
              className='flex-row items-center justify-between rounded-3xl border border-dashed border-slate-300 bg-white p-4 active:bg-slate-50'>
              <View className='flex-1 flex-row items-center gap-3'>
                <View className='h-10 w-10 items-center justify-center rounded-xl bg-indigo-50'>
                  <Ionicons
                    name='people-outline'
                    size={22}
                    color='#4f46e5'
                  />
                </View>
                <View className='flex-1'>
                  <Text className='text-sm font-bold text-slate-800'>
                    Stwórz pierwszą trasę wspólną
                  </Text>
                  <Text className='text-xs text-slate-500'>
                    Zaproś znajomych lub zaplanuj otwarte wydarzenie
                  </Text>
                </View>
              </View>
              <Ionicons
                name='chevron-forward'
                size={16}
                color='#64748b'
              />
            </Pressable>
          )}
        </View>

        {/* Nearby Cultural Heritage Discoveries Section */}
        <View className='mb-6'>
          <View className='mb-3 flex-row items-center justify-between px-5'>
            <View className='flex-1 pr-2'>
              <Text className='text-lg font-bold text-slate-900'>
                Odkryj zabytki w okolicy
              </Text>
              <Text className='text-xs text-slate-500'>
                Historyczne miejsca i obiekty dziedzictwa na Twoim szlaku
              </Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/map')}>
              <Text className='text-xs font-bold text-indigo-600'>
                Zobacz mapę
              </Text>
            </Pressable>
          </View>

          {monumentsLoading && nearbyMonuments.length === 0 ? (
            <View className='mx-5 items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs'>
              <ActivityIndicator
                size='small'
                color='#4f46e5'
              />
              <Text className='mt-2 text-xs text-slate-500'>
                Wyszukiwanie zabytków w pobliżu...
              </Text>
            </View>
          ) : nearbyMonuments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
              {nearbyMonuments.map((monument) => (
                <MonumentCard
                  key={monument.id}
                  monument={monument}
                  onPress={() => setSelectedMonumentForRoute(monument)}
                />
              ))}
            </ScrollView>
          ) : (
            <View className='mx-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs'>
              <View className='flex-row items-center gap-3'>
                <View className='h-10 w-10 items-center justify-center rounded-xl bg-amber-50'>
                  <MaterialCommunityIcons
                    name='pillar'
                    size={22}
                    color='#d97706'
                  />
                </View>
                <View className='flex-1'>
                  <Text className='text-sm font-bold text-slate-900'>
                    Odkryj zabytki w Krakowie
                  </Text>
                  <Text className='text-xs text-slate-500'>
                    Przeglądaj setki historycznych miejsc na interaktywnej mapie
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/map')}
                className='mt-3 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 active:bg-slate-200'>
                <Text className='text-xs font-semibold text-slate-800'>
                  Otwórz mapę zabytków
                </Text>
                <Ionicons
                  name='arrow-forward'
                  size={12}
                  color='#0f172a'
                />
              </Pressable>
            </View>
          )}
        </View>

        {/* Daily Motivation & Discovery Challenge */}
        <View className='mb-6 px-5'>
          <View className='rounded-3xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/80 to-indigo-100/40 p-5 shadow-xs'>
            <View className='flex-row items-start justify-between'>
              <View className='flex-1 pr-3'>
                <View className='flex-row items-center gap-1.5'>
                  <Ionicons
                    name='trophy'
                    size={16}
                    color='#4f46e5'
                  />
                  <Text className='text-xs font-bold text-indigo-700 uppercase tracking-wider'>
                    Wyzwanie Dnia
                  </Text>
                </View>
                <Text className='mt-1 text-base font-bold text-slate-900'>
                  Pętla Odkrywcy Dziedzictwa
                </Text>
                <Text className='mt-1 text-xs text-slate-600 leading-4'>
                  Zrób dziś trening w obwodzie zamkniętym, mijając przynajmniej
                  jeden lokalny pomnik lub zabytek.
                </Text>
              </View>

              <View className='h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-xs'>
                <MaterialCommunityIcons
                  name='run-fast'
                  size={26}
                  color='#ffffff'
                />
              </View>
            </View>

            <View className='mt-3.5 flex-row flex-wrap gap-2'>
              <View className='flex-row items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 shadow-xs'>
                <Ionicons
                  name='repeat-outline'
                  size={13}
                  color='#4f46e5'
                />
                <Text className='text-xs font-medium text-slate-700'>
                  Trasa w pętli
                </Text>
              </View>

              <View className='flex-row items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 shadow-xs'>
                <MaterialCommunityIcons
                  name='pillar'
                  size={13}
                  color='#d97706'
                />
                <Text className='text-xs font-medium text-slate-700'>
                  Przystanki kulturowe
                </Text>
              </View>

              <View className='flex-row items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1 shadow-xs'>
                <Ionicons
                  name='trail-sign-outline'
                  size={13}
                  color='#10b981'
                />
                <Text className='text-xs font-medium text-slate-700'>
                  Dowolny dystans
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/route')}
              className='mt-3.5 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 active:bg-indigo-700 shadow-xs'>
              <Text className='text-xs font-bold text-white'>
                Zaplanuj pętlę ze stopami
              </Text>
              <Ionicons
                name='arrow-forward'
                size={14}
                color='#ffffff'
              />
            </Pressable>
          </View>
        </View>

        {/* Quick Features & Tools Grid */}
        <View className='mb-6 px-5'>
          <Text className='mb-3 text-lg font-bold text-slate-900'>
            Możliwości aplikacji
          </Text>

          <View className='gap-3'>
            <View className='flex-row gap-3'>
              {/* Feature 1: Intelligent Loop Routing */}
              <Pressable
                onPress={() => router.push('/(tabs)/route')}
                className='flex-1 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs active:scale-[0.99]'>
                <View className='mb-3 h-10 w-10 items-center justify-center rounded-xl bg-emerald-100'>
                  <Ionicons
                    name='repeat'
                    size={22}
                    color='#059669'
                  />
                </View>
                <Text className='text-sm font-bold text-slate-900'>
                  Pętle OSRM
                </Text>
                <Text className='mt-1 text-xs leading-4 text-slate-500'>
                  Inteligentne zamykanie obwodów bez powtarzania tych samych
                  ulic.
                </Text>
              </Pressable>

              {/* Feature 2: Cultural Heritage Monuments */}
              <Pressable
                onPress={() => router.push('/(tabs)/map')}
                className='flex-1 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs active:scale-[0.99]'>
                <View className='mb-3 h-10 w-10 items-center justify-center rounded-xl bg-amber-100'>
                  <MaterialCommunityIcons
                    name='pillar'
                    size={22}
                    color='#d97706'
                  />
                </View>
                <Text className='text-sm font-bold text-slate-900'>
                  Baza Zabytków
                </Text>
                <Text className='mt-1 text-xs leading-4 text-slate-500'>
                  Ponad 700 obiektów dziedzictwa zintegrowanych z Wikipedią.
                </Text>
              </Pressable>
            </View>

            <View className='flex-row gap-3'>
              {/* Feature 3: Wspólne trasy (Razem) */}
              <Pressable
                onPress={() => router.push('/(tabs)/together')}
                className='flex-1 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs active:scale-[0.99]'>
                <View className='mb-3 h-10 w-10 items-center justify-center rounded-xl bg-indigo-100'>
                  <Ionicons
                    name='people'
                    size={22}
                    color='#4f46e5'
                  />
                </View>
                <Text className='text-sm font-bold text-slate-900'>
                  Grupy (Razem)
                </Text>
                <Text className='mt-1 text-xs leading-4 text-slate-500'>
                  Udostępnianie lokalizacji na żywo, czat i planowane
                  treningi.
                </Text>
              </Pressable>

              {/* Feature 4: Custom Waypoints */}
              <Pressable
                onPress={() => router.push('/(tabs)/route')}
                className='flex-1 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs active:scale-[0.99]'>
                <View className='mb-3 h-10 w-10 items-center justify-center rounded-xl bg-cyan-100'>
                  <MaterialCommunityIcons
                    name='map-marker-path'
                    size={22}
                    color='#0891b2'
                  />
                </View>
                <Text className='text-sm font-bold text-slate-900'>
                  Własne Punkty
                </Text>
                <Text className='mt-1 text-xs leading-4 text-slate-500'>
                  Klikaj na mapie, by wyznaczyć optymalny przebieg ścieżki.
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Activity Tips & Recommendations */}
        <View className='px-5'>
          <View className='rounded-3xl border border-amber-300/40 bg-amber-500/10 p-4'>
            <View className='mb-1.5 flex-row items-center gap-2'>
              <Ionicons
                name='sparkles'
                size={18}
                color='#d97706'
              />
              <Text className='text-sm font-bold text-amber-900'>
                Wskazówka dotycząca tras i zabytków
              </Text>
            </View>
            <Text className='text-xs leading-5 text-amber-900/80'>
              Generator pętli wykorzystuje algorytmy wyznaczania tras OpenStreetMap,
              tworząc zamknięte obwody bez powtarzania tych samych ścieżek.
              Automatycznie wykrywa i proponuje zabytki wzdłuż Twojej trasy!
            </Text>
          </View>
        </View>
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
