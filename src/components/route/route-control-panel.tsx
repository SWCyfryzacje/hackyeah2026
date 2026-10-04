import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RouteControlPanelProps = {
  /** Extra content shown above the Reset button */
  children?: ReactNode;
  statusText: string;
  isError?: boolean;
  disabled?: boolean;
  showGeneratorButton?: boolean;
  showResetButton?: boolean;
  onOpenPreferences?: () => void;
  onReset: () => void;
};

export default function RouteControlPanel({
  children,
  statusText,
  isError = false,
  disabled = false,
  showGeneratorButton = true,
  showResetButton = true,
  onOpenPreferences,
  onReset,
}: RouteControlPanelProps) {
  return (
    <View className='absolute right-4 bottom-8 left-4 gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xl'>
      <Text
        className={`text-center text-sm font-bold ${
          isError ? 'text-rose-600' : 'text-slate-900'
        }`}>
        {statusText}
      </Text>

      {showGeneratorButton && onOpenPreferences && (
        <Pressable
          disabled={disabled}
          className={`h-12 flex-row items-center justify-center gap-2 rounded-xl shadow-xs ${
            disabled
              ? 'bg-slate-100 opacity-60'
              : 'bg-indigo-600 active:bg-indigo-700 active:scale-[0.99]'
          }`}
          onPress={onOpenPreferences}>
          <Ionicons
            name='options-outline'
            size={18}
            color={disabled ? '#94a3b8' : '#ffffff'}
          />
          <Text
            className={`text-sm font-bold ${
              disabled ? 'text-slate-400' : 'text-white'
            }`}>
            Generuj trasę
          </Text>
        </Pressable>
      )}

      {children}

      {showResetButton && (
        <Pressable
          className='h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 active:bg-slate-100'
          onPress={onReset}>
          <Text className='text-xs font-bold text-slate-700'>
            Wyczyść
          </Text>
        </Pressable>
      )}
    </View>
  );
}
