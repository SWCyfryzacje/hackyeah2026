import { Pressable, Text, View } from 'react-native';
import { MONUMENT_LEVELS } from '@/constants/monuments';
import useMonumentLevel from '@/hooks/useMonumentLevel';

type Props = {
  className?: string;
};

/** Chips to choose how well-known the shown monuments must be. */
export default function MonumentLevelPicker({ className = '' }: Props) {
  const [minScore, setMinScore] = useMonumentLevel();

  return (
    <View className={`flex-row gap-1 rounded-xl bg-neutral-200 p-1 ${className}`}>
      {MONUMENT_LEVELS.map((level) => {
        const active = level.minScore === minScore;
        return (
          <Pressable
            key={level.minScore}
            className={`flex-1 items-center rounded-lg py-1 ${active ? 'bg-white' : ''}`}
            onPress={() => setMinScore(level.minScore)}>
            <Text
              className={`text-xs font-semibold ${active ? 'text-blue-600' : 'text-neutral-600'}`}>
              {level.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
