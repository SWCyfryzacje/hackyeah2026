import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProfile } from '@/utils/routeThrough';

type Props = {
  profile: RouteProfile;
  onChange: (profile: RouteProfile) => void;
};

const PROFILES: { value: RouteProfile; icon: 'walk' | 'car' }[] = [
  { value: 'foot', icon: 'walk' },
  { value: 'driving', icon: 'car' },
];

/** Walking / driving switch for route calculation. */
export default function RouteProfileToggle({ profile, onChange }: Props) {
  return (
    <View className='flex-row self-start rounded-xl bg-neutral-200 p-1'>
      {PROFILES.map(({ value, icon }) => (
        <Pressable
          key={value}
          className={`rounded-lg px-2 py-1 ${profile === value ? 'bg-white' : ''}`}
          onPress={() => onChange(value)}>
          <Ionicons
            name={icon}
            size={18}
            color={profile === value ? '#2563eb' : '#525252'}
          />
        </Pressable>
      ))}
    </View>
  );
}
