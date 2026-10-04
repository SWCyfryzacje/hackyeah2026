import { useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSupabase } from '@/lib/supabase';
import {
  fetchGroupRoute,
  groupRouteChannels,
  toGroupRoute,
} from '@/lib/group-routes';
import {
  OPEN_GROUP_ROUTE_STATUSES,
  type GroupRoute,
  type GroupRouteRow,
} from '@/types/group-routes';
import useRouteChat from '@/hooks/group-routes/useRouteChat';
import LoadingScreen from '@/components/loading-screen';
import MessageList from '@/components/group-routes/chat/message-list';
import MessageInput from '@/components/group-routes/chat/message-input';

const POLL_INTERVAL_MS = 5000;

/** The route (for its title and status), kept live so the chat locks when it ends. undefined = loading. */
function useChatRoute(id: string) {
  const supabase = useSupabase();
  const [route, setRoute] = useState<GroupRoute | null | undefined>();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    const load = () =>
      fetchGroupRoute(supabase, id)
        .then((r) => {
          if (!cancelled) setRoute(r);
        })
        .catch((e: unknown) => {
          console.warn('Chat route error:', e instanceof Error ? e.message : e);
          if (!cancelled)
            setRoute((prev) => (prev === undefined ? null : prev));
        });

    load();

    const channel = supabase
      .channel(
        `${groupRouteChannels.route(id)}:chat:${Math.random().toString(36).slice(2)}`
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_routes',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const next = toGroupRoute(payload.new as GroupRouteRow);
          // The payload has no joined event; keep the one we have.
          setRoute((prev) => ({ ...next, event: prev?.event ?? null }));
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          if (poll) clearInterval(poll);
          poll = null;
          load();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!poll) poll = setInterval(load, POLL_INTERVAL_MS);
        }
      });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [supabase, id]);

  return route;
}

export default function GroupRouteChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const route = useChatRoute(id);
  const canPost = !!route && OPEN_GROUP_ROUTE_STATUSES.includes(route.status);
  const { messages, send, sending, error } = useRouteChat(id, canPost);
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const insets = useSafeAreaInsets();

  const header = (
    <Stack.Screen
      options={{ title: route?.title ? `Czat: ${route.title}` : 'Czat' }}
    />
  );

  if (route === undefined) {
    return (
      <>
        {header}
        <LoadingScreen message='Ładowanie czatu…' />
      </>
    );
  }

  if (route === null) {
    return (
      <View className='flex-1 items-center justify-center bg-slate-50 p-6'>
        {header}
        <Text className='text-center text-sm font-medium text-slate-500'>
          Nie znaleziono trasy lub nie masz do niej dostępu.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className='flex-1 bg-slate-50'
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}>
      {header}
      <MessageList messages={messages} />
      {error ? (
        <Text className='bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 border-t border-rose-200'>
          {error}
        </Text>
      ) : null}
      <View style={{ paddingBottom: insets.bottom }}>
        {canPost ? (
          <MessageInput
            onSend={send}
            sending={sending}
          />
        ) : (
          <Text className='border-t border-slate-200 bg-slate-100/80 px-4 py-4 text-center text-xs font-medium text-slate-500'>
            Trasa zakończona — czat jest tylko do odczytu.
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
