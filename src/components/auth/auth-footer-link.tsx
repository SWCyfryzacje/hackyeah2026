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
      <Text className='text-sm text-neutral-600'>{promptText}</Text>
      <Link
        href={href}
        asChild>
        <Pressable>
          <Text className='text-sm font-semibold text-blue-600'>
            {linkText}
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}
