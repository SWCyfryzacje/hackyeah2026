import { Pressable, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MonumentMarker, { formatDistance } from '@/components/monument-marker';
import type { MonumentSuggestions } from '@/hooks/useMonumentSuggestions';
import MonumentLevelPicker from '@/components/monument-level-picker';

const SELECTED_COLOR = '#16a34a';
const SUGGESTED_COLOR = '#d97706';

/** Map markers for suggested monuments; tapping one adds/removes it as a stop. */
export function MonumentSuggestionMarkers({
  suggestions,
  selectedIds,
  toggle,
}: MonumentSuggestions) {
  return suggestions.map((m) => (
    <MonumentMarker
      key={m.id}
      monument={m}
      color={selectedIds.has(m.id) ? SELECTED_COLOR : SUGGESTED_COLOR}
      onPress={() => toggle(m.id)}
    />
  ));
}

/** Checklist of suggested monuments for the route panel. */
export function MonumentSuggestionList({
  suggestions,
  total,
  selectedIds,
  toggle,
}: MonumentSuggestions) {
  if (total === 0) return null;

  return (
    <>
      <Text className='text-sm text-neutral-500'>
        Monuments along the way
        {selectedIds.size > 0 ? ` · ${selectedIds.size} added` : ' — tap to add'}
      </Text>
      <MonumentLevelPicker />
      {suggestions.length === 0 && (
        <Text className='text-xs text-neutral-500'>
          None at this level — try a broader one
        </Text>
      )}
      <ScrollView className='max-h-40'>
        {suggestions.map((m) => {
          const selected = selectedIds.has(m.id);
          return (
            <Pressable
              key={m.id}
              className='flex-row items-center gap-2 py-1.5'
              onPress={() => toggle(m.id)}>
              <Ionicons
                name={selected ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected ? SELECTED_COLOR : '#a3a3a3'}
              />
              <Text
                className='flex-1'
                numberOfLines={1}>
                {m.name}
              </Text>
              <Text className='text-xs text-neutral-500'>
                {formatDistance(m.distanceM)} off
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
