import type { SetActiveNavigate } from '@clerk/expo/types';
import { router, type Href } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

// Shared finalize callback: send the user back to Settings once a session is active.
export const navigateAfterAuth: SetActiveNavigate = ({
  session,
  decorateUrl,
}) => {
  if (session?.currentTask) {
    // Session tasks (e.g. forced MFA setup) aren't handled yet.
    console.warn('Unhandled Clerk session task:', session.currentTask);
    return;
  }
  const url = decorateUrl('/settings');
  if (url.startsWith('http')) window.location.href = url;
  else router.replace(url as Href);
};

type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function Field({ label, error, ...props }: FieldProps) {
  return (
    <View className='gap-1'>
      <Text className='text-sm font-semibold text-gray-700'>{label}</Text>
      <TextInput
        className='rounded-xl border border-gray-300 bg-white px-4 py-3 text-base'
        placeholderTextColor='#9ca3af'
        autoCapitalize='none'
        {...props}
      />
      {error ? <Text className='text-sm text-red-600'>{error}</Text> : null}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
};

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`items-center rounded-xl px-4 py-3 ${
        primary ? 'bg-blue-500' : 'border border-blue-500 bg-white'
      } ${disabled || loading ? 'opacity-50' : ''}`}>
      {loading ? (
        <ActivityIndicator color={primary ? 'white' : '#3b82f6'} />
      ) : (
        <Text
          className={`text-base font-semibold ${
            primary ? 'text-white' : 'text-blue-500'
          }`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function GlobalErrors({
  errors,
}: {
  errors: { message: string }[] | null;
}) {
  if (!errors?.length) return null;
  return (
    <View className='rounded-xl bg-red-50 p-3'>
      {errors.map((e, i) => (
        <Text
          key={i}
          className='text-sm text-red-700'>
          {e.message}
        </Text>
      ))}
    </View>
  );
}
