import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GroupRouteListItem } from '@/types/group-routes';
import {
  formatParticipants,
  formatRouteSize,
  formatTimeRange,
} from '@/utils/group-route-format';
import StatusBadge from './status-badge';

type Props = {
  route: GroupRouteListItem;
  onPress: () => void;
};

function InfoRow({
  icon,
  text,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View className='flex-row items-center gap-1.5'>
      <Ionicons
        name={icon}
        size={14}
        color='#64748b'
      />
      <Text
        className='flex-1 text-xs text-neutral-600'
        numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** Shared route on the "Razem" list. */
export default function GroupRouteCard({ route, onPress }: Props) {
  const live = route.status === 'live';
  const size = formatRouteSize(route.distanceM, route.durationS);

  return (
    <Pressable
      onPress={onPress}
      className={`gap-2.5 rounded-3xl border p-5 shadow-xs active:scale-[0.99] ${
        live ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200/80 bg-white'
      }`}>
      <View className='flex-row items-start justify-between gap-3'>
        <Text
          className='flex-1 text-base font-bold text-slate-900'
          numberOfLines={2}>
          {route.title}
        </Text>
        <View className='flex-row items-center gap-1.5'>
          {route.visibility === 'private' && (
            <View className='flex-row items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5'>
              <Ionicons
                name='lock-closed'
                size={10}
                color='#64748b'
              />
              <Text className='text-xs font-semibold text-slate-600'>
                Prywatna
              </Text>
            </View>
          )}
          <StatusBadge status={route.status} />
        </View>
      </View>

      <View className='gap-1.5'>
        <InfoRow
          icon='time-outline'
          text={formatTimeRange(route.plannedStart, route.plannedEnd)}
        />
        <InfoRow
          icon='person-outline'
          text={`${route.creatorNick} · ${formatParticipants(route.participantCount)}`}
        />
        {size && (
          <InfoRow
            icon='walk-outline'
            text={size}
          />
        )}
        {route.eventTitle && (
          <InfoRow
            icon='ticket-outline'
            text={route.eventTitle}
          />
        )}
      </View>
    </Pressable>
  );
}
