import SafeView from '@/components/safe-view';
import { Text } from 'react-native';

export default function Map() {
  return (
    <SafeView className='flex-1 items-center justify-center bg-amber-50'>
      <Text className='text-2xl font-bold text-blue-500'>Map</Text>
    </SafeView>
  );
}
