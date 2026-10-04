import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import useGroupRoute from '@/hooks/group-routes/useGroupRoute';
import useLocationSharing from '@/hooks/group-routes/useLocationSharing';
import GroupRouteMap from '@/components/group-routes/group-route-map';
import GroupRouteInfo from '@/components/group-routes/group-route-info';
import GroupRouteActions from '@/components/group-routes/group-route-actions';
import JoinCodeCard from '@/components/group-routes/join-code-card';
import ParticipantList from '@/components/group-routes/participant-list';

export default function GroupRouteScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const { route, participants, myRole, loading, error, refresh } =
    useGroupRoute(id);
  const [refreshing, setRefreshing] = useState(false);

  // Creator's device shares its position while the route is live
  const sharing = useLocationSharing({
    routeId: id,
    enabled: myRole === 'creator' && route?.status === 'live',
  });

  const goToList = () => router.dismissTo('/(tabs)/together');

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && !route) {
    return (
      <View className='flex-1 items-center justify-center bg-slate-50'>
        <Stack.Screen options={{ title: 'Trasa' }} />
        <ActivityIndicator
          size='large'
          color='#4f46e5'
        />
      </View>
    );
  }

  if (!route) {
    return (
      <View className='flex-1 items-center justify-center gap-4 bg-slate-50 p-6'>
        <Stack.Screen options={{ title: 'Trasa' }} />
        <Ionicons
          name='alert-circle-outline'
          size={40}
          color='#64748b'
        />
        <Text className='text-center text-sm font-medium text-slate-700'>
          {error ?? 'Nie znaleziono trasy lub nie masz do niej dostępu.'}
        </Text>
        <Pressable
          onPress={goToList}
          className='rounded-xl bg-indigo-600 px-5 py-3 shadow-xs active:bg-indigo-700 active:scale-[0.99]'>
          <Text className='text-sm font-bold text-white'>
            Wróć do Razem
          </Text>
        </Pressable>
      </View>
    );
  }

  const isMember = myRole != null;

  return (
    <View className='flex-1 bg-slate-50'>
      <Stack.Screen
        options={{
          title: route.title,
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          gap: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#4f46e5'
          />
        }>
        <View className='h-1/2'>
          <GroupRouteMap
            route={route}
            showLive={isMember && route.status === 'live'}
          />
        </View>

        <View className='flex gap-4 px-4'>
          <GroupRouteInfo route={route} />

          <GroupRouteActions
            route={route}
            myRole={myRole}
            sharing={sharing}
            onChanged={refresh}
            onLeft={goToList}
            onOpenChat={() =>
              router.push({
                pathname: '/group-routes/[id]/chat',
                params: { id: route.id },
              })
            }
          />

          {isMember ? (
            <>
              <JoinCodeCard
                code={route.joinCode}
                title={route.title}
              />
              <ParticipantList
                participants={participants}
                myUserId={userId}
              />
            </>
          ) : (
            <Text className='text-sm text-neutral-500'>
              Dołącz, aby zobaczyć uczestników, pozycję prowadzącego na żywo i
              czat.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
