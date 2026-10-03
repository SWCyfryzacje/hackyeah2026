import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSupabase } from '@/lib/supabase';
import {
  cancelGroupRoute,
  finishGroupRoute,
  joinGroupRoute,
  leaveGroupRoute,
  startGroupRoute,
} from '@/lib/group-routes';
import {
  OPEN_GROUP_ROUTE_STATUSES,
  type GroupRoute,
  type GroupRouteRole,
} from '@/types/group-routes';
import type { UseLocationSharingResult } from '@/hooks/group-routes/useLocationSharing';
import { formatTimeWithSeconds } from '@/utils/group-route-format';
import ActionButton from './action-button';
import LocationConsentDialog from './location-consent-dialog';

type Action = 'join' | 'start' | 'cancel' | 'finish' | 'leave';

type Props = {
  route: GroupRoute;
  myRole: GroupRouteRole | null;
  sharing: UseLocationSharingResult;
  /** Refetch after a state change (Realtime may lag behind) */
  onChanged: () => Promise<void>;
  onLeft: () => void;
  onOpenChat: () => void;
};

/** Buttons that depend on my role and the route status (SPEC F3/F4). */
export default function GroupRouteActions({
  route,
  myRole,
  sharing,
  onChanged,
  onLeft,
  onOpenChat,
}: Props) {
  const supabase = useSupabase();
  const [busy, setBusy] = useState<Action | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);

  const isCreator = myRole === 'creator';
  const isMember = myRole != null;
  const isOpen = OPEN_GROUP_ROUTE_STATUSES.includes(route.status);

  const run = async (action: Action, fn: () => Promise<void>) => {
    setBusy(action);
    try {
      await fn();
      if (action === 'leave') {
        onLeft();
        return;
      }
      await onChanged();
    } catch (e) {
      Alert.alert(
        'Błąd',
        e instanceof Error ? e.message : 'Coś poszło nie tak.'
      );
    } finally {
      setBusy(null);
    }
  };

  const confirm = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void
  ) =>
    Alert.alert(title, message, [
      { text: 'Nie', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);

  const sharingText = sharing.error
    ? sharing.error
    : sharing.lastSentAt
      ? `Udostępniasz lokalizację · ostatnio ${formatTimeWithSeconds(sharing.lastSentAt)}`
      : 'Udostępniasz lokalizację · czekam na pierwszą pozycję…';

  return (
    <View className='gap-2.5'>
      {!isMember && isOpen && route.visibility === 'public' && (
        <ActionButton
          label='Dołącz'
          icon='person-add'
          busy={busy === 'join'}
          disabled={busy != null}
          onPress={() => run('join', () => joinGroupRoute(supabase, route.id))}
        />
      )}

      {!isMember && !isOpen && (
        <Text className='text-center text-sm text-neutral-500'>
          Ta trasa już się zakończyła — nie można dołączyć.
        </Text>
      )}

      {isCreator && route.status === 'scheduled' && (
        <>
          <ActionButton
            label='Rozpocznij'
            icon='play'
            variant='success'
            busy={busy === 'start'}
            disabled={busy != null}
            onPress={() => setConsentVisible(true)}
          />
          <ActionButton
            label='Anuluj trasę'
            icon='close-circle-outline'
            variant='danger'
            busy={busy === 'cancel'}
            disabled={busy != null}
            onPress={() =>
              confirm(
                'Anulować trasę?',
                'Uczestnicy zobaczą, że trasa została anulowana. Tego nie można cofnąć.',
                'Anuluj trasę',
                () => run('cancel', () => cancelGroupRoute(supabase, route.id))
              )
            }
          />
        </>
      )}

      {isCreator && route.status === 'live' && (
        <>
          <View className='flex-row items-center gap-2 rounded-xl bg-green-50 p-3'>
            <View
              className={`h-2.5 w-2.5 rounded-full ${
                sharing.error ? 'bg-red-500' : 'bg-green-500'
              }`}
            />
            <Text
              className={`flex-1 text-sm ${
                sharing.error ? 'text-red-600' : 'text-green-800'
              }`}>
              {sharingText}
            </Text>
          </View>
          <ActionButton
            label='Zakończ'
            icon='stop'
            variant='danger'
            busy={busy === 'finish'}
            disabled={busy != null}
            onPress={() =>
              confirm(
                'Zakończyć trasę?',
                'Udostępnianie lokalizacji zostanie wyłączone, a Twoja pozycja usunięta.',
                'Zakończ',
                () => run('finish', () => finishGroupRoute(supabase, route.id))
              )
            }
          />
        </>
      )}

      {myRole === 'participant' && isOpen && (
        <ActionButton
          label='Opuść trasę'
          icon='exit-outline'
          variant='danger'
          busy={busy === 'leave'}
          disabled={busy != null}
          onPress={() =>
            confirm(
              'Opuścić trasę?',
              route.visibility === 'private'
                ? 'Aby wrócić, będziesz potrzebować kodu dołączenia.'
                : 'Możesz dołączyć ponownie, dopóki trasa trwa.',
              'Opuść',
              () => run('leave', () => leaveGroupRoute(supabase, route.id))
            )
          }
        />
      )}

      {isMember && (
        <ActionButton
          label='Czat'
          icon='chatbubbles-outline'
          variant='neutral'
          onPress={onOpenChat}
        />
      )}

      <LocationConsentDialog
        visible={consentVisible}
        onCancel={() => setConsentVisible(false)}
        onAccept={() => {
          setConsentVisible(false);
          void run('start', () => startGroupRoute(supabase, route.id));
        }}
      />
    </View>
  );
}
