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
    <View className='gap-2'>
      <Text className='text-base font-bold text-neutral-900'>
        Uczestnicy · {formatParticipants(participants.length)}
      </Text>
      {participants.map((p) => (
        <View
          key={p.userId}
          className='flex-row items-center gap-3'>
          {p.avatarUrl ? (
            <Image
              source={{ uri: p.avatarUrl }}
              className='h-9 w-9 rounded-full bg-neutral-200'
            />
          ) : (
            <View className='h-9 w-9 items-center justify-center rounded-full bg-blue-100'>
              <Text className='text-sm font-bold text-blue-700'>
                {p.nick.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text
            className='flex-1 text-sm text-neutral-900'
            numberOfLines={1}>
            {p.nick}
            {p.userId === myUserId ? ' (Ty)' : ''}
          </Text>
          {p.role === 'creator' && (
            <Text className='rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800'>
              twórca
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
