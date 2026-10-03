import { ActivityIndicator, Text } from 'react-native';
import SafeView from '@/components/safe-view';

type Props = {
  message?: string;
};

export default function LoadingScreen({ message }: Props) {
  return (
    <SafeView className='bg-background flex-1 items-center justify-center p-5'>
      <ActivityIndicator
        size='large'
        color='blue'
        className='my-4'
      />

      {message && (
        <Text className='font-sans-medium text-muted-foreground text-center text-base'>
          {message}
        </Text>
      )}
    </SafeView>
  );
}
