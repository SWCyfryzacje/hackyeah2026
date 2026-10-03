import { Text, View } from 'react-native';
import type { ChatMessage } from '@/hooks/group-routes/useRouteChat';

const pad = (n: number) => String(n).padStart(2, '0');

/** HH:MM, prefixed with DD.MM for messages not from today. */
function formatTime(d: Date) {
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${time}`;
}

type Props = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: Props) {
  const { mine } = message;

  return (
    <View
      className={`max-w-[80%] gap-0.5 rounded-2xl px-3 py-2 ${mine ? 'self-end rounded-br-sm bg-blue-600' : 'self-start rounded-bl-sm bg-neutral-100'}`}>
      <Text
        className={`text-xs font-semibold ${mine ? 'text-blue-100' : 'text-neutral-600'}`}>
        {mine ? 'Ty' : message.nick}
      </Text>
      <Text
        className={`text-[15px] ${mine ? 'text-white' : 'text-neutral-900'}`}>
        {message.body}
      </Text>
      <Text
        className={`self-end text-[11px] ${mine ? 'text-blue-100' : 'text-neutral-400'}`}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}
