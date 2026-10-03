import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Variant = 'primary' | 'success' | 'danger' | 'neutral';

const VARIANTS: Record<
  Variant,
  { box: string; text: string; icon: string; spinner: string }
> = {
  primary: {
    box: 'bg-blue-600 active:bg-blue-700',
    text: 'text-white',
    icon: '#ffffff',
    spinner: '#ffffff',
  },
  success: {
    box: 'bg-green-600 active:bg-green-700',
    text: 'text-white',
    icon: '#ffffff',
    spinner: '#ffffff',
  },
  danger: {
    box: 'border border-red-300 bg-white active:bg-red-50',
    text: 'text-red-600',
    icon: '#dc2626',
    spinner: '#dc2626',
  },
  neutral: {
    box: 'border border-neutral-300 bg-white active:bg-neutral-100',
    text: 'text-neutral-800',
    icon: '#262626',
    spinner: '#262626',
  },
};

type Props = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  variant?: Variant;
  busy?: boolean;
  disabled?: boolean;
};

export default function ActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  busy = false,
  disabled = false,
}: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 ${v.box} ${
        disabled && !busy ? 'opacity-50' : ''
      }`}>
      {busy ? (
        <ActivityIndicator color={v.spinner} />
      ) : (
        <>
          <Ionicons
            name={icon}
            size={18}
            color={v.icon}
          />
          <Text className={`text-base font-semibold ${v.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
