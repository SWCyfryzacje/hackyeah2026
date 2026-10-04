import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatEventDates } from '@/utils/events';
import { eventsOnDay, type RouteEventVenue } from '@/utils/group-route-events';

type Props = {
  venues: RouteEventVenue[];
  dayOffset: number;
  /** False when no plannable day has all the venues' events on. */
  hasAllowedDay: boolean;
};

/**
 * Events picked on the Route tab, shown in the new shared route form: the
 * ones on the chosen day, or a warning when they never overlap.
 */
export default function RouteEventsInfo({
  venues,
  dayOffset,
  hasAllowedDay,
}: Props) {
  if (venues.length === 0) return null;

  // Each venue's event on that day, else its soonest one
  const shown = eventsOnDay(venues, dayOffset) ?? venues.map((v) => v[0]);

  return (
    <View className='gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5'>
      <View className='flex-row items-center gap-2'>
        <Ionicons
          name='calendar'
          size={16}
          color='#b45309'
        />
        <Text className='text-xs font-bold tracking-wider text-amber-800 uppercase'>
          Wydarzenia na trasie
        </Text>
      </View>
      {shown.map((e) => (
        <View key={e.id}>
          <Text
            className='text-sm font-semibold text-slate-900'
            numberOfLines={1}>
            {e.title}
          </Text>
          <Text className='text-xs text-slate-600'>{formatEventDates(e)}</Text>
        </View>
      ))}
      <Text className='text-xs font-medium text-amber-800'>
        {hasAllowedDay
          ? 'Trasę można zaplanować tylko na dzień, w którym trwają wybrane wydarzenia.'
          : 'Wybrane wydarzenia nie trwają razem w żadnym z najbliższych dni — wróć do trasy i zmień wybór.'}
      </Text>
    </View>
  );
}
