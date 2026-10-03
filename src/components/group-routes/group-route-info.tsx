import type { ComponentProps } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GroupRoute } from '@/types/group-routes';
import {
  formatDateTime,
  formatRouteSize,
  formatTime,
  formatTimeRange,
} from '@/utils/group-route-format';
import StatusBadge from './status-badge';

function Row({
  icon,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  children: string;
}) {
  return (
    <View className='flex-row items-center gap-2'>
      <Ionicons
        name={icon}
        size={16}
        color='#64748b'
      />
      <Text className='flex-1 text-sm text-neutral-700'>{children}</Text>
    </View>
  );
}

/** Title, status, times, size, event and description of a shared route. */
export default function GroupRouteInfo({ route }: { route: GroupRoute }) {
  const size = formatRouteSize(route.distanceM, route.durationS);
  const { event } = route;

  return (
    <View className='gap-3'>
      <View className='gap-1.5'>
        <View className='flex-row items-center gap-2'>
          <StatusBadge status={route.status} />
          {route.visibility === 'private' && (
            <View className='flex-row items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5'>
              <Ionicons
                name='lock-closed'
                size={10}
                color='#525252'
              />
              <Text className='text-xs font-semibold text-neutral-600'>
                Prywatna
              </Text>
            </View>
          )}
        </View>
        <Text className='text-2xl font-bold text-neutral-900'>
          {route.title}
        </Text>
      </View>

      <View className='gap-1.5'>
        <Row icon='time-outline'>
          {`Plan: ${formatTimeRange(route.plannedStart, route.plannedEnd)}`}
        </Row>
        {route.startedAt && (
          <Row icon='play-circle-outline'>
            {`Rozpoczęta: ${formatTime(route.startedAt)}`}
          </Row>
        )}
        {route.endedAt && (
          <Row icon='stop-circle-outline'>
            {`${route.status === 'cancelled' ? 'Anulowana' : 'Zakończona'}: ${formatDateTime(route.endedAt)}`}
          </Row>
        )}
        {size && <Row icon='walk-outline'>{size}</Row>}
      </View>

      {event && (
        <Pressable
          onPress={() => Linking.openURL(event.url).catch(() => {})}
          className='flex-row items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 active:opacity-80'>
          <Ionicons
            name='ticket'
            size={20}
            color='#d97706'
          />
          <View className='flex-1'>
            <Text
              className='text-sm font-bold text-amber-900'
              numberOfLines={2}>
              {event.title}
            </Text>
            <Text
              className='text-xs text-amber-900/80'
              numberOfLines={1}>
              {[event.dateText ?? event.startDate, event.place]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Ionicons
            name='open-outline'
            size={16}
            color='#d97706'
          />
        </Pressable>
      )}

      {route.description ? (
        <Text className='text-sm leading-5 text-neutral-700'>
          {route.description}
        </Text>
      ) : null}
    </View>
  );
}
