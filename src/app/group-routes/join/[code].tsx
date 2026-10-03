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
    <View className='flex-1 items-center justify-center gap-4 bg-neutral-50 p-6'>
      <Stack.Screen options={{ title: 'Dołączanie' }} />
      {error ? (
        <>
          <Ionicons
            name='alert-circle-outline'
            size={40}
            color='#dc2626'
          />
          <Text className='text-center text-base text-neutral-700'>
            {error}
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)/together')}
            className='rounded-xl bg-blue-600 px-5 py-3 active:bg-blue-700'>
            <Text className='text-sm font-semibold text-white'>
              Wróć do Razem
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator
            size='large'
            color='#2563eb'
          />
          <Text className='text-base text-neutral-700'>Dołączanie…</Text>
        </>
      )}
    </View>
  );
}
