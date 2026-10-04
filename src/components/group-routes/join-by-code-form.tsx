import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSupabase } from '@/lib/supabase';
import { joinGroupRouteByCode } from '@/lib/group-routes';

const CODE_LENGTH = 6;

type Props = {
  onJoined: (routeId: string) => void;
};

/** "Dołącz kodem" box on the "Razem" tab. */
export default function JoinByCodeForm({ onJoined }: Props) {
  const supabase = useSupabase();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canJoin = code.length === CODE_LENGTH && !busy;

  const onJoin = async () => {
    if (!canJoin) return;
    setBusy(true);
    setError(null);
    try {
      const id = await joinGroupRouteByCode(supabase, code);
      setCode('');
      onJoined(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się dołączyć.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className='gap-2.5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs'>
      <Text className='text-xs font-bold uppercase tracking-wider text-slate-700'>Dołącz kodem</Text>
      <View className='flex-row gap-2'>
        <TextInput
          className='h-12 flex-1 rounded-xl border border-slate-200 bg-white pl-4 text-base font-bold tracking-widest text-slate-900 shadow-xs'
          value={code}
          onChangeText={(t) => {
            setCode(
              t
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, CODE_LENGTH)
            );
            setError(null);
          }}
          placeholder='np. K7QX2M'
          placeholderTextColor='#94a3b8'
          autoCapitalize='characters'
          autoCorrect={false}
          maxLength={CODE_LENGTH}
          returnKeyType='go'
          onSubmitEditing={onJoin}
        />
        <Pressable
          onPress={onJoin}
          disabled={!canJoin}
          className={`h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 active:bg-indigo-700 shadow-xs active:scale-[0.99] ${
            canJoin ? '' : 'opacity-50'
          }`}>
          {busy ? (
            <ActivityIndicator color='#ffffff' />
          ) : (
            <Text className='text-sm font-bold text-white'>Dołącz</Text>
          )}
        </Pressable>
      </View>
      {error && <Text className='text-xs font-medium text-rose-500'>{error}</Text>}
    </View>
  );
}
