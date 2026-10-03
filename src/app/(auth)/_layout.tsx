import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import LoadingScreen from '@/components/loading-screen';

export default function RootLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn) return <Redirect href='/(tabs)' />;

  return (
    <Stack
      initialRouteName='sign-in'
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name='sign-in' />
      <Stack.Screen name='sign-up' />
    </Stack>
  );
}
