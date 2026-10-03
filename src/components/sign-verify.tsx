import SafeView from '@/components/safe-view';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { VerifyCodeSchema, VerifyCodeData } from '@/types/zod-types';
import { zodResolver } from '@hookform/resolvers/zod';

type Props = {
  fetchStatus: 'fetching' | 'idle';
  errors: ProcessedErrors | null;
  email: string;
  onVerify: (data: VerifyCodeData) => void;
  codeResend: () => void;
};

export default function SignVerify({
  fetchStatus,
  errors,
  email,
  onVerify,
  codeResend,
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors: zodErrors },
    getValues,
    watch,
  } = useForm<VerifyCodeData>({ resolver: zodResolver(VerifyCodeSchema) });

  const code = watch('code') || '';

  return (
    <SafeView className='flex-1 bg-amber-50'>
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className='flex-1'
          contentContainerClassName='flex-grow justify-center px-6 py-8'
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}>
          <View className='w-full max-w-md mx-auto gap-6'>
            <View className='items-center gap-2'>
              <Text className='text-3xl font-bold text-neutral-900'>Verify your identity</Text>
              <Text className='text-center text-sm text-neutral-600'>
                We sent a verification code to {email}
              </Text>
            </View>

            <View className='w-full rounded-2xl bg-white p-6 shadow-sm border border-neutral-100'>
              <View className='gap-4'>
                <View className='gap-1.5'>
                  <Text className='text-sm font-medium text-neutral-700'>Verification Code</Text>
                  <Controller
                    control={control}
                    name='code'
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        className='h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 text-center tracking-widest'
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder='Enter 6-digit code'
                        placeholderTextColor='#9ca3af'
                        keyboardType='number-pad'
                        autoComplete='one-time-code'
                        maxLength={6}
                      />
                    )}
                  />
                  {errors?.email && (
                    <Text className='text-xs text-red-500'>{errors.email}</Text>
                  )}
                  {zodErrors.code && !errors?.email && (
                    <Text className='text-xs text-red-500'>{zodErrors.code.message}</Text>
                  )}
                </View>

                <Pressable
                  className={`mt-2 items-center justify-center rounded-xl bg-blue-600 py-3.5 px-4 active:bg-blue-700 ${code.length < 6 || fetchStatus === 'fetching' ? 'opacity-50' : ''}`}
                  onPress={handleSubmit(onVerify)}
                  disabled={!getValues().code || fetchStatus === 'fetching'}>
                  <Text className='text-base font-semibold text-white'>
                    {code.length === 6 && fetchStatus === 'fetching'
                      ? 'Verifying...'
                      : 'Verify'}
                  </Text>
                </Pressable>

                <Pressable
                  className='items-center justify-center rounded-xl border border-neutral-300 py-3 px-4 active:bg-neutral-100'
                  onPress={() => codeResend()}
                  disabled={fetchStatus === 'fetching'}>
                  <Text className='text-sm font-semibold text-neutral-700'>
                    Resend Code
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeView>
  );
}
