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
      className={`flex-col gap-2 rounded-3xl border border-slate-200/80 bg-white/95 p-3.5 shadow-md ${className}`}>
      <Text className='text-center text-xs font-bold uppercase tracking-wider text-slate-700'>
        Monument Importance
      </Text>
      <View className='w-full flex-row rounded-2xl bg-slate-100 p-1'>
        {MONUMENT_LEVELS.map((level) => {
          const active = level.minScore === minScore;

          return (
            <Pressable
              key={level.minScore}
              className={`flex-1 items-center justify-center rounded-xl py-2 ${
                active ? 'bg-white shadow-xs' : 'active:bg-slate-200/60'
              }`}
              onPress={() => setMinScore(level.minScore)}>
              <Text
                className={`text-xs font-bold ${
                  active ? 'text-indigo-600' : 'text-slate-600'
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
