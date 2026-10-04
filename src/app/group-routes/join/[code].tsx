import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '@/lib/supabase';
import { joinGroupRouteByCode } from '@/lib/group-routes';

// Target of njord://group-routes/join/<CODE>: joins and opens the route.
export default function JoinGroupRouteScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const supabase = useSupabase();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    joinGroupRouteByCode(supabase, code.trim().toUpperCase())
      .then((id) => {
        if (active)
          router.replace({ pathname: '/group-routes/[id]', params: { id } });
      })
      .catch((e: unknown) => {
        if (active)
          setError(e instanceof Error ? e.message : 'Nie udało się dołączyć.');
      });

    return () => {
      active = false;
    };
  }, [supabase, code, router]);

  return (
    <View className='flex-1 items-center justify-center gap-4 bg-slate-50 p-6'>
      <Stack.Screen options={{ title: 'Dołączanie' }} />
      {error ? (
        <>
          <Ionicons
            name='alert-circle-outline'
            size={40}
            color='#e11d48'
          />
          <Text className='text-center text-sm font-medium text-slate-700'>
            {error}
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/together')}
            className='rounded-xl bg-indigo-600 px-5 py-3 shadow-xs active:bg-indigo-700 active:scale-[0.99]'>
            <Text className='text-sm font-bold text-white'>
              Wróć do Razem
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator
            size='large'
            color='#4f46e5'
          />
          <Text className='text-sm font-medium text-slate-600'>Dołączanie…</Text>
        </>
      )}
    </View>
  );
}
