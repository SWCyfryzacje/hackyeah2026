import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Callout, CalloutSubview, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { formatDistance } from '@/components/monument-marker';
import { EVENT_MARKER_COLOR } from '@/constants/events';
import { formatEventDates } from '@/utils/events';
import type {
  EventSuggestion,
  EventSuggestions,
} from '@/hooks/useEventSuggestions';

const SELECTED_COLOR = '#16a34a';

// Event titles listed in a shared-venue callout before "+N more".
const MAX_CALLOUT_EVENTS = 3;

const title = (s: EventSuggestion) =>
  s.events.length === 1
    ? s.events[0].title
    : (s.events[0].place ?? `${s.events.length} events`);

function AddToRouteLabel({ isSelected }: { isSelected: boolean }) {
  return (
    <Text
      style={{
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
      }}>
      {isSelected ? 'Remove from route' : '+ Add to route'}
    </Text>
  );
}

function EventSuggestionMarker({
  suggestion: s,
  isSelected,
  onToggle,
}: {
  suggestion: EventSuggestion;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const color = isSelected ? SELECTED_COLOR : EVENT_MARKER_COLOR;
  const buttonStyle = {
    marginTop: 8,
    backgroundColor: isSelected ? '#dc2626' : '#16a34a',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;

  return (
    <Marker
      // pinColor changes are ignored on Android unless the marker remounts
      key={`${s.id}-${color}`}
      coordinate={{ latitude: s.latitude, longitude: s.longitude }}
      pinColor={color}
      onPress={(e) => e?.stopPropagation?.()}>
      <Callout
        tooltip={false}
        onPress={
          Platform.OS === 'android'
            ? (e) => {
                e?.stopPropagation?.();
                onToggle();
              }
            : undefined
        }>
        <View style={{ minWidth: 180, maxWidth: 260, padding: 4 }}>
          <Text
            style={{ fontWeight: '700', fontSize: 14, color: '#171717' }}
            numberOfLines={2}>
            {title(s)}
          </Text>
          {s.events.length === 1 ? (
            <Text
              style={{ fontSize: 12, color: EVENT_MARKER_COLOR, marginTop: 2 }}>
              {formatEventDates(s.events[0])}
            </Text>
          ) : (
            <>
              {s.events.slice(0, MAX_CALLOUT_EVENTS).map((e) => (
                <Text
                  key={e.id}
                  style={{ fontSize: 12, color: '#404040', marginTop: 4 }}
                  numberOfLines={1}>
                  • {e.title}{' '}
                  <Text style={{ color: '#737373' }}>
                    ({formatEventDates(e)})
                  </Text>
                </Text>
              ))}
              {s.events.length > MAX_CALLOUT_EVENTS && (
                <Text style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>
                  +{s.events.length - MAX_CALLOUT_EVENTS} more
                </Text>
              )}
            </>
          )}
          <Text style={{ fontSize: 12, color: '#525252', marginTop: 2 }}>
            {formatDistance(s.distanceM)} from route
          </Text>

          {Platform.OS === 'ios' ? (
            <CalloutSubview
              onPress={onToggle}
              style={buttonStyle}>
              <AddToRouteLabel isSelected={isSelected} />
            </CalloutSubview>
          ) : (
            <View style={buttonStyle}>
              <AddToRouteLabel isSelected={isSelected} />
            </View>
          )}
        </View>
      </Callout>
    </Marker>
  );
}

/** Map markers for events near the route; the callout button adds/removes it as a stop. */
export function EventSuggestionMarkers({
  suggestions,
  selectedIds,
  toggle,
}: EventSuggestions) {
  return suggestions.map((s) => (
    <EventSuggestionMarker
      key={s.id}
      suggestion={s}
      isSelected={selectedIds.has(s.id)}
      onToggle={() => toggle(s.id)}
    />
  ));
}

/** Checklist of events near the route for the route panel. */
export function EventSuggestionList({
  suggestions,
  selectedIds,
  toggle,
}: EventSuggestions) {
  if (suggestions.length === 0) return null;

  return (
    <>
      <Text className='text-sm text-neutral-500'>
        Events along the way
        {selectedIds.size > 0
          ? ` · ${selectedIds.size} added`
          : ' — tap to add'}
      </Text>
      <ScrollView className='max-h-32'>
        {suggestions.map((s) => {
          const selected = selectedIds.has(s.id);
          const [first] = s.events;
          return (
            <Pressable
              key={s.id}
              className='flex-row items-center gap-2 py-1.5'
              onPress={() => toggle(s.id)}>
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected ? SELECTED_COLOR : '#a3a3a3'}
              />
              <View className='flex-1'>
                <Text numberOfLines={1}>{title(s)}</Text>
                <Text
                  className='text-xs'
                  style={{ color: EVENT_MARKER_COLOR }}
                  numberOfLines={1}>
                  {s.events.length === 1
                    ? formatEventDates(first)
                    : `${s.events.length} events`}
                </Text>
              </View>
              <Text className='text-xs text-neutral-500'>
                {formatDistance(s.distanceM)} off
              </Text>
              {s.events.length === 1 && (
                <Pressable
                  hitSlop={8}
                  onPress={() => void Linking.openURL(first.url)}>
                  <Ionicons
                    name='open-outline'
                    size={16}
                    color='#2563eb'
                  />
                </Pressable>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
