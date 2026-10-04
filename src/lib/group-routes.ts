import type { SupabaseClient } from '@supabase/supabase-js';
import type { LatLng } from 'react-native-maps';
import * as Linking from 'expo-linking';
import { MAX_ROUTE_DAYS_AHEAD } from '@/components/group-routes/new-group-route-schema';
import { horizonRange } from '@/utils/events';
import type {
  CreateGroupRouteInput,
  GroupRoute,
  GroupRouteEvent,
  GroupRouteEventRow,
  GroupRouteListItem,
  GroupRouteListRow,
  GroupRouteLocation,
  GroupRouteLocationRow,
  GroupRouteMessage,
  GroupRouteMessageRow,
  GroupRouteParticipant,
  GroupRouteParticipantRow,
  GroupRouteRow,
} from '@/types/group-routes';

// Typed access to the shared-routes tables and RPCs. Every write goes through
// an RPC (see the migration); errors come back as Polish messages from the DB.

// OSRM overview=full can return thousands of points; the DB caps geometry at 20k.
const MAX_GEOMETRY_POINTS = 2000;
const MESSAGES_PAGE = 200;
const UPCOMING_EVENTS_LIMIT = 20;

const EVENT_COLUMNS = 'id, title, url, place, date_text, start_date, end_date';

/** Realtime channel names, one per route and feature (see ARCHITECTURE §3). */
export const groupRouteChannels = {
  route: (id: string) => `group-route:${id}`,
  participants: (id: string) => `group-route-participants:${id}`,
  chat: (id: string) => `group-route-chat:${id}`,
  location: (id: string) => `group-route-location:${id}`,
};

// --- mappers (exported for realtime payloads) ---

const toDate = (s: string | null) => (s ? new Date(s) : null);

export const toGroupRouteEvent = (r: GroupRouteEventRow): GroupRouteEvent => ({
  id: r.id,
  title: r.title,
  url: r.url,
  place: r.place,
  dateText: r.date_text,
  startDate: r.start_date,
  endDate: r.end_date,
});

export const toGroupRoute = (
  r: GroupRouteRow & { event?: GroupRouteEventRow | null }
): GroupRoute => ({
  id: r.id,
  creatorId: r.creator_id,
  title: r.title,
  description: r.description,
  visibility: r.visibility,
  status: r.status,
  joinCode: r.join_code,
  plannedStart: new Date(r.planned_start),
  plannedEnd: toDate(r.planned_end),
  startedAt: toDate(r.started_at),
  endedAt: toDate(r.ended_at),
  start: { latitude: r.start_lat, longitude: r.start_lng },
  geometry: r.geometry,
  stops: r.stops,
  distanceM: r.distance_m,
  durationS: r.duration_s,
  eventId: r.event_id,
  event: r.event ? toGroupRouteEvent(r.event) : null,
  createdAt: new Date(r.created_at),
});

export const toGroupRouteListItem = (
  r: GroupRouteListRow
): GroupRouteListItem => ({
  id: r.id,
  title: r.title,
  description: r.description,
  visibility: r.visibility,
  status: r.status,
  plannedStart: new Date(r.planned_start),
  plannedEnd: toDate(r.planned_end),
  startedAt: toDate(r.started_at),
  endedAt: toDate(r.ended_at),
  start: { latitude: r.start_lat, longitude: r.start_lng },
  distanceM: r.distance_m,
  durationS: r.duration_s,
  eventId: r.event_id,
  eventTitle: r.event_title,
  creatorNick: r.creator_nick,
  participantCount: r.participant_count,
  myRole: r.my_role,
});

export const toGroupRouteParticipant = (
  r: GroupRouteParticipantRow
): GroupRouteParticipant => ({
  userId: r.user_id,
  role: r.role,
  nick: r.nick,
  avatarUrl: r.avatar_url,
  joinedAt: new Date(r.joined_at),
});

export const toGroupRouteMessage = (
  r: GroupRouteMessageRow
): GroupRouteMessage => ({
  id: r.id,
  routeId: r.route_id,
  userId: r.user_id,
  body: r.body,
  createdAt: new Date(r.created_at),
});

export const toGroupRouteLocation = (
  r: GroupRouteLocationRow
): GroupRouteLocation => ({
  routeId: r.route_id,
  userId: r.user_id,
  latitude: r.latitude,
  longitude: r.longitude,
  accuracy: r.accuracy,
  updatedAt: new Date(r.updated_at),
});

/** Nick for a user missing from the participants list (e.g. someone who left). */
export const fallbackNick = (userId: string) =>
  `Turysta-${userId.slice(-4).toUpperCase()}`;

/** Deep link that opens the join screen for a route code. */
export const groupRouteJoinLink = (code: string) =>
  Linking.createURL(`/group-routes/join/${code}`);

function downsample(points: LatLng[], max = MAX_GEOMETRY_POINTS): LatLng[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

const plain = ({ latitude, longitude }: LatLng): LatLng => ({
  latitude,
  longitude,
});

async function rpc<T>(
  supabase: SupabaseClient,
  fn: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// --- reads ---

/** Open public routes + my routes (open or ended in the last 7 days). */
export async function fetchGroupRoutes(
  supabase: SupabaseClient
): Promise<GroupRouteListItem[]> {
  const rows = await rpc<GroupRouteListRow[]>(supabase, 'list_group_routes');
  return rows.map(toGroupRouteListItem);
}

/** null when the route doesn't exist or isn't visible to me (private, not joined). */
export async function fetchGroupRoute(
  supabase: SupabaseClient,
  id: string
): Promise<GroupRoute | null> {
  const { data, error } = await supabase
    .from('group_routes')
    .select(`*, event:events(${EVENT_COLUMNS})`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toGroupRoute(data) : null;
}

/** Participants with nicks; throws unless I'm a participant. Creator first. */
export async function fetchGroupRouteParticipants(
  supabase: SupabaseClient,
  routeId: string
): Promise<GroupRouteParticipant[]> {
  const rows = await rpc<GroupRouteParticipantRow[]>(
    supabase,
    'get_group_route_participants',
    { p_route_id: routeId }
  );
  return rows.map(toGroupRouteParticipant);
}

/** Latest creator position; null when not live, not shared yet, or I'm not a participant. */
export async function fetchGroupRouteLocation(
  supabase: SupabaseClient,
  routeId: string
): Promise<GroupRouteLocation | null> {
  const { data, error } = await supabase
    .from('group_route_locations')
    .select('*')
    .eq('route_id', routeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toGroupRouteLocation(data) : null;
}

/** Last messages, oldest first. */
export async function fetchGroupRouteMessages(
  supabase: SupabaseClient,
  routeId: string,
  limit = MESSAGES_PAGE
): Promise<GroupRouteMessage[]> {
  const { data, error } = await supabase
    .from('group_route_messages')
    .select('*')
    .eq('route_id', routeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as GroupRouteMessageRow[]).map(toGroupRouteMessage).reverse();
}

/**
 * Events going on between today and the last day a route can be planned for,
 * soonest first (for linking a route to an event).
 */
export async function fetchUpcomingEvents(
  supabase: SupabaseClient,
  limit = UPCOMING_EVENTS_LIMIT
): Promise<GroupRouteEvent[]> {
  const { from, until } = horizonRange({ days: MAX_ROUTE_DAYS_AHEAD });
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .gte('end_date', from)
    .lte('start_date', until)
    .order('start_date', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as GroupRouteEventRow[]).map(toGroupRouteEvent);
}

// --- writes ---

/** Creates the route (I become its creator) and returns its id. */
export async function createGroupRoute(
  supabase: SupabaseClient,
  input: CreateGroupRouteInput
): Promise<string> {
  return rpc<string>(supabase, 'create_group_route', {
    p_title: input.title,
    p_description: input.description ?? null,
    p_visibility: input.visibility,
    p_planned_start: input.plannedStart.toISOString(),
    p_planned_end: input.plannedEnd?.toISOString() ?? null,
    p_start_lat: input.start.latitude,
    p_start_lng: input.start.longitude,
    p_geometry: downsample(input.geometry).map(plain),
    p_stops: (input.stops ?? []).map(plain),
    p_distance_m: input.distanceM != null ? Math.round(input.distanceM) : null,
    p_duration_s: input.durationS != null ? Math.round(input.durationS) : null,
    p_event_id: input.eventId ?? null,
  });
}

/** Joins a public route (idempotent). */
export async function joinGroupRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<void> {
  await rpc(supabase, 'join_group_route', { p_route_id: routeId });
}

/** Joins any route by its 6-character code (idempotent); returns the route id. */
export async function joinGroupRouteByCode(
  supabase: SupabaseClient,
  code: string
): Promise<string> {
  return rpc<string>(supabase, 'join_group_route_by_code', { p_code: code });
}

export async function leaveGroupRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<void> {
  await rpc(supabase, 'leave_group_route', { p_route_id: routeId });
}

/** Creator only: scheduled -> live. */
export async function startGroupRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<void> {
  await rpc(supabase, 'start_group_route', { p_route_id: routeId });
}

/** Creator only: live -> finished; the live location is deleted. */
export async function finishGroupRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<void> {
  await rpc(supabase, 'finish_group_route', { p_route_id: routeId });
}

/** Creator only: scheduled -> cancelled. */
export async function cancelGroupRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<void> {
  await rpc(supabase, 'cancel_group_route', { p_route_id: routeId });
}

/** Creator only, while live: replaces the shared position. */
export async function updateGroupRouteLocation(
  supabase: SupabaseClient,
  routeId: string,
  position: LatLng & { accuracy?: number | null }
): Promise<void> {
  await rpc(supabase, 'update_group_route_location', {
    p_route_id: routeId,
    p_lat: position.latitude,
    p_lng: position.longitude,
    p_accuracy: position.accuracy ?? null,
  });
}

/** Participants only, while scheduled/live (enforced by RLS). Max 500 chars. */
export async function sendGroupRouteMessage(
  supabase: SupabaseClient,
  routeId: string,
  body: string
): Promise<GroupRouteMessage> {
  const { data, error } = await supabase
    .from('group_route_messages')
    .insert({ route_id: routeId, body: body.trim() })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return toGroupRouteMessage(data);
}
