import { Image, Text, View } from 'react-native';
import type { GroupRouteParticipant } from '@/types/group-routes';
import { formatParticipants } from '@/utils/group-route-format';

type Props = {
  participants: GroupRouteParticipant[];
  myUserId: string | null | undefined;
};

/** Nick + avatar of everyone on the route (creator first, from the RPC). */
export default function ParticipantList({ participants, myUserId }: Props) {
  return (
    <View className='gap-2.5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs'>
      <Text className='text-xs font-bold uppercase tracking-wider text-slate-500'>
        Uczestnicy · {formatParticipants(participants.length)}
      </Text>
      <View className='gap-2'>
        {participants.map((p) => (
          <View
            key={p.userId}
            className='flex-row items-center gap-3 py-1'>
            {p.avatarUrl ? (
              <Image
                source={{ uri: p.avatarUrl }}
                className='h-9 w-9 rounded-full bg-slate-200'
              />
            ) : (
              <View className='h-9 w-9 items-center justify-center rounded-full bg-indigo-100'>
                <Text className='text-xs font-bold text-indigo-700'>
                  {p.nick.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              className='flex-1 text-sm font-semibold text-slate-900'
              numberOfLines={1}>
              {p.nick}
              {p.userId === myUserId ? ' (Ty)' : ''}
            </Text>
            {p.role === 'creator' && (
              <Text className='rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider'>
                twórca
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
