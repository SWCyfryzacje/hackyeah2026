import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GROUP_ROUTE_MESSAGE_MAX_LENGTH } from '@/types/group-routes';

type Props = {
  /** Rejects when the message wasn't sent; the text is kept then. */
  onSend: (body: string) => Promise<void>;
  sending: boolean;
};

export default function MessageInput({ onSend, sending }: Props) {
  const [text, setText] = useState('');
  const disabled = sending || text.trim().length === 0;

  const submit = async () => {
    if (disabled) return;
    try {
      await onSend(text);
      setText('');
    } catch {
      // The error is shown by the screen.
    }
  };

  return (
    <View className='gap-1.5 border-t border-slate-100 bg-white px-4 pt-3 pb-3'>
      <View className='flex-row items-end gap-2.5'>
        <TextInput
          className='max-h-32 min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs'
          value={text}
          onChangeText={setText}
          placeholder='Napisz wiadomość…'
          placeholderTextColor='#94a3b8'
          multiline
          maxLength={GROUP_ROUTE_MESSAGE_MAX_LENGTH}
        />
        <Pressable
          className={`h-12 items-center justify-center rounded-xl bg-indigo-600 px-5 active:bg-indigo-700 shadow-xs active:scale-[0.99] ${disabled ? 'opacity-50' : ''}`}
          onPress={submit}
          disabled={disabled}>
          {sending ? (
            <ActivityIndicator color='white' />
          ) : (
            <Text className='text-sm font-bold text-white'>Wyślij</Text>
          )}
        </Pressable>
      </View>
      <Text className='text-right text-[11px] font-semibold text-slate-400'>
        {text.length}/{GROUP_ROUTE_MESSAGE_MAX_LENGTH}
      </Text>
    </View>
  );
}
