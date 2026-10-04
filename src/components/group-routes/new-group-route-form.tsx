import { useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '@/lib/supabase';
import { createGroupRoute } from '@/lib/group-routes';
import type { GroupRouteDraft } from '@/lib/group-route-draft';
import {
  GROUP_ROUTE_DESCRIPTION_MAX_LENGTH,
  GROUP_ROUTE_TITLE_MAX_LENGTH,
} from '@/types/group-routes';
import {
  dateAt,
  formatRouteSize,
  formatShortDate,
  formatStops,
  formatTimeInput,
} from '@/utils/group-route-format';
import { eventDayOffsets, eventsOnDay } from '@/utils/group-route-events';
import ChoiceChip from './choice-chip';
import RouteEventsInfo from './route-events-info';
import {
  ALL_DAY_OFFSETS,
  DAY_OPTIONS,
  newGroupRouteSchema,
  newGroupRouteDefaults,
  type NewGroupRouteData,
} from './new-group-route-schema';

type Props = {
  draft: GroupRouteDraft;
  onCreated: (routeId: string) => void;
};

const INPUT_CLASS =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-xs';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className='gap-1.5'>
      <Text className='text-xs font-semibold uppercase tracking-wider text-slate-600'>{label}</Text>
      {children}
      {error ? <Text className='text-xs font-medium text-rose-500'>{error}</Text> : null}
    </View>
  );
}

/** Form that turns a planner route (draft) into a shared route. */
export default function NewGroupRouteForm({ draft, onCreated }: Props) {
  const supabase = useSupabase();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // With events on the route, only the days they are on
  const allowedDays = useMemo(
    () => eventDayOffsets(draft.events, ALL_DAY_OFFSETS),
    [draft.events]
  );
  const form = useForm<NewGroupRouteData>({
    resolver: zodResolver(newGroupRouteSchema(allowedDays)),
    defaultValues: newGroupRouteDefaults(allowedDays),
  });
  const { errors, isSubmitting } = form.formState;
  const dayOffset = useWatch({ control: form.control, name: 'dayOffset' });
  const canSubmit = allowedDays.length > 0;

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      const id = await createGroupRoute(supabase, {
        title: data.title,
        description: data.description || null,
        visibility: data.visibility,
        plannedStart: dateAt(data.dayOffset, data.startTime),
        plannedEnd: data.endTime ? dateAt(data.dayOffset, data.endTime) : null,
        start: draft.start,
        geometry: draft.geometry,
        stops: draft.stops,
        distanceM: draft.distanceM,
        durationS: draft.durationS,
        // Linked to the first event on the route that runs that day
        eventId: eventsOnDay(draft.events, data.dayOffset)?.[0]?.id ?? null,
      });
      onCreated(id);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : 'Nie udało się utworzyć trasy.'
      );
    }
  });

  const today = new Date();

  return (
    <View className='gap-4'>
      <View className='flex-row items-center gap-2 rounded-2xl bg-indigo-50 p-3.5 border border-indigo-100'>
        <Ionicons
          name='walk'
          size={18}
          color='#4f46e5'
        />
        <Text className='text-sm font-bold text-indigo-700'>
          Trasa: {formatRouteSize(draft.distanceM, draft.durationS)}
          {draft.stops.length > 0
            ? ` · ${formatStops(draft.stops.length)}`
            : ''}
        </Text>
      </View>

      <Field
        label='Nazwa'
        error={errors.title?.message}>
        <Controller
          control={form.control}
          name='title'
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className={INPUT_CLASS}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder='np. Spacer po Kazimierzu'
              placeholderTextColor='#9ca3af'
              maxLength={GROUP_ROUTE_TITLE_MAX_LENGTH}
            />
          )}
        />
      </Field>

      <Field
        label='Opis (opcjonalnie)'
        error={errors.description?.message}>
        <Controller
          control={form.control}
          name='description'
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className='min-h-24 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900'
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder='Tempo, miejsce zbiórki, co zabrać…'
              placeholderTextColor='#9ca3af'
              maxLength={GROUP_ROUTE_DESCRIPTION_MAX_LENGTH}
              multiline
              textAlignVertical='top'
            />
          )}
        />
      </Field>

      <RouteEventsInfo
        venues={draft.events}
        dayOffset={dayOffset}
        hasAllowedDay={canSubmit}
      />

      <Field
        label='Dzień'
        error={errors.dayOffset?.message}>
        <Controller
          control={form.control}
          name='dayOffset'
          render={({ field: { onChange, value } }) => (
            <View className='flex-row gap-2'>
              {DAY_OPTIONS.map((d) => {
                const date = new Date(today);
                date.setDate(today.getDate() + d.offset);
                return (
                  <ChoiceChip
                    key={d.offset}
                    label={`${d.label} ${formatShortDate(date)}`}
                    selected={value === d.offset}
                    onPress={() => onChange(d.offset)}
                    disabled={!allowedDays.includes(d.offset)}
                  />
                );
              })}
            </View>
          )}
        />
      </Field>

      <View className='flex-row gap-3'>
        <View className='flex-1'>
          <Field
            label='Start (GG:MM)'
            error={errors.startTime?.message}>
            <Controller
              control={form.control}
              name='startTime'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={INPUT_CLASS}
                  value={value}
                  onChangeText={(t) => onChange(formatTimeInput(t))}
                  onBlur={onBlur}
                  placeholder='18:00'
                  placeholderTextColor='#9ca3af'
                  keyboardType='number-pad'
                  maxLength={5}
                />
              )}
            />
          </Field>
        </View>
        <View className='flex-1'>
          <Field
            label='Koniec (opcjonalnie)'
            error={errors.endTime?.message}>
            <Controller
              control={form.control}
              name='endTime'
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={INPUT_CLASS}
                  value={value}
                  onChangeText={(t) => onChange(formatTimeInput(t))}
                  onBlur={onBlur}
                  placeholder='20:00'
                  placeholderTextColor='#9ca3af'
                  keyboardType='number-pad'
                  maxLength={5}
                />
              )}
            />
          </Field>
        </View>
      </View>

      <Field label='Widoczność'>
        <Controller
          control={form.control}
          name='visibility'
          render={({ field: { onChange, value } }) => (
            <>
              <View className='flex-row gap-2'>
                <ChoiceChip
                  label='Publiczna'
                  selected={value === 'public'}
                  onPress={() => onChange('public')}
                />
                <ChoiceChip
                  label='Prywatna'
                  selected={value === 'private'}
                  onPress={() => onChange('private')}
                />
              </View>
              <Text className='text-xs text-neutral-500'>
                {value === 'public'
                  ? 'Widoczna dla wszystkich w zakładce Razem.'
                  : 'Niewidoczna na liście — dołączenie tylko kodem lub linkiem.'}
              </Text>
            </>
          )}
        />
      </Field>

      {submitError && (
        <View className='rounded-xl border border-red-200 bg-red-50 p-3'>
          <Text className='text-sm text-red-700'>{submitError}</Text>
        </View>
      )}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !canSubmit}
        className={`items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 active:bg-blue-700 ${
          isSubmitting || !canSubmit ? 'opacity-50' : ''
        }`}>
        {isSubmitting ? (
          <ActivityIndicator color='#ffffff' />
        ) : (
          <Text className='text-base font-semibold text-white'>
            Utwórz trasę
          </Text>
        )}
      </Pressable>
    </View>
  );
}
