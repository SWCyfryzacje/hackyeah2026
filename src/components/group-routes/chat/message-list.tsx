import { useMemo } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { ChatMessage } from '@/hooks/group-routes/useRouteChat';
import MessageBubble from './message-bubble';

type Props = {
  messages: ChatMessage[];
};

export default function MessageList({ messages }: Props) {
  // Inverted list keeps the newest message at the bottom and in view.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  if (messages.length === 0) {
    return (
      <View className='flex-1 items-center justify-center p-6'>
        <Text className='text-center text-neutral-500'>
          Brak wiadomości. Napisz pierwszą!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      inverted
      data={data}
      keyExtractor={(m) => String(m.id)}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerClassName='gap-2 p-3'
      keyboardShouldPersistTaps='handled'
    />
  );
}
