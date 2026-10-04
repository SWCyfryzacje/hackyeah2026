import type { LatLng } from 'react-native-maps';
import type { RouteEventVenue } from '@/utils/group-route-events';

/**
 * Route handed over from the planner (Route tab) to the "new shared route"
 * form. Polylines are too big for router params, so it lives in memory.
 */
export type GroupRouteDraft = {
  start: LatLng;
  geometry: LatLng[];
  stops: LatLng[];
  distanceM: number;
  durationS: number;
  /** Selected event venues in route order; the route must fit their dates. */
  events: RouteEventVenue[];
};

let draft: GroupRouteDraft | null = null;

export function setGroupRouteDraft(next: GroupRouteDraft | null) {
  draft = next;
}

export function getGroupRouteDraft(): GroupRouteDraft | null {
  return draft;
}
