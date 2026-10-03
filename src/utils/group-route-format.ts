// Polish date/distance formatting for the shared-routes screens.

const pad = (n: number) => String(n).padStart(2, '0');

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const DAY_MS = 24 * 60 * 60 * 1000;

export const formatTime = (d: Date) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const formatTimeWithSeconds = (d: Date) =>
  `${formatTime(d)}:${pad(d.getSeconds())}`;

/** "Dziś", "Jutro", "Wczoraj" or e.g. "pt., 9 paź". */
export function formatDay(d: Date, now = new Date()) {
  const diff = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS
  );
  if (diff === 0) return 'Dziś';
  if (diff === 1) return 'Jutro';
  if (diff === -1) return 'Wczoraj';
  return d.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export const formatDateTime = (d: Date) => `${formatDay(d)}, ${formatTime(d)}`;

/** Start, plus end time when set (end is always the same day in the form). */
export function formatTimeRange(start: Date, end: Date | null) {
  return end
    ? `${formatDateTime(start)} – ${formatTime(end)}`
    : formatDateTime(start);
}

export const formatKm = (m: number) => `${(m / 1000).toFixed(1)} km`;

export function formatDuration(s: number) {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
}

/** "5.2 km · 1 h 10 min", skipping missing parts; null when both are missing. */
export function formatRouteSize(
  distanceM: number | null,
  durationS: number | null
) {
  const parts = [
    distanceM != null ? formatKm(distanceM) : null,
    durationS != null ? formatDuration(durationS) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Keeps digits only and inserts the colon: "1830" -> "18:30". */
export function formatTimeInput(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
}

/** Date `dayOffset` days from today at "HH:MM" local time. */
export function dateAt(dayOffset: number, time: string, now = new Date()) {
  const [h, m] = time.split(':').map(Number);
  const d = startOfDay(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

export const formatShortDate = (d: Date) =>
  `${d.getDate()}.${pad(d.getMonth() + 1)}`;

/** Polish plural: pluralPl(3, 'uczestnik', 'uczestnicy', 'uczestników') -> "3 uczestnicy". */
export function pluralPl(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return `1 ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} ${few}`;
  return `${n} ${many}`;
}

export const formatParticipants = (n: number) =>
  pluralPl(n, 'uczestnik', 'uczestnicy', 'uczestników');

export const formatStops = (n: number) =>
  pluralPl(n, 'przystanek', 'przystanki', 'przystanków');
