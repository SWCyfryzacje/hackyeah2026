import type { GroupRouteMessage } from '@/types/group-routes';

// STUB (T0) — implemented by teammate T2 (chat). Keep the signature.

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

/** Chat of a route: last 200 messages + live inserts. `canPost` = route is scheduled/live. */
export default function useRouteChat(
  _routeId: string,

  _canPost: boolean
): UseRouteChatResult {
  return { messages: [], send: async () => {}, sending: false, error: null };
}
