import { Text, View } from 'react-native';

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <View className='items-center gap-1.5'>
      <Text className='text-center text-3xl font-extrabold tracking-tight text-slate-900'>
        {title}
      </Text>
      <Text className='text-center text-sm font-medium text-slate-500'>{subtitle}</Text>
    </View>
  );
}
