import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { LatLng } from 'react-native-maps';
import { setGroupRouteDraft } from '@/lib/group-route-draft';
import type { RouteEventVenue } from '@/utils/group-route-events';

type Props = {
  /** Active route or loop from the planner (useRouteCalculation) */
  route: { coords: LatLng[]; distance: number; duration: number } | null;
  stops: LatLng[];
  /** Events at the selected venues (useEventSuggestions().selectedEvents) */
  events?: RouteEventVenue[];
};

/** Route tab: hands the planned route over to the "new shared route" form. */
export default function CreateGroupRouteButton({
  route,
  stops,
  events = [],
}: Props) {
  const router = useRouter();
  const disabled = !route || route.coords.length < 2;

  const onPress = () => {
    if (!route || disabled) return;
    setGroupRouteDraft({
      start: route.coords[0],
      geometry: route.coords,
      stops,
      distanceM: route.distance,
      durationS: route.duration,
      events,
    });
    router.push('/group-routes/new');
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 active:bg-blue-700 ${
        disabled ? 'opacity-40' : ''
      }`}>
      <Ionicons
        name='people'
        size={16}
        color='#ffffff'
      />
      <Text className='text-sm font-semibold text-white'>Udostępnij trasę</Text>
    </Pressable>
  );
}
