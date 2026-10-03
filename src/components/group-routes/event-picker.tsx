import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useUpcomingEvents from '@/hooks/group-routes/useUpcomingEvents';

type Props = {
  value: number | null;
  onChange: (eventId: number | null) => void;
};

function Option({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className='flex-row items-center gap-2.5 py-2 active:opacity-70'>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? '#2563eb' : '#a3a3a3'}
      />
      <View className='flex-1'>
        <Text
          className='text-sm text-neutral-900'
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            className='text-xs text-neutral-500'
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Optional link to one of the upcoming events. */
export default function EventPicker({ value, onChange }: Props) {
  const { events, loading, error } = useUpcomingEvents();

  return (
    <View className='rounded-xl border border-neutral-300 bg-white px-3 py-1'>
      <Option
        title='Bez wydarzenia'
        selected={value == null}
        onPress={() => onChange(null)}
      />
      {loading && (
        <ActivityIndicator
          className='py-2'
          color='#2563eb'
        />
      )}
      {error && <Text className='py-2 text-xs text-red-500'>{error}</Text>}
      {events.map((e) => (
        <Option
          key={e.id}
          title={e.title}
          subtitle={[e.dateText ?? e.startDate, e.place]
            .filter(Boolean)
            .join(' · ')}
          selected={value === e.id}
          onPress={() => onChange(e.id)}
        />
      ))}
    </View>
  );
}
