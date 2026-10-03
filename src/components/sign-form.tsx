import { Pressable, Text, TextInput, View } from 'react-native';
import { Controller, UseFormReturn } from 'react-hook-form';
import { SignFormData } from '@/types/zod-types';
import { useState } from 'react';

type Props = {
  form: UseFormReturn<SignFormData>;
  onSubmit: () => void;
  fetchStatus: 'fetching' | 'idle';
  errors: ProcessedErrors | null;
  zodErrors: any;
  type: 'sign-in' | 'sign-up';
};

export default function SignForm({
  form,
  onSubmit,
  fetchStatus,
  errors,
  zodErrors,
  type,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className='w-full rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm'>
      <View className='gap-4'>
        <View className='gap-1.5'>
          <Text className='text-sm font-medium text-neutral-700'>
            Email Address
          </Text>
          <Controller
            control={form.control}
            name='email'
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className='h-12 w-full rounded-xl border border-neutral-300 bg-white pr-14 pl-4 text-base text-neutral-900'
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder='Enter e-mail address'
                placeholderTextColor='#9ca3af'
                keyboardType='email-address'
                autoCapitalize='none'
                autoComplete='email'
              />
            )}
          />
          {errors?.email && (
            <Text className='text-xs text-red-500'>{errors?.email}</Text>
          )}
          {zodErrors.email && !errors?.email && (
            <Text className='text-xs text-red-500'>
              {zodErrors.email.message}
            </Text>
          )}
        </View>

        <View className='gap-1.5'>
          <Text className='text-sm font-medium text-neutral-700'>Password</Text>
          <Controller
            control={form.control}
            name='password'
            render={({ field: { onChange, onBlur, value } }) => (
              <View className='relative justify-center'>
                <TextInput
                  className='h-12 w-full rounded-xl border border-neutral-300 bg-white pr-14 pl-4 text-base text-neutral-900'
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder='Enter password'
                  placeholderTextColor='#9ca3af'
                  keyboardType='default'
                  autoCapitalize='none'
                  autoComplete='password'
                  textContentType='password'
                  secureTextEntry={!showPassword}
                />
                <Pressable
                  className='absolute right-4 p-1'
                  hitSlop={8}
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityRole='button'
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }>
                  <Text
                    className={`font-semibold ${showPassword ? 'text-blue-600' : 'text-neutral-500'}`}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
            )}
          />
          {errors?.password && (
            <Text className='text-xs text-red-500'>{errors?.password}</Text>
          )}
          {zodErrors.password && !errors?.password && (
            <Text className='text-xs text-red-500'>
              {zodErrors.password.message}
            </Text>
          )}
        </View>

        <Pressable
          className={`mt-2 items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 active:bg-blue-700 ${fetchStatus === 'fetching' ? 'opacity-50' : ''}`}
          onPress={onSubmit}
          disabled={fetchStatus === 'fetching'}>
          <Text className='text-base font-semibold text-white'>
            {fetchStatus === 'fetching'
              ? type === 'sign-in'
                ? 'Signing In...'
                : 'Signing Up...'
              : type === 'sign-in'
                ? 'Sign In'
                : 'Sign Up'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
