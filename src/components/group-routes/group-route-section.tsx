import { Text, View } from 'react-native';
import type { GroupRouteListItem } from '@/types/group-routes';
import GroupRouteCard from './group-route-card';

type Props = {
  title: string;
  routes: GroupRouteListItem[];
  emptyText: string;
  onOpen: (routeId: string) => void;
};

/** Titled list of route cards with an empty state. */
export default function GroupRouteSection({
  title,
  routes,
  emptyText,
  onOpen,
}: Props) {
  return (
    <View className='gap-3'>
      <Text className='text-lg font-bold text-neutral-900'>{title}</Text>
      {routes.length === 0 ? (
        <View className='items-center rounded-2xl border border-dashed border-neutral-300 p-5'>
          <Text className='text-center text-sm text-neutral-500'>
            {emptyText}
          </Text>
        </View>
      ) : (
        routes.map((r) => (
          <GroupRouteCard
            key={r.id}
            route={r}
            onPress={() => onOpen(r.id)}
          />
        ))
      )}
    </View>
  );
}
