import React from 'react';
import { Text, View } from 'react-native';

type SettingsHeaderProps = {
  title?: string;
  subtitle?: string;
};

export default function SettingsHeader({
  title = 'Ustawienia',
  subtitle = 'Zarządzaj swoimi danymi osobowymi i preferencjami treningowymi',
}: SettingsHeaderProps) {
  return (
    <View className='px-5 pt-4 pb-2'>
      <Text className='text-3xl font-extrabold tracking-tight text-slate-900'>
        {title}
      </Text>
      <Text className='mt-0.5 text-xs font-medium text-slate-500'>
        {subtitle}
      </Text>
    </View>
  );
}
