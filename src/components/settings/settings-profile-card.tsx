import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

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
  return (
    <View className='mt-4 px-5'>
      <View className='rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm'>
        <View className='flex-row items-center gap-4'>
          <View className='h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-blue-50'>
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
                color='#2563eb'
              />
            )}
          </View>

          <View className='flex-1'>
            <Text
              className='text-lg font-bold text-neutral-900'
              numberOfLines={1}>
              {displayName}
            </Text>
            <Text
              className='text-xs font-medium text-neutral-500'
              numberOfLines={1}>
              {email}
            </Text>

            <View className='mt-2 flex-row items-center gap-2'>
              <View className='flex-row items-center gap-1 rounded-full border border-blue-200/60 bg-blue-50 px-2.5 py-0.5'>
                <Ionicons
                  name='shield-checkmark'
                  size={12}
                  color='#2563eb'
                />
                <Text className='text-[10px] font-bold tracking-wider text-blue-700 uppercase'>
                  Clerk Auth
                </Text>
              </View>
              <View className='rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5'>
                <Text className='text-[10px] font-bold tracking-wider text-emerald-700 uppercase'>
                  {activityLevel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
