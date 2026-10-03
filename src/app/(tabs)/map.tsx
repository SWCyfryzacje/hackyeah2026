import SafeView from '@/components/safe-view';
import TripMap from '@/components/TripMap';

export default function Map() {
  return (
    <SafeView className='flex-1 items-center justify-center bg-amber-50'>
      <TripMap />
    </SafeView>
  );
}
