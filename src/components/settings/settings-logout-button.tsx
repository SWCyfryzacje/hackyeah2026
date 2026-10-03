import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SettingsLogoutButtonProps = {
  onPress: () => void;
  isLoggingOut: boolean;
};

export default function SettingsLogoutButton({
  onPress,
  isLoggingOut,
}: SettingsLogoutButtonProps) {
  return (
    <View className='mt-6 px-5'>
      <Pressable
        className='flex-row items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 active:bg-rose-100 disabled:opacity-50'
        onPress={onPress}
        disabled={isLoggingOut}>
        {isLoggingOut ? (
          <ActivityIndicator
            color='#dc2626'
            size='small'
          />
        ) : (
          <>
            <Ionicons
              name='log-out-outline'
              size={20}
              color='#dc2626'
            />
            <Text className='text-sm font-bold text-rose-600'>
              Log Out of Account
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
