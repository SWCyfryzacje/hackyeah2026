import type { LatLng } from 'react-native-maps';

// Shared routes ("Wspólne trasy"). Mirrors supabase/migrations/20261004090000_group_routes.sql.

export type GroupRouteStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type GroupRouteVisibility = 'public' | 'private';
export type GroupRouteRole = 'creator' | 'participant';

/** Statuses in which people can still join and post in the chat. */
export const OPEN_GROUP_ROUTE_STATUSES: readonly GroupRouteStatus[] = [
  'scheduled',
  'live',
];

export const GROUP_ROUTE_STATUS_LABELS: Record<GroupRouteStatus, string> = {
  scheduled: 'Zaplanowana',
  live: 'Trwa',
  finished: 'Zakończona',
  cancelled: 'Anulowana',
};

export const GROUP_ROUTE_MESSAGE_MAX_LENGTH = 500;
export const GROUP_ROUTE_TITLE_MAX_LENGTH = 100;
export const GROUP_ROUTE_DESCRIPTION_MAX_LENGTH = 500;
export const GROUP_ROUTE_LOCATION_INTERVAL_MS = 5000;
/** A scheduled route with participants can't be deleted this close to its start. */
export const GROUP_ROUTE_DELETE_LOCK_MS = 2 * 60 * 60 * 1000;

/** Mirrors delete_group_route: scheduled, and alone or more than 2 h before the start. */
export const canDeleteGroupRoute = (
  route: { status: GroupRouteStatus; plannedStart: Date },
  hasParticipants: boolean,
  now = Date.now()
) =>
  route.status === 'scheduled' &&
  (!hasParticipants ||
    now < route.plannedStart.getTime() - GROUP_ROUTE_DELETE_LOCK_MS);

/** Full route, as read from public.group_routes (details screen). */
export type GroupRoute = {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  visibility: GroupRouteVisibility;
  status: GroupRouteStatus;
  /** Visible only to participants of private routes; anyone can read it for public ones. */
  joinCode: string;
  plannedStart: Date;
  plannedEnd: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  start: LatLng;
  geometry: LatLng[];
  stops: LatLng[];
  distanceM: number | null;
  durationS: number | null;
  eventId: number | null;
  event: GroupRouteEvent | null;
  createdAt: Date;
};

/** Event linked to a route (subset of public.events). */
export type GroupRouteEvent = {
  id: number;
  title: string;
  url: string;
  place: string | null;
  dateText: string | null;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
};

/** Row of list_group_routes(): no geometry, plus counts and my role. */
export type GroupRouteListItem = {
  id: string;
  title: string;
  description: string | null;
  visibility: GroupRouteVisibility;
  status: GroupRouteStatus;
  plannedStart: Date;
  plannedEnd: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  start: LatLng;
  distanceM: number | null;
  durationS: number | null;
  eventId: number | null;
  eventTitle: string | null;
  creatorNick: string;
  participantCount: number;
  /** null when I'm not a participant */
  myRole: GroupRouteRole | null;
};

export type GroupRouteParticipant = {
  userId: string;
  role: GroupRouteRole;
  nick: string;
  avatarUrl: string | null;
  joinedAt: Date;
};

export type GroupRouteMessage = {
  id: number;
  routeId: string;
  userId: string;
  body: string;
  createdAt: Date;
};

/** The creator's latest position (one per live route). */
export type GroupRouteLocation = {
  routeId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: Date;
};

export type CreateGroupRouteInput = {
  title: string;
  description?: string | null;
  visibility: GroupRouteVisibility;
  plannedStart: Date;
  plannedEnd?: Date | null;
  start: LatLng;
  geometry: LatLng[];
  stops?: LatLng[];
  distanceM?: number | null;
  durationS?: number | null;
  eventId?: number | null;
};

// --- Raw database rows (snake_case), used by src/lib/group-routes.ts and realtime payloads ---

export type GroupRouteRow = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  visibility: GroupRouteVisibility;
  status: GroupRouteStatus;
  join_code: string;
  planned_start: string;
  planned_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  start_lat: number;
  start_lng: number;
  geometry: LatLng[];
  stops: LatLng[];
  distance_m: number | null;
  duration_s: number | null;
  event_id: number | null;
  created_at: string;
};

export type GroupRouteListRow = {
  id: string;
  title: string;
  description: string | null;
  visibility: GroupRouteVisibility;
  status: GroupRouteStatus;
  planned_start: string;
  planned_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  start_lat: number;
  start_lng: number;
  distance_m: number | null;
  duration_s: number | null;
  event_id: number | null;
  event_title: string | null;
  creator_nick: string;
  participant_count: number;
  my_role: GroupRouteRole | null;
};

export type GroupRouteParticipantRow = {
  user_id: string;
  role: GroupRouteRole;
  nick: string;
  avatar_url: string | null;
  joined_at: string;
};

export type GroupRouteMessageRow = {
  id: number;
  route_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type GroupRouteLocationRow = {
  route_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
};

export type GroupRouteEventRow = {
  id: number;
  title: string;
  url: string;
  place: string | null;
  date_text: string | null;
  start_date: string;
  end_date: string;
};
