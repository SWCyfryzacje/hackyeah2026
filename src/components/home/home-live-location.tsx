import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useLocationPermission from '@/hooks/useLocationPermission';

type Props = {
  currentAddress: string | null;
  locationLoading: boolean;
  fetchAddress: () => void;
};

export default function HomeLiveLocation({
  currentAddress,
  locationLoading,
  fetchAddress,
}: Props) {
  const { granted, showModal } = useLocationPermission({
    autoRequest: true,
  });

  return (
    <View className='px-5 pb-4'>
      <Pressable
        onPress={() => (granted ? fetchAddress() : showModal())}
        className='flex-row items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs active:scale-[0.99]'>
        <View className='flex-1 flex-row items-center gap-2.5'>
          <Ionicons
            name={granted ? 'location' : 'location-outline'}
            size={18}
            color={granted ? '#10b981' : '#f59e0b'}
          />
          <Text
            className='flex-1 text-xs font-semibold text-slate-700'
            numberOfLines={1}>
            {granted
              ? locationLoading
                ? 'Aktualizowanie lokalizacji...'
                : currentAddress || 'Lokalizacja GPS aktywna'
              : 'Włącz GPS, aby automatycznie ustalić punkt startowy'}
          </Text>
        </View>
        <Ionicons
          name={granted ? 'refresh' : 'arrow-forward'}
          size={14}
          color='#64748b'
        />
      </Pressable>
    </View>
  );
}
