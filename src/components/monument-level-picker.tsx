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
      className={`flex-col gap-2 rounded-2xl border border-neutral-300/80 bg-white/95 p-3 shadow-md ${className}`}>
      <Text className='text-center text-sm font-semibold text-neutral-900'>
        Monument Group
      </Text>
      <View className='w-full flex-row rounded-xl bg-neutral-100 p-1'>
        {MONUMENT_LEVELS.map((level) => {
          const active = level.minScore === minScore;

          return (
            <Pressable
              key={level.minScore}
              className={`flex-1 items-center justify-center rounded-lg py-1.5 ${
                active ? 'bg-white shadow-sm' : ''
              }`}
              onPress={() => setMinScore(level.minScore)}>
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-blue-600' : 'text-neutral-600'
                }`}>
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
