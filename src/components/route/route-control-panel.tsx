import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import LoopSelector from './loop-selector';

type RouteControlPanelProps = {
  /** Extra content shown above the Reset button */
  children?: ReactNode;
  statusText: string;
  isError?: boolean;
  disabled?: boolean;
  loopOptions?: number[];
  onSelectLoop: (km: number) => void;
  onReset: () => void;
};

export default function RouteControlPanel({
  children,
  statusText,
  isError = false,
  disabled = false,
  loopOptions = [3, 5, 10],
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

      <LoopSelector
        options={loopOptions}
        disabled={disabled}
        onSelect={onSelectLoop}
      />

      {children}

      <Pressable
        className='items-center justify-center rounded-xl bg-neutral-200 py-2.5 active:bg-neutral-300'
        onPress={onReset}>
        <Text className='text-sm font-semibold text-neutral-800'>Reset</Text>
      </Pressable>
    </View>
  );
}
