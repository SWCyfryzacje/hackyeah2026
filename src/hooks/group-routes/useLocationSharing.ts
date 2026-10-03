// STUB (T0) — implemented by teammate T1 (location). Keep the signature.

export type UseLocationSharingOptions = {
  routeId: string;
  /** true only for the creator while the route is live */
  enabled: boolean;
};

export type UseLocationSharingResult = {
  error: string | null;
  lastSentAt: Date | null;
};

/**
 * Creator side: while `enabled` and the app is in the foreground, sends the
 * current position every GROUP_ROUTE_LOCATION_INTERVAL_MS via
 * update_group_route_location.
 */
export default function useLocationSharing(
  _opts: UseLocationSharingOptions
): UseLocationSharingResult {
  return { error: null, lastSentAt: null };
}
