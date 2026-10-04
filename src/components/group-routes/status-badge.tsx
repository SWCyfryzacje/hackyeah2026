import { Text, View } from 'react-native';
import {
  GROUP_ROUTE_STATUS_LABELS,
  type GroupRouteStatus,
} from '@/types/group-routes';

const STATUS_STYLES: Record<GroupRouteStatus, { box: string; text: string }> = {
  scheduled: { box: 'bg-indigo-50 border border-indigo-200/80', text: 'text-indigo-700' },
  live: { box: 'bg-emerald-600', text: 'text-white' },
  finished: { box: 'bg-slate-100 border border-slate-200', text: 'text-slate-600' },
  cancelled: { box: 'bg-rose-50 border border-rose-200', text: 'text-rose-700' },
};

export default function StatusBadge({ status }: { status: GroupRouteStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${style.box}`}>
      <Text className={`text-[11px] font-bold ${style.text}`}>
        {GROUP_ROUTE_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}
