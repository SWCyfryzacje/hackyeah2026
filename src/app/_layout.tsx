import { SplashScreen, Stack } from 'expo-router';
import '@/global.css';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import LoadingScreen from '@/components/loading-screen';
import useProfileSync from '@/hooks/useProfileSync';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

function RootLayoutContent() {
  const { isLoaded: authLoaded } = useAuth();
  useProfileSync();

  useEffect(() => {
    if (authLoaded) SplashScreen.hideAsync();
  }, [authLoaded]);

  if (!authLoaded) return <LoadingScreen />;

  return (
    <>
      <StatusBar style='dark' />

      <Stack
        initialRouteName='(auth)'
        screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(auth)' />
        <Stack.Screen name='(tabs)' />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}>
      <RootLayoutContent />
    </ClerkProvider>
  );
}
