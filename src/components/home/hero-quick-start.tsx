import { Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HeroQuickStart() {
  const router = useRouter();

  return (
    <View className='mb-6 px-5'>
      <View className='overflow-hidden rounded-3xl bg-indigo-600 p-6 shadow-md'>
        <View className='flex-row items-start justify-between'>
          <View className='flex-1 pr-4'>
            <View className='mb-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-indigo-500/50'>
              <MaterialCommunityIcons
                name='routes'
                size={14}
                color='white'
              />
              <Text className='text-xs font-bold tracking-wider text-white uppercase'>
                Inteligentne trasy
              </Text>
            </View>
            <Text className='text-2xl leading-tight font-extrabold text-white'>
              Gotowy na kolejną trasę?
            </Text>
            <Text className='mt-1.5 text-sm leading-5 text-indigo-100'>
              Generuj inteligentne pętle treningowe, odkrywaj zabytki i dołączaj
              do wspólnych biegów.
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
              color='white'
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
              color='white'
            />
            <Text className='text-xs font-bold text-white sm:text-sm'>
              Mapa
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
