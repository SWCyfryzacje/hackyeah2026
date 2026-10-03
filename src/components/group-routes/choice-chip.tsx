import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Pill-shaped single-choice option (day, visibility). */
export default function ChoiceChip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-xl border py-2.5 ${
        selected
          ? 'border-blue-600 bg-blue-600'
          : 'border-neutral-300 bg-white active:bg-neutral-100'
      }`}>
      <Text
        className={`text-sm font-semibold ${
          selected ? 'text-white' : 'text-neutral-700'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
