import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import useLiveLocation from '@/hooks/group-routes/useLiveLocation';
import type { GroupRouteLocation } from '@/types/group-routes';

export type LiveLocationMarkerProps = {
  routeId: string;
};

const AGE_REFRESH_MS = 30_000;
// Custom marker views need a few frames before their snapshot is taken.
const SNAPSHOT_DELAY_MS = 500;

// `now` ticks slower than updates arrive, so a negative age also means "teraz".
const formatAge = (updatedAt: Date, now: number) => {
  const min = Math.floor((now - updatedAt.getTime()) / 60_000);
  return min < 1 ? 'teraz' : `ostatnio ${min} min temu`;
};

function CreatorMarker({ location }: { location: GroupRouteLocation }) {
  const [now, setNow] = useState(() => Date.now());
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTracksViewChanges(false), SNAPSHOT_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), AGE_REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <Marker
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      title='Twórca trasy'
      description={formatAge(location.updatedAt, now)}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={1000}
      tracksViewChanges={tracksViewChanges}>
      <View className='h-6 w-6 items-center justify-center rounded-full bg-blue-600/25'>
        <View className='h-4 w-4 rounded-full border-2 border-white bg-blue-600' />
      </View>
    </Marker>
  );
}

/** The creator's live position. Render it INSIDE a react-native-maps <MapView>. */
export default function LiveLocationMarker({
  routeId,
}: LiveLocationMarkerProps) {
  const { location } = useLiveLocation(routeId);
  if (!location) return null;
  return <CreatorMarker location={location} />;
}
