import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Variant = 'primary' | 'success' | 'danger' | 'neutral';

const VARIANTS: Record<
  Variant,
  { box: string; text: string; icon: string; spinner: string }
> = {
  primary: {
    box: 'bg-indigo-600 active:bg-indigo-700 shadow-xs active:scale-[0.99]',
    text: 'text-white',
    icon: '#ffffff',
    spinner: '#ffffff',
  },
  success: {
    box: 'bg-emerald-600 active:bg-emerald-700 shadow-xs active:scale-[0.99]',
    text: 'text-white',
    icon: '#ffffff',
    spinner: '#ffffff',
  },
  danger: {
    box: 'border border-rose-200 bg-rose-50 active:bg-rose-100',
    text: 'text-rose-600',
    icon: '#e11d48',
    spinner: '#e11d48',
  },
  neutral: {
    box: 'border border-slate-200 bg-white active:bg-slate-50',
    text: 'text-slate-800',
    icon: '#0f172a',
    spinner: '#0f172a',
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
          <Text className={`text-sm font-bold ${v.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
