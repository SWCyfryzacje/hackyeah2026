import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SettingsActionButtonsProps = {
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  hasChanges: boolean;
};

export default function SettingsActionButtons({
  onSave,
  onReset,
  isSaving,
  hasChanges,
}: SettingsActionButtonsProps) {
  return (
    <View className='mt-6 gap-3 px-5'>
      <Pressable
        onPress={onSave}
        disabled={isSaving || !hasChanges}
        className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 shadow-xs ${
          hasChanges && !isSaving
            ? 'bg-indigo-600 active:bg-indigo-700 active:scale-[0.99]'
            : 'bg-slate-200 opacity-60'
        }`}>
        {isSaving ? (
          <ActivityIndicator
            color='#ffffff'
            size='small'
          />
        ) : (
          <>
            <Ionicons
              name='save-outline'
              size={18}
              color='#ffffff'
            />
            <Text className='text-sm font-bold text-white'>
              Save Profile to Clerk
            </Text>
          </>
        )}
      </Pressable>

      {hasChanges && (
        <Pressable
          onPress={onReset}
          disabled={isSaving}
          className='h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 active:bg-slate-50'>
          <Text className='text-xs font-bold text-slate-600'>
            Discard Changes
          </Text>
        </Pressable>
      )}
    </View>
  );
}
