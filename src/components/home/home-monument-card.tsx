import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistance } from '@/components/monument-marker';
import { Monument } from '@/types/monuments';

export default function HomeMonumentCard({
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
            source={{ uri: monument.imageUrl ?? '' }}
            style={{ width: '100%', height: '100%' }}
            contentFit='cover'
            transition={200}
            onError={() => setImageError(true)}
          />
          <View className='will-change-variable absolute top-2.5 right-2.5 rounded-full bg-slate-900 px-2.5 py-0.5'>
            <Text className='text-sm font-bold text-amber-300'>
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
