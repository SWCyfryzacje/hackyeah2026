import React from 'react';
import { Text, View } from 'react-native';

type SettingsHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function SettingsHeader({
  title = 'Settings',
  subtitle = 'Manage your personal info, fitness preferences & Clerk profile',
}: SettingsHeaderProps) {
  return (
    <View className='px-5 pt-4 pb-2'>
      <Text className='text-3xl font-extrabold tracking-tight text-neutral-900'>
        {title}
      </Text>
      <Text className='mt-0.5 text-sm font-medium text-neutral-500'>
        {subtitle}
      </Text>
    </View>
  );
}
