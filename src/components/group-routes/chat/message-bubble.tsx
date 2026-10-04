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
      className={`max-w-[80%] gap-1 rounded-3xl px-4 py-2.5 ${mine ? 'self-end rounded-br-sm bg-indigo-600 shadow-xs' : 'self-start rounded-bl-sm bg-slate-100 border border-slate-200/60'}`}>
      <Text
        className={`text-xs font-bold ${mine ? 'text-indigo-100' : 'text-slate-600'}`}>
        {mine ? 'Ty' : message.nick}
      </Text>
      <Text
        className={`text-sm leading-5 font-medium ${mine ? 'text-white' : 'text-slate-900'}`}>
        {message.body}
      </Text>
      <Text
        className={`self-end text-[10px] font-semibold ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}
