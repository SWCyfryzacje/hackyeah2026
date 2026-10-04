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
    <View className='w-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm'>
      <View className='gap-4'>
        <View className='gap-1.5'>
          <Text className='text-xs font-semibold uppercase tracking-wider text-slate-600'>
            Email Address
          </Text>
          <Controller
            control={form.control}
            name='email'
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className='h-12 w-full rounded-xl border border-slate-200 bg-white pr-4 pl-4 text-sm font-medium text-slate-900 shadow-xs'
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder='Enter e-mail address'
                placeholderTextColor='#94a3b8'
                keyboardType='email-address'
                autoCapitalize='none'
                autoComplete='email'
              />
            )}
          />
          {emailError ? (
            <Text className='text-xs font-medium text-rose-500'>{emailError}</Text>
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
          className={`mt-2 h-12 items-center justify-center rounded-xl bg-indigo-600 px-4 active:bg-indigo-700 shadow-sm ${fetchStatus === 'fetching' ? 'opacity-60' : 'active:scale-[0.99]'}`}
          onPress={onSubmit}
          disabled={fetchStatus === 'fetching'}>
          <Text className='text-sm font-bold text-white'>
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
