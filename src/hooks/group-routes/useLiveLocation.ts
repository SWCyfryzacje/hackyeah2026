import type { GroupRouteLocation } from '@/types/group-routes';

// STUB (T0) — implemented by teammate T1 (location). Keep the signature.

export type UseLiveLocationResult = {
  /** null when the route isn't live, nothing was shared yet, or sharing ended */
  location: GroupRouteLocation | null;
};

/** Participant side: the creator's latest position, kept up to date via Realtime. */
export default function useLiveLocation(
  _routeId: string
): UseLiveLocationResult {
  return { location: null };
}
