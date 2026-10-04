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
    <View className='flex-row items-center justify-between rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs'>
      <View>
        <Text className='text-xs font-bold uppercase tracking-wider text-slate-500'>Kod dołączenia</Text>
        <Text
          className='text-xl font-extrabold tracking-widest text-slate-900'
          selectable>
          {code}
        </Text>
      </View>
      <Pressable
        onPress={onShare}
        className='flex-row items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2.5 active:bg-indigo-100'>
        <Ionicons
          name='share-outline'
          size={16}
          color='#4f46e5'
        />
        <Text className='text-sm font-bold text-indigo-600'>Udostępnij</Text>
      </Pressable>
    </View>
  );
}
