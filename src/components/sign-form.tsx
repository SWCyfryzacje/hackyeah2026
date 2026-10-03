import { Pressable, Text, TextInput, View } from 'react-native';
import { Controller, UseFormReturn, type FieldErrors } from 'react-hook-form';
import { SignFormData } from '@/types/zod-types';
import PasswordInput from './auth/password-input';

type Props = {
  form: UseFormReturn<SignFormData>;
  onSubmit: () => void;
  fetchStatus: 'fetching' | 'idle';
  errors: ProcessedErrors | null;
  zodErrors: FieldErrors<SignFormData>;
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
  const emailError = errors?.email || zodErrors.email?.message;
  const passwordError = errors?.password || zodErrors.password?.message;

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
          {emailError ? (
            <Text className='text-xs text-red-500'>{emailError}</Text>
          ) : null}
        </View>

        <Controller
          control={form.control}
          name='password'
          render={({ field: { onChange, onBlur, value } }) => (
            <PasswordInput
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={passwordError}
            />
          )}
        />

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
