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
    <View className='gap-1 border-t border-neutral-200 bg-white px-3 pt-2 pb-3'>
      <View className='flex-row items-end gap-2'>
        <TextInput
          className='max-h-32 min-h-11 flex-1 rounded-2xl border border-neutral-300 bg-white px-4 py-2.5 text-base text-neutral-900'
          value={text}
          onChangeText={setText}
          placeholder='Napisz wiadomość…'
          placeholderTextColor='#9ca3af'
          multiline
          maxLength={GROUP_ROUTE_MESSAGE_MAX_LENGTH}
        />
        <Pressable
          className={`h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 active:bg-blue-700 ${disabled ? 'opacity-50' : ''}`}
          onPress={submit}
          disabled={disabled}>
          {sending ? (
            <ActivityIndicator color='white' />
          ) : (
            <Text className='font-semibold text-white'>Wyślij</Text>
          )}
        </Pressable>
      </View>
      <Text className='text-right text-xs text-neutral-400'>
        {text.length}/{GROUP_ROUTE_MESSAGE_MAX_LENGTH}
      </Text>
    </View>
  );
}
