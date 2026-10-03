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
        className={`flex-row items-center justify-center gap-2 rounded-2xl px-4 py-3.5 shadow-sm ${
          hasChanges && !isSaving
            ? 'bg-blue-600 active:bg-blue-700'
            : 'bg-neutral-300 opacity-70'
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
          className='items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-100'>
          <Text className='text-xs font-semibold text-neutral-600'>
            Discard Changes
          </Text>
        </Pressable>
      )}
    </View>
  );
}
