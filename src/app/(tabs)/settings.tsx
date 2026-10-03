import { useAuth, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/auth-ui';
import SafeView from '@/components/safe-view';

export default function Settings() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  return (
    <SafeView className='flex-1 gap-6 bg-amber-50 p-6'>
      <Text className='text-3xl font-bold text-blue-500'>Settings</Text>

      <View className='gap-4 rounded-2xl bg-white p-5'>
        <Text className='text-lg font-semibold text-gray-900'>Account</Text>

        {!isLoaded ? (
          <ActivityIndicator color='#3b82f6' />
        ) : isSignedIn ? (
          <>
            <View className='gap-1'>
              <Text className='text-sm text-gray-500'>Signed in as</Text>
              <Text className='text-base font-semibold text-gray-900'>
                {user?.primaryEmailAddress?.emailAddress}
              </Text>
            </View>
            <Button
              title='Sign out'
              variant='secondary'
              onPress={() => signOut()}
            />
          </>
        ) : (
          <>
            <Text className='text-base text-gray-700'>
              You're not signed in.
            </Text>
            <Button
              title='Sign in'
              onPress={() => router.push('/sign-in')}
            />
            <Button
              title='Create account'
              variant='secondary'
              onPress={() => router.push('/sign-up')}
            />
          </>
        )}
      </View>
    </SafeView>
  );
}
