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
          ? 'border-indigo-600 bg-indigo-600 shadow-xs'
          : 'border-slate-200 bg-white active:bg-slate-50'
      }`}>
      <Text
        className={`text-sm font-bold ${
          selected ? 'text-white' : 'text-slate-700'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}
