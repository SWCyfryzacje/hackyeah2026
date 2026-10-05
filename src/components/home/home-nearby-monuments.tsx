import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import HomeMonumentCard from '@/components/home/home-monument-card';
import { Monument } from '@/types/monuments';

type Props = {
  setMonument: (monument: Monument) => void;
  nearbyMonuments: Monument[];
  monumentsLoading: boolean;
};

export default function HomeNearbyMonuments({
  setMonument,
  nearbyMonuments,
  monumentsLoading,
}: Props) {
  const router = useRouter();

  return (
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
          <Text className='text-xs font-bold text-indigo-600'>Zobacz mapę</Text>
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
            <HomeMonumentCard
              key={monument.id}
              monument={monument}
              onPress={() => setMonument(monument)}
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
  );
}
