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

export const NewGroupRouteSchema = z
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
    eventId: z.number().nullable(),
  })
  .superRefine((v, ctx) => {
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

export type NewGroupRouteData = z.infer<typeof NewGroupRouteSchema>;

/** Form defaults: start in ~30 min, rounded up to a quarter hour. */
export function newGroupRouteDefaults(): NewGroupRouteData {
  const start = new Date(Date.now() + 30 * 60 * 1000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const today = new Date();
  const dayOffset = start.getDate() === today.getDate() ? 0 : 1;

  return {
    title: '',
    description: '',
    dayOffset,
    startTime: formatTime(start),
    endTime: '',
    visibility: 'public',
    eventId: null,
  };
}
