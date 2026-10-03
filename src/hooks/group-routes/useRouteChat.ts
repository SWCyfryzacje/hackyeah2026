import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { useSupabase } from '@/lib/supabase';
import {
  fallbackNick,
  fetchGroupRouteMessages,
  fetchGroupRouteParticipants,
  groupRouteChannels,
  sendGroupRouteMessage,
  toGroupRouteMessage,
} from '@/lib/group-routes';
import {
  GROUP_ROUTE_MESSAGE_MAX_LENGTH,
  type GroupRouteMessage,
  type GroupRouteMessageRow,
} from '@/types/group-routes';

export type ChatMessage = GroupRouteMessage & {
  nick: string;
  /** sent by the signed-in user */
  mine: boolean;
};

export type UseRouteChatResult = {
  messages: ChatMessage[];
  send: (body: string) => Promise<void>;
  sending: boolean;
  error: string | null;
};

// Used only when Realtime can't subscribe (see ARCHITECTURE §6).
const POLL_INTERVAL_MS = 5000;

const NO_ACCESS_ERROR = 'Nie masz dostępu do czatu tej trasy.';

/** Adds incoming messages for `routeId`, deduped by id, oldest first. */
function mergeMessages(
  prev: GroupRouteMessage[],
  incoming: GroupRouteMessage[],
  routeId: string
): GroupRouteMessage[] {
  const byId = new Map<number, GroupRouteMessage>();
  // Drop leftovers from a previously shown route.
  for (const m of prev) if (m.routeId === routeId) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id
  );
}

/**
 * Chat of a route: last 200 messages + live inserts. `canPost` = route is scheduled/live.
 * `send` rejects (and sets `error`) when the message wasn't sent.
 */
export default function useRouteChat(
  routeId: string,
  canPost: boolean
): UseRouteChatResult {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const [rawMessages, setRawMessages] = useState<GroupRouteMessage[]>([]);
  const [nicks, setNicks] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    // Users we already know or asked for, so an unknown sender refetches only once.
    const known = new Set<string>();

    const loadMessages = () =>
      fetchGroupRouteMessages(supabase, routeId)
        .then((msgs) => {
          if (!cancelled)
            setRawMessages((prev) => mergeMessages(prev, msgs, routeId));
        })
        .catch((e: unknown) => {
          console.warn(
            'Chat messages error:',
            e instanceof Error ? e.message : e
          );
        });

    const loadParticipants = () =>
      fetchGroupRouteParticipants(supabase, routeId)
        .then((list) => {
          if (cancelled) return;
          list.forEach((p) => known.add(p.userId));
          setNicks((prev) => {
            const next = { ...prev };
            for (const p of list) next[p.userId] = p.nick;
            return next;
          });
          setError((e) => (e === NO_ACCESS_ERROR ? null : e));
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          // The RPC throws for non-members.
          console.warn(
            'Chat participants error:',
            e instanceof Error ? e.message : e
          );
          setError(NO_ACCESS_ERROR);
        });

    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    loadMessages();
    loadParticipants();

    const channel = supabase
      .channel(
        `${groupRouteChannels.chat(routeId)}:${Math.random().toString(36).slice(2)}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_route_messages',
          filter: `route_id=eq.${routeId}`,
        },
        (payload) => {
          const msg = toGroupRouteMessage(payload.new as GroupRouteMessageRow);
          setRawMessages((prev) => mergeMessages(prev, [msg], routeId));
          if (!known.has(msg.userId)) {
            known.add(msg.userId);
            loadParticipants();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_route_participants',
          filter: `route_id=eq.${routeId}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          stopPolling();
          // Catch up on anything sent before the subscription went live.
          loadMessages();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!poll) poll = setInterval(loadMessages, POLL_INTERVAL_MS);
        }
      });

    return () => {
      cancelled = true;
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [supabase, routeId]);

  const messages = useMemo<ChatMessage[]>(
    () =>
      rawMessages
        .filter((m) => m.routeId === routeId)
        .map((m) => ({
          ...m,
          nick: nicks[m.userId] ?? fallbackNick(m.userId),
          mine: m.userId === userId,
        })),
    [rawMessages, nicks, routeId, userId]
  );

  const send = useCallback(
    async (body: string) => {
      const text = body.trim();
      let invalid: string | null = null;
      if (!canPost) invalid = 'Trasa zakończona — czat jest tylko do odczytu.';
      else if (!text) invalid = 'Wiadomość nie może być pusta.';
      else if (text.length > GROUP_ROUTE_MESSAGE_MAX_LENGTH)
        invalid = `Wiadomość może mieć maksymalnie ${GROUP_ROUTE_MESSAGE_MAX_LENGTH} znaków.`;
      if (invalid) {
        setError(invalid);
        throw new Error(invalid);
      }

      setSending(true);
      setError(null);
      try {
        const msg = await sendGroupRouteMessage(supabase, routeId, text);
        setRawMessages((prev) => mergeMessages(prev, [msg], routeId));
      } catch (e) {
        const raw = e instanceof Error ? e.message : '';
        // The insert is guarded by RLS only, whose error is in English.
        const message = raw.includes('row-level security')
          ? 'Nie możesz pisać na tym czacie (trasa zakończona lub nie jesteś uczestnikiem).'
          : raw || 'Nie udało się wysłać wiadomości.';
        setError(message);
        throw new Error(message);
      } finally {
        setSending(false);
      }
    },
    [supabase, routeId, canPost]
  );

  return { messages, send, sending, error };
}
