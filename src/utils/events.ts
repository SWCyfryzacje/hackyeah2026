import type { SupabaseClient } from '@supabase/supabase-js';

// Kraków has ~150 events at a time; this is only a safety cap.
const MAX_MAP_EVENTS = 1000;

/** Geocoded event for the map (public.events with geocode_status = 'ok'). */
export type MapEvent = {
  id: number;
  title: string;
  url: string;
  place: string | null;
  dateText: string | null;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  latitude: number;
  longitude: number;
};

type MapEventRow = {
  id: number;
  title: string;
  url: string;
  place: string | null;
  date_text: string | null;
  start_date: string;
  end_date: string;
  lat: number;
  lng: number;
};

const toMapEvent = (r: MapEventRow): MapEvent => ({
  id: r.id,
  title: r.title,
  url: r.url,
  place: r.place,
  dateText: r.date_text,
  startDate: r.start_date,
  endDate: r.end_date,
  latitude: r.lat,
  longitude: r.lng,
});

/** How far ahead to look: a number of days or months from today. */
export type EventHorizon = { days: number } | { months: number };

/** Local calendar date as yyyy-mm-dd (event dates are Kraków calendar days). */
export function toDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today and the last day of the horizon, both yyyy-mm-dd. */
export function horizonRange(horizon: EventHorizon, now = new Date()) {
  const until = new Date(now);
  if ('days' in horizon) until.setDate(until.getDate() + horizon.days);
  else until.setMonth(until.getMonth() + horizon.months);
  return { from: toDateString(now), until: toDateString(until) };
}

/**
 * Events going on at some point between today and the end of the horizon:
 * not ended yet and starting by then. Past events are never returned, and
 * events without coordinates (not geocoded or not found) are left out.
 */
export async function fetchMapEvents(
  supabase: SupabaseClient,
  horizon: EventHorizon,
  signal?: AbortSignal
): Promise<MapEvent[]> {
  const { from, until } = horizonRange(horizon);
  let query = supabase
    .from('events')
    .select('id, title, url, place, date_text, start_date, end_date, lat, lng')
    .eq('geocode_status', 'ok')
    .gte('end_date', from)
    .lte('start_date', until)
    .order('start_date', { ascending: true })
    .limit(MAX_MAP_EVENTS);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as MapEventRow[]).map(toMapEvent);
}

/** Events at the same coordinates (e.g. several exhibitions at Wawel), keyed by location. */
export function groupEventsByLocation(events: MapEvent[]) {
  const groups = new Map<string, MapEvent[]>();
  for (const e of events) {
    const key = `${e.latitude.toFixed(5)},${e.longitude.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()];
}

/** The site's date text, or "3.10 – 5.10" when it gave none. */
export function formatEventDates(
  e: Pick<MapEvent, 'dateText' | 'startDate' | 'endDate'>
) {
  if (e.dateText) return e.dateText;
  const fmt = (s: string) => {
    const [, m, d] = s.split('-');
    return `${Number(d)}.${m}`;
  };
  return e.startDate === e.endDate
    ? fmt(e.startDate)
    : `${fmt(e.startDate)} – ${fmt(e.endDate)}`;
}
