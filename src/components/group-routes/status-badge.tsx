import { Text, View } from 'react-native';
import {
  GROUP_ROUTE_STATUS_LABELS,
  type GroupRouteStatus,
} from '@/types/group-routes';

const STATUS_STYLES: Record<GroupRouteStatus, { box: string; text: string }> = {
  scheduled: { box: 'bg-blue-100', text: 'text-blue-700' },
  live: { box: 'bg-green-600', text: 'text-white' },
  finished: { box: 'bg-neutral-200', text: 'text-neutral-600' },
  cancelled: { box: 'bg-red-100', text: 'text-red-700' },
};

export default function StatusBadge({ status }: { status: GroupRouteStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${style.box}`}>
      <Text className={`text-xs font-bold ${style.text}`}>
        {GROUP_ROUTE_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
