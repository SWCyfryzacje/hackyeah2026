import { Pressable, Text, View } from 'react-native';
import { Href, Link } from 'expo-router';

type AuthFooterLinkProps = {
  promptText: string;
  linkText: string;
  href: Href;
};

export default function AuthFooterLink({
  promptText,
  linkText,
  href,
}: AuthFooterLinkProps) {
  return (
    <View className='flex-row items-center justify-center gap-1.5'>
      <Text className='text-sm text-slate-500'>{promptText}</Text>
      <Link
        href={href}
        asChild>
        <Pressable className='active:opacity-80'>
          <Text className='text-sm font-bold text-indigo-600'>
            {linkText}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
