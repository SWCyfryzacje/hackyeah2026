import { Text, View } from 'react-native';

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View className='items-center gap-2'>
      <Text className='text-center text-3xl font-bold text-neutral-900'>
        {title}
      </Text>
      <Text className='text-center text-sm text-neutral-600'>{subtitle}</Text>
    </View>
  );
}
