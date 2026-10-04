import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeView from '@/components/safe-view';
import GroupRouteSection from '@/components/group-routes/group-route-section';
import JoinByCodeForm from '@/components/group-routes/join-by-code-form';
import useGroupRoutes from '@/hooks/group-routes/useGroupRoutes';

export default function TogetherScreen() {
  const router = useRouter();
  const { routes, loading, error, refresh } = useGroupRoutes();
  const [refreshing, setRefreshing] = useState(false);

  const mine = routes.filter((r) => r.myRole != null);
  const others = routes.filter((r) => r.myRole == null);

  const openRoute = (id: string) =>
    router.push({ pathname: '/group-routes/[id]', params: { id } });

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeView className='flex-1 bg-neutral-50'>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
        <View>
          <Text className='text-2xl font-bold tracking-tight text-neutral-900'>
            Razem
          </Text>
          <Text className='text-sm text-neutral-500'>
            Wspólne trasy — dołącz do innych albo zaproś znajomych
          </Text>
        </View>

        <JoinByCodeForm onJoined={openRoute} />

        <Pressable
          onPress={() => router.push('/(tabs)/route')}
          className='flex-row items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 active:opacity-90'>
          <Ionicons
            name='add-circle'
            size={24}
            color='#2563eb'
          />
          <View className='flex-1'>
            <Text className='text-sm font-bold text-blue-700'>
              Utwórz trasę w zakładce Route
            </Text>
            <Text className='text-xs text-blue-700/80'>
              Wyznacz trasę lub pętlę, a potem wybierz „Utwórz wspólną trasę”
            </Text>
          </View>
          <Ionicons
            name='chevron-forward'
            size={16}
            color='#2563eb'
          />
        </Pressable>

        {error && (
          <View className='rounded-xl border border-red-200 bg-red-50 p-3'>
            <Text className='text-sm text-red-700'>{error}</Text>
          </View>
        )}

        {loading && routes.length === 0 && !refreshing ? (
          <ActivityIndicator
            size='large'
            color='#2563eb'
          />
        ) : (
          <>
            <GroupRouteSection
              title='Moje trasy'
              routes={mine}
              emptyText='Nie należysz jeszcze do żadnej trasy.'
              onOpen={openRoute}
            />
            <GroupRouteSection
              title='Publiczne trasy'
              routes={others}
              emptyText='Brak publicznych tras. Utwórz pierwszą!'
              onOpen={openRoute}
            />
          </>
        )}
      </ScrollView>
    </SafeView>
  );
}
