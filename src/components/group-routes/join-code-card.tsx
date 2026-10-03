import { Pressable, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { groupRouteJoinLink } from '@/lib/group-routes';

type Props = {
  code: string;
  title: string;
};

/** Join code (members only) with a share button. */
export default function JoinCodeCard({ code, title }: Props) {
  const onShare = () =>
    Share.share({
      message: `Dołącz do trasy „${title}” w aplikacji. Kod: ${code}\n${groupRouteJoinLink(code)}`,
    }).catch(() => {});

  return (
    <View className='flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white p-3'>
      <View>
        <Text className='text-xs text-neutral-500'>Kod dołączenia</Text>
        <Text
          className='text-xl font-bold tracking-widest text-neutral-900'
          selectable>
          {code}
        </Text>
      </View>
      <Pressable
        onPress={onShare}
        className='flex-row items-center gap-1.5 rounded-xl bg-neutral-100 px-4 py-2.5 active:bg-neutral-200'>
        <Ionicons
          name='share-outline'
          size={16}
          color='#2563eb'
        />
        <Text className='text-sm font-semibold text-blue-600'>Udostępnij</Text>
      </Pressable>
    </View>
  );
}
