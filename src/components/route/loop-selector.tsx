import { Pressable, Text, View } from 'react-native';

type LoopSelectorProps = {
  options?: number[];
  disabled?: boolean;
  onSelect: (km: number) => void;
};

export default function LoopSelector({
  options = [3, 5, 10],
  disabled = false,
  onSelect,
}: LoopSelectorProps) {
  return (
    <View className='flex-row gap-2'>
      {options.map((km) => (
        <Pressable
          key={km}
          disabled={disabled}
          className={`flex-1 items-center justify-center rounded-xl py-2.5 ${
            disabled
              ? 'bg-neutral-100 opacity-50'
              : 'bg-blue-50 active:bg-blue-100'
          }`}
          onPress={() => onSelect(km)}>
          <Text className='text-sm font-semibold text-blue-600'>
            {km} km loop
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
