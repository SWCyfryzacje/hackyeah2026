import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@clerk/expo';
import LoadingScreen from '@/components/loading-screen';

export default function TabsLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect href='/(auth)/sign-in' />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name='index' />
      <Tabs.Screen name='map' />
      <Tabs.Screen name='settings' />
    </Tabs>
  );
}
