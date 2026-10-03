import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import LoadingScreen from '@/components/loading-screen';

// STUB (T0) — owned by teammate T3 (frontend).

export default function GroupRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect href='/(auth)/sign-in' />;

  return <Stack screenOptions={{ headerBackTitle: 'Wróć' }} />;
}
