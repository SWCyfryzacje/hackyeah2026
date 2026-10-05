import { Pressable, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeDailyChallenge() {
  const router = useRouter();

  return (
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
              <Text className='text-xs font-bold tracking-wider text-indigo-700 uppercase'>
                Wyzwanie Dnia
              </Text>
            </View>
            <Text className='mt-1 text-base font-bold text-slate-900'>
              Pętla Odkrywcy Dziedzictwa
            </Text>
            <Text className='mt-1 text-xs leading-4 text-slate-600'>
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
          className='mt-3.5 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 shadow-xs active:bg-indigo-700'>
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
  );
}
