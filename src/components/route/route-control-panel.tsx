import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import LoopSelector from './loop-selector';
import { DEFAULT_LOOP_OPTIONS, type LoopPreset } from '@/constants/map';

type RouteControlPanelProps = {
  /** Extra content shown above the Reset button */
  children?: ReactNode;
  statusText: string;
  isError?: boolean;
  disabled?: boolean;
  loopOptions?: LoopPreset[];
  showLoopSelector?: boolean;
  onSelectLoop: (preset: LoopPreset) => void;
  onReset: () => void;
};

export default function RouteControlPanel({
  children,
  statusText,
  isError = false,
  disabled = false,
  loopOptions = DEFAULT_LOOP_OPTIONS,
  showLoopSelector = true,
  onSelectLoop,
  onReset,
}: RouteControlPanelProps) {
  return (
    <View className='absolute right-4 bottom-8 left-4 gap-3 rounded-2xl bg-white p-4 shadow-lg'>
      <Text
        className={`text-center text-xl font-semibold ${
          isError ? 'text-red-500' : 'text-neutral-900'
        }`}>
        {statusText}
      </Text>

      {showLoopSelector && (
        <LoopSelector
          options={loopOptions}
          disabled={disabled}
          onSelect={onSelectLoop}
        />
      )}

      {children}

      <Pressable
        className='items-center justify-center rounded-xl bg-neutral-200 py-2.5 active:bg-neutral-300'
        onPress={onReset}>
        <Text className='text-sm font-semibold text-neutral-800'>
          Wyczyść trase
        </Text>
      </Pressable>
    </View>
  );
}
