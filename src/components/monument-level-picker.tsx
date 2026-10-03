import { Pressable, Text, View } from 'react-native';
import { MONUMENT_LEVELS } from '@/constants/monuments';
import useMonumentLevel from '@/hooks/useMonumentLevel';

type Props = {
  className?: string;
};

export default function MonumentLevelPicker({ className = '' }: Props) {
  const [minScore, setMinScore] = useMonumentLevel();

  return (
    <View
      className={`flex-col gap-1 rounded-xl bg-neutral-200 p-2 ${className}`}>
      <Text className='text-center text-lg font-semibold'>Monument Group</Text>
      <View className='w-full flex-row'>
        {MONUMENT_LEVELS.map((level) => {
          const active = level.minScore === minScore;

          return (
            <Pressable
              key={level.minScore}
              className={`flex-1 items-center rounded-lg p-2 ${active ? 'bg-white' : ''}`}
              onPress={() => setMinScore(level.minScore)}>
              <Text
                className={`text-xs font-semibold ${active ? 'text-blue-600' : 'text-neutral-600'}`}>
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
