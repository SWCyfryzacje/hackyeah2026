import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MonumentMarker, { formatDistance } from '@/components/monument-marker';
import type { MonumentSuggestions } from '@/hooks/useMonumentSuggestions';
import MonumentLevelPicker from '@/components/monument-level-picker';

const SELECTED_COLOR = '#16a34a';
const SUGGESTED_COLOR = '#d97706';

/** Map markers for suggested monuments; tapping callout button adds/removes it as a stop. */
export function MonumentSuggestionMarkers({
  suggestions,
  selectedIds,
  toggle,
}: MonumentSuggestions) {
  return suggestions.map((m) => {
    const isSelected = selectedIds.has(m.id);
    return (
      <MonumentMarker
        key={m.id}
        monument={m}
        color={isSelected ? SELECTED_COLOR : SUGGESTED_COLOR}
        isSelected={isSelected}
        showAddButton
        onCalloutPress={() => toggle(m.id)}
      />
    );
  });
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
      <Text className='text-center text-xs font-bold uppercase tracking-wider text-slate-500'>
        Monuments along the way
        {selectedIds.size > 0
          ? ` · ${selectedIds.size} added`
          : ' — tap to add'}
      </Text>
      <MonumentLevelPicker />
      {suggestions.length === 0 && (
        <Text className='text-center text-xs text-slate-400'>
          None at this level — try a broader one
        </Text>
      )}
      <ScrollView
        className='max-h-48'
        contentContainerClassName='gap-2 py-1'>
        {suggestions.map((m) => {
          const selected = selectedIds.has(m.id);
          return (
            <Pressable
              key={m.id}
              className={`flex-row items-center justify-between rounded-2xl px-3.5 py-2.5 ${
                selected
                  ? 'border border-emerald-500 bg-emerald-50/90 shadow-xs'
                  : 'border border-slate-200 bg-slate-50/70 active:bg-slate-100'
              }`}
              onPress={() => toggle(m.id)}>
              <View className='flex-1 pr-2'>
                <Text
                  className={`text-sm ${
                    selected
                      ? 'font-bold text-emerald-950'
                      : 'font-semibold text-slate-800'
                  }`}
                  numberOfLines={1}>
                  {m.name}
                </Text>
                <Text className='text-xs font-medium text-slate-500'>
                  {formatDistance(m.distanceM)} off
                </Text>
              </View>

              {selected && (
                <View className='flex-row items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 shadow-xs'>
                  <Ionicons
                    name='checkmark'
                    size={12}
                    color='#ffffff'
                  />
                  <Text className='text-xs font-bold text-white'>
                    Selected
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
