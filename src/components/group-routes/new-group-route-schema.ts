import { z } from 'zod';
import {
  GROUP_ROUTE_DESCRIPTION_MAX_LENGTH,
  GROUP_ROUTE_TITLE_MAX_LENGTH,
} from '@/types/group-routes';
import { dateAt, formatTime } from '@/utils/group-route-format';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'Podaj godzinę w formacie GG:MM';
// The DB rejects starts more than 1 h in the past
const MAX_PAST_START_MS = 60 * 60 * 1000;

export const DAY_OPTIONS = [
  { offset: 0, label: 'Dziś' },
  { offset: 1, label: 'Jutro' },
  { offset: 2, label: 'Pojutrze' },
] as const;

/** How many days ahead a route can be planned (also the event horizon for routes). */
export const MAX_ROUTE_DAYS_AHEAD = DAY_OPTIONS[DAY_OPTIONS.length - 1].offset;

export const ALL_DAY_OFFSETS: readonly number[] = DAY_OPTIONS.map(
  (d) => d.offset
);

/**
 * Form schema; `allowedDays` are the day offsets that can be picked (with
 * events on the route, only days when they are on).
 */
export const newGroupRouteSchema = (allowedDays = ALL_DAY_OFFSETS) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, 'Podaj nazwę trasy')
        .max(
          GROUP_ROUTE_TITLE_MAX_LENGTH,
          `Maksymalnie ${GROUP_ROUTE_TITLE_MAX_LENGTH} znaków`
        ),
      description: z
        .string()
        .trim()
        .max(
          GROUP_ROUTE_DESCRIPTION_MAX_LENGTH,
          `Maksymalnie ${GROUP_ROUTE_DESCRIPTION_MAX_LENGTH} znaków`
        ),
      dayOffset: z.number().int().min(0).max(MAX_ROUTE_DAYS_AHEAD),
      startTime: z.string().regex(TIME_RE, TIME_MESSAGE),
      endTime: z
        .string()
        .refine((v) => v === '' || TIME_RE.test(v), TIME_MESSAGE),
      visibility: z.enum(['public', 'private']),
    })
    .superRefine((v, ctx) => {
      if (!allowedDays.includes(v.dayOffset)) {
        ctx.addIssue({
          code: 'custom',
          path: ['dayOffset'],
          message: 'Wybrane wydarzenia nie trwają tego dnia',
        });
      }
      if (!TIME_RE.test(v.startTime)) return;
      const start = dateAt(v.dayOffset, v.startTime);
      if (start.getTime() < Date.now() - MAX_PAST_START_MS) {
        ctx.addIssue({
          code: 'custom',
          path: ['startTime'],
          message: 'Start nie może być w przeszłości',
        });
      }
      if (TIME_RE.test(v.endTime)) {
        const end = dateAt(v.dayOffset, v.endTime);
        if (end <= start) {
          ctx.addIssue({
            code: 'custom',
            path: ['endTime'],
            message: 'Koniec musi być po starcie (tego samego dnia)',
          });
        }
      }
    });

export type NewGroupRouteData = z.infer<ReturnType<typeof newGroupRouteSchema>>;

/**
 * Form defaults: start in ~30 min, rounded up to a quarter hour, on the first
 * allowed day from then on.
 */
export function newGroupRouteDefaults(
  allowedDays = ALL_DAY_OFFSETS
): NewGroupRouteData {
  const start = new Date(Date.now() + 30 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const today = new Date();
  const soonest = start.getDate() === today.getDate() ? 0 : 1;
  const dayOffset =
    allowedDays.find((d) => d >= soonest) ?? allowedDays[0] ?? soonest;

  return {
    title: '',
    description: '',
    dayOffset,
    startTime: formatTime(start),
    endTime: '',
    visibility: 'public',
  };
}
