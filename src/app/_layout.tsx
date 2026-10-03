import { Stack } from 'expo-router';
import '@/global.css';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle='light-content' />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
