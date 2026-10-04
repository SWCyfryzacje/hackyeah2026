import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SettingsFeedbackBannerProps = {
  successMessage?: string | null;
  errorMessage?: string | null;
};

export default function SettingsFeedbackBanner({
  successMessage,
  errorMessage,
}: SettingsFeedbackBannerProps) {
  if (!successMessage && !errorMessage) return null;

  return (
    <View className='gap-2.5'>
      {successMessage ? (
        <View className='mx-5 mt-3 flex-row items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 shadow-xs'>
          <Ionicons
            name='checkmark-circle'
            size={20}
            color='#10b981'
          />
          <Text className='flex-1 text-xs font-bold text-emerald-800'>
            {successMessage}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View className='mx-5 mt-3 flex-row items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 shadow-xs'>
          <Ionicons
            name='alert-circle'
            size={20}
            color='#e11d48'
          />
          <Text className='flex-1 text-xs font-bold text-rose-800'>
            {errorMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
