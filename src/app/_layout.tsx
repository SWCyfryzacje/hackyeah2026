import { Stack } from 'expo-router';
import '@/global.css';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style='light' />
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName='(tabs)'>
        <Stack.Screen name='(auth)' />
        <Stack.Screen name='(tabs)' />
      </Stack>
    </>
  );
}
