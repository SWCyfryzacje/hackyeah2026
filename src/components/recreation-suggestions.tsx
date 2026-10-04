import { Pressable, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MonumentMarker, { formatDistance } from '@/components/monument-marker';
import {
  RECREATION_CATEGORIES,
  RECREATION_MARKER_COLOR,
} from '@/constants/recreation';
import type { RecreationSuggestions } from '@/hooks/useRecreationSuggestions';
import {
  recreationDetails,
  recreationTitle,
  type RecreationArea,
} from '@/utils/recreation';
import type { Monument } from '@/utils/monuments';

const SELECTED_COLOR = '#16a34a';

// MonumentMarker already has the "+ Add to route" callout; feed it the same shape.
const asMarkerItem = (a: RecreationArea): Monument => ({
  id: a.id,
  name: recreationTitle(a),
  kind: a.category,
  description: recreationDetails(a) || null,
  imageUrl: null,
  score: 0,
  latitude: a.latitude,
  longitude: a.longitude,
  distanceM: a.distanceM,
  routeFraction: a.routeFraction,
});

/** Map markers for suggested recreation areas; the callout button adds/removes a stop. */
export function RecreationSuggestionMarkers({
  suggestions,
  selectedIds,
  toggle,
}: RecreationSuggestions) {
  return suggestions.map((a) => {
    const isSelected = selectedIds.has(a.id);
    return (
      <MonumentMarker
        key={a.id}
        monument={asMarkerItem(a)}
        color={isSelected ? SELECTED_COLOR : RECREATION_MARKER_COLOR}
        isSelected={isSelected}
        showAddButton
        onCalloutPress={() => toggle(a.id)}
      />
    );
  });
}

/** Checklist of parks, skateparks etc. along the route for the route panel. */
export function RecreationSuggestionList({
  suggestions,
  selectedIds,
  toggle,
}: RecreationSuggestions) {
  if (suggestions.length === 0) return null;

  return (
    <>
      <Text className='text-sm text-neutral-500'>
        Parks & recreation along the way
        {selectedIds.size > 0
          ? ` · ${selectedIds.size} added`
          : ' — tap to add'}
      </Text>
      <ScrollView className='max-h-40'>
        {suggestions.map((a) => {
          const selected = selectedIds.has(a.id);
          return (
            <Pressable
              key={a.id}
              className='flex-row items-center gap-2 py-1.5'
              onPress={() => toggle(a.id)}>
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected ? SELECTED_COLOR : '#a3a3a3'}
              />
              <Text
                className='flex-1'
                numberOfLines={1}>
                {recreationTitle(a)}
              </Text>
              <Text className='text-xs text-neutral-500'>
                {a.name ? `${RECREATION_CATEGORIES[a.category].label} · ` : ''}
                {a.distanceM < 1
                  ? 'on route'
                  : `${formatDistance(a.distanceM)} off`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
