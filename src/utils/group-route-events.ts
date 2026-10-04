import { toDateString, type MapEvent } from '@/utils/events';

/**
 * Events at one venue picked on the Route tab (several events can share a
 * place), soonest first. A shared route through it must fall on a day one of
 * them runs.
 */
export type RouteEventVenue = MapEvent[];

// Event dates are whole Kraków calendar days, both ends inclusive.
const runsOn = (e: MapEvent, day: string) =>
  e.startDate <= day && day <= e.endDate;

/**
 * One event per venue running on the day `dayOffset` days from today, in
 * venue order; null when some venue has nothing on that day.
 */
export function eventsOnDay(
  venues: RouteEventVenue[],
  dayOffset: number,
  now = new Date()
): MapEvent[] | null {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  const day = toDateString(date);

  const picked: MapEvent[] = [];
  for (const venue of venues) {
    const event = venue.find((e) => runsOn(e, day));
    if (!event) return null;
    picked.push(event);
  }
  return picked;
}

/** Day offsets on which every venue has an event (all of them without venues). */
export function eventDayOffsets(
  venues: RouteEventVenue[],
  dayOffsets: readonly number[],
  now = new Date()
) {
  return dayOffsets.filter((d) => eventsOnDay(venues, d, now) !== null);
}
