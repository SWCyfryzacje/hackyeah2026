import { useMemo } from 'react';
import { Linking, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';
import { EVENT_MARKER_COLOR } from '@/constants/events';
import useMapEvents from '@/hooks/useMapEvents';
import useMapLayers from '@/hooks/useMapLayers';
import {
  formatEventDates,
  type EventHorizon,
  type MapEvent,
} from '@/utils/events';

// Lines listed in a shared-venue callout before "+N more".
const MAX_CALLOUT_EVENTS = 5;

/** Events at the same coordinates (e.g. several exhibitions at Wawel), soonest first. */
function groupByLocation(events: MapEvent[]) {
  const groups = new Map<string, MapEvent[]>();
  for (const e of events) {
    const key = `${e.latitude.toFixed(5)},${e.longitude.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()];
}

function EventLocationMarker({ events }: { events: MapEvent[] }) {
  const [first] = events;
  const single = events.length === 1;

  return (
    <Marker
      coordinate={{ latitude: first.latitude, longitude: first.longitude }}
      pinColor={EVENT_MARKER_COLOR}
      onCalloutPress={
        single ? () => void Linking.openURL(first.url) : undefined
      }>
      <Callout tooltip={false}>
        <View style={{ minWidth: 180, maxWidth: 260, padding: 4 }}>
          {single ? (
            <>
              <Text
                style={{ fontWeight: '700', fontSize: 14, color: '#171717' }}
                numberOfLines={2}>
                {first.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: EVENT_MARKER_COLOR,
                  marginTop: 2,
                }}>
                {formatEventDates(first)}
              </Text>
              {first.place ? (
                <Text
                  style={{ fontSize: 11, color: '#737373', marginTop: 2 }}
                  numberOfLines={2}>
                  {first.place}
                </Text>
              ) : null}
              <Text style={{ fontSize: 11, color: '#2563eb', marginTop: 6 }}>
                Tap for details
              </Text>
            </>
          ) : (
            <>
              <Text
                style={{ fontWeight: '700', fontSize: 14, color: '#171717' }}
                numberOfLines={2}>
                {first.place ?? `${events.length} events`}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: EVENT_MARKER_COLOR,
                  marginTop: 2,
                }}>
                {events.length} events
              </Text>
              {events.slice(0, MAX_CALLOUT_EVENTS).map((e) => (
                <Text
                  key={e.id}
                  style={{ fontSize: 12, color: '#404040', marginTop: 4 }}
                  numberOfLines={2}>
                  • {e.title}{' '}
                  <Text style={{ color: '#737373' }}>
                    ({formatEventDates(e)})
                  </Text>
                </Text>
              ))}
              {events.length > MAX_CALLOUT_EVENTS && (
                <Text style={{ fontSize: 11, color: '#737373', marginTop: 4 }}>
                  +{events.length - MAX_CALLOUT_EVENTS} more
                </Text>
              )}
            </>
          )}
        </View>
      </Callout>
    </Marker>
  );
}

type Props = {
  /** How far ahead to show events, e.g. `{ months: 5 }` or `{ days: 2 }`. */
  horizon: EventHorizon;
};

/** Violet markers for upcoming events; hidden when the events layer is switched off. */
export default function EventMarkers({ horizon }: Props) {
  const events = useMapEvents(horizon);
  const [layers] = useMapLayers();
  const groups = useMemo(() => groupByLocation(events), [events]);

  if (!layers.events) return null;
  return groups.map(([key, group]) => (
    <EventLocationMarker
      key={key}
      events={group}
    />
  ));
}
