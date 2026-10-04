import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ACTIVITY_LEVELS } from '@/constants/settings';

type SettingsProfileCardProps = {
  imageUrl?: string | null;
  displayName: string;
  email: string;
  activityLevel: string;
};

export default function SettingsProfileCard({
  imageUrl,
  displayName,
  email,
  activityLevel,
}: SettingsProfileCardProps) {
  const activityLabel =
    ACTIVITY_LEVELS.find((a) => a.id === activityLevel)?.label || activityLevel;

  return (
    <View className='mt-4 px-5'>
      <View className='rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs'>
        <View className='flex-row items-center gap-4'>
          <View className='h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-indigo-50'>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit='cover'
              />
            ) : (
              <Ionicons
                name='person'
                size={32}
                color='#4f46e5'
              />
            )}
          </View>

          <View className='flex-1'>
            <Text
              className='text-lg font-extrabold text-slate-900'
              numberOfLines={1}>
              {displayName}
            </Text>
            <Text
              className='text-xs font-medium text-slate-500'
              numberOfLines={1}>
              {email}
            </Text>

            <View className='mt-2 flex-row items-center gap-2'>
              <View className='flex-row items-center gap-1 rounded-full border border-indigo-200/60 bg-indigo-50 px-2.5 py-0.5'>
                <Ionicons
                  name='shield-checkmark'
                  size={12}
                  color='#4f46e5'
                />
                <Text className='text-[10px] font-bold tracking-wider text-indigo-700 uppercase'>
                  Konto zweryfikowane
                </Text>
              </View>
              <View className='rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5'>
                <Text className='text-[10px] font-bold tracking-wider text-emerald-700 uppercase'>
                  {activityLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
