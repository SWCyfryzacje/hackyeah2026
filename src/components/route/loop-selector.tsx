import { Pressable, Text, View } from 'react-native';
import { DEFAULT_LOOP_OPTIONS, type LoopPreset } from '@/constants/map';

type LoopSelectorProps = {
  options?: LoopPreset[];
  disabled?: boolean;
  onSelect: (preset: LoopPreset) => void;
};

export default function LoopSelector({
  options = DEFAULT_LOOP_OPTIONS,
  disabled = false,
  onSelect,
}: LoopSelectorProps) {
  return (
    <View className='flex-row gap-2'>
      {options.map((preset) => (
        <Pressable
          key={preset.label}
          disabled={disabled}
          className={`will-change-pressable flex-1 items-center justify-center rounded-xl py-2.5 ${
            disabled
              ? 'bg-neutral-100 opacity-50'
              : 'bg-blue-50 active:bg-blue-100'
          }`}
          onPress={() => onSelect(preset)}>
          <Text className='text-xs font-semibold text-blue-600 sm:text-sm'>
            {preset.label} loop
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
