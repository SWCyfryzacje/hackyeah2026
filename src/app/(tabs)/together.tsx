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
import SafeView, { TAB_SCREEN_EDGES } from '@/components/safe-view';
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
    <SafeView
      className='flex-1 bg-slate-50'
      edges={TAB_SCREEN_EDGES}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
        contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor='#4f46e5'
          />
        }>
        <View className='gap-0.5'>
          <Text className='text-2xl font-extrabold tracking-tight text-slate-900'>
            Razem
          </Text>
          <Text className='text-xs font-medium text-slate-500'>
            Wspólne trasy — dołącz do innych albo zaproś znajomych
          </Text>
        </View>

        <JoinByCodeForm onJoined={openRoute} />

        <Pressable
          onPress={() => router.push('/(tabs)/route')}
          className='flex-row items-center gap-3 rounded-3xl border border-indigo-200/80 bg-indigo-50/80 p-4 shadow-xs active:scale-[0.99]'>
          <View className='h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 shadow-xs'>
            <Ionicons
              name='add'
              size={22}
              color='#ffffff'
            />
          </View>
          <View className='flex-1'>
            <Text className='text-sm font-bold text-indigo-950'>
              Utwórz trasę w zakładce Route
            </Text>
            <Text className='text-xs text-indigo-700/80 leading-4'>
              Wyznacz trasę lub pętlę, a potem wybierz „Utwórz wspólną trasę”
            </Text>
          </View>
          <Ionicons
            name='chevron-forward'
            size={16}
            color='#4f46e5'
          />
        </Pressable>

        {error && (
          <View className='rounded-2xl border border-rose-200 bg-rose-50 p-3.5'>
            <Text className='text-xs font-semibold text-rose-700'>{error}</Text>
          </View>
        )}

        {loading && routes.length === 0 && !refreshing ? (
          <ActivityIndicator
            size='large'
            color='#4f46e5'
            className='py-8'
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
