import { ActivityIndicator, Text } from 'react-native';
import SafeView from '@/components/safe-view';

type Props = {
  message?: string;
};

export default function LoadingScreen({ message }: Props) {
  return (
    <SafeView className='flex-1 items-center justify-center bg-slate-50 p-6'>
      <ActivityIndicator
        size='large'
        color='#4f46e5'
        className='my-4'
      />

      {message && (
        <Text className='text-center text-sm font-medium text-slate-500'>
          {message}
        </Text>
      )}
    </SafeView>
  );
}
