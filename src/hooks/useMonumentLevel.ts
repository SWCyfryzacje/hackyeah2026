import { useSyncExternalStore } from 'react';
import { DEFAULT_MONUMENT_MIN_SCORE } from '@/constants/monuments';

// Shared across screens (map tab and route tab), kept in memory for the session.
let minScore: number = DEFAULT_MONUMENT_MIN_SCORE;
const listeners = new Set<() => void>();

function setMinScore(value: number) {
  minScore = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Minimum popularity (Wikipedia article count) of monuments to show. */
export default function useMonumentLevel() {
  const value = useSyncExternalStore(subscribe, () => minScore);
  return [value, setMinScore] as const;
}
