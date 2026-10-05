import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from '@/components/group-routes/status-badge';
import {
  formatParticipants,
  formatRouteSize,
  formatTimeRange,
} from '@/utils/group-route-format';
import { useMemo } from 'react';
import useGroupRoutes from '@/hooks/group-routes/useGroupRoutes';
import { useRouter } from 'expo-router';

export default function HomeGroupRoutes() {
  const router = useRouter();

  const { routes: groupRoutes, loading: groupRoutesLoading } = useGroupRoutes();

  const featuredRoute = useMemo(() => {
    if (!groupRoutes.length) return null;

    const liveRoute = groupRoutes.find((r) => r.status === 'live');

    if (liveRoute) return liveRoute;

    const scheduled = groupRoutes.filter((r) => r.status === 'scheduled');
    return scheduled.length > 0 ? scheduled[0] : groupRoutes[0];
  }, [groupRoutes]);

  return (
    <View className='mb-6 px-5'>
      <View className='mb-3 flex-row items-center justify-between'>
        <View className='flex-1'>
          <View className='flex-row items-center gap-2'>
            <Text className='text-lg font-bold text-slate-900'>
              Wspólne trasy
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
          <Text className='text-xs font-bold text-indigo-600'>Wszystkie</Text>
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
  );
}
