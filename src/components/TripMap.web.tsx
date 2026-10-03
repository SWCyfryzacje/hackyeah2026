import { Text, View } from 'react-native';

// react-native-maps has no web support.
export default function TripMap() {
  return (
    <View className='flex-1 items-center justify-center bg-neutral-900'>
      <Text className='text-neutral-400'>Map is available on iOS and Android only.</Text>
    </View>
  );
}
