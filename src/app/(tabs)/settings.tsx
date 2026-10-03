import SafeView from '@/components/safe-view';
import { useAuth } from '@clerk/expo';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function Settings() {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
    } catch (error) {
      console.error('Failed to log out:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeView className='flex-1 bg-amber-50 p-4'>
      <StatusBar style='dark' />

      <View className='flex-1 justify-between'>
        <View className='gap-4'>
          <Text className='text-3xl font-bold text-neutral-900'>Settings</Text>
        </View>

        <Pressable
          className='flex-row items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 active:bg-red-700 disabled:opacity-50'
          onPress={handleLogout}
          disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator color='#ffffff' />
          ) : (
            <Text className='text-base font-semibold text-white'>Log Out</Text>
          )}
        </Pressable>
      </View>
    </SafeView>
  );
}
