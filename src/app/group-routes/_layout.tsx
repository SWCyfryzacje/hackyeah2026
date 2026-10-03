import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import LoadingScreen from '@/components/loading-screen';

// Shared routes screens; titles are set per screen via <Stack.Screen options>.
export default function GroupRoutesLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect href='/(auth)/sign-in' />;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Wróć',
        headerTintColor: '#2563eb',
        headerTitleStyle: { color: '#171717' },
      }}>
      <Stack.Screen
        name='new'
        options={{ title: 'Nowa wspólna trasa' }}
      />
      <Stack.Screen
        name='[id]/index'
        options={{ title: 'Trasa' }}
      />
      <Stack.Screen
        name='[id]/chat'
        options={{ title: 'Czat' }}
      />
      <Stack.Screen
        name='join/[code]'
        options={{ title: 'Dołączanie' }}
      />
    </Stack>
  );
}
