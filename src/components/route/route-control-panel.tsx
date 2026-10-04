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
    <View className='absolute right-4 bottom-8 left-4 gap-3 rounded-2xl bg-white p-4 shadow-lg'>
      <Text
        className={`text-center text-base font-semibold ${
          isError ? 'text-red-500' : 'text-neutral-900'
        }`}>
        {statusText}
      </Text>

      {showGeneratorButton && onOpenPreferences && (
        <Pressable
          disabled={disabled}
          className={`flex-row items-center justify-center gap-2 rounded-xl py-3 shadow-sm ${
            disabled
              ? 'bg-neutral-100 opacity-50'
              : 'bg-blue-600 active:bg-blue-700'
          }`}
          onPress={onOpenPreferences}>
          <Ionicons
            name='options-outline'
            size={18}
            color={disabled ? '#94a3b8' : '#ffffff'}
          />
          <Text
            className={`text-sm font-bold ${
              disabled ? 'text-neutral-400' : 'text-white'
            }`}>
            Generuj trasę
          </Text>
        </Pressable>
      )}

      {children}

      {showResetButton && (
        <Pressable
          className='items-center justify-center rounded-xl bg-neutral-200 py-2.5 active:bg-neutral-300'
          onPress={onReset}>
          <Text className='text-sm font-semibold text-neutral-800'>
            Wyczyść trasę
          </Text>
        </Pressable>
      )}
    </View>
  );
}
